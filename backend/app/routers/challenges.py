import json
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from app.database import db_fetchall, db_fetchone, db_execute
from app.middleware.auth import get_current_user
from app.models.challenge import ChallengeCreate, ChallengeUpdate, ChallengeOut

router = APIRouter(prefix="/challenges", tags=["challenges"])

_CHALLENGE_WITH_SPONSOR = """
    SELECT
        c.*,
        p.name              AS sponsor_name,
        p.company_name      AS sponsor_company_name,
        p.company_logo_url  AS sponsor_company_logo_url
    FROM challenges c
    LEFT JOIN profiles p ON c.sponsor_id = p.id
"""


def _nest_sponsor(row: dict) -> dict:
    row["profiles"] = {
        "name": row.pop("sponsor_name", None),
        "company_name": row.pop("sponsor_company_name", None),
        "company_logo_url": row.pop("sponsor_company_logo_url", None),
    }
    return row


@router.get("", response_model=List[dict])
def list_challenges(
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    limit: int = Query(50, le=100),
):
    if domain:
        rows = db_fetchall(
            _CHALLENGE_WITH_SPONSOR +
            "WHERE c.status = :status AND c.domain = :domain "
            "ORDER BY c.created_at DESC LIMIT :limit",
            {"status": status, "domain": domain, "limit": limit},
        )
    else:
        rows = db_fetchall(
            _CHALLENGE_WITH_SPONSOR +
            "WHERE c.status = :status ORDER BY c.created_at DESC LIMIT :limit",
            {"status": status, "limit": limit},
        )
    return [_nest_sponsor(r) for r in rows]


@router.get("/{challenge_id}", response_model=dict)
def get_challenge(challenge_id: str):
    row = db_fetchone(
        _CHALLENGE_WITH_SPONSOR + "WHERE c.id = :id",
        {"id": challenge_id},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return _nest_sponsor(row)


@router.post("", response_model=dict, status_code=201)
def create_challenge(body: ChallengeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("sponsor", "admin"):
        raise HTTPException(status_code=403, detail="Only sponsors can create challenges")

    rubric = [c.model_dump() for c in body.rubric_json]
    result = db_execute(
        """
        INSERT INTO challenges
            (sponsor_id, title, description, rubric_json, dataset_url,
             deadline, prize_amount, prize_currency, domain, status)
        VALUES
            (:sponsor_id, :title, :description, :rubric_json::jsonb, :dataset_url,
             :deadline, :prize_amount, :prize_currency, :domain, 'active')
        RETURNING *
        """,
        {
            "sponsor_id": current_user["id"],
            "title": body.title,
            "description": body.description,
            "rubric_json": json.dumps(rubric),
            "dataset_url": body.dataset_url,
            "deadline": body.deadline.isoformat(),
            "prize_amount": body.prize_amount,
            "prize_currency": body.prize_currency,
            "domain": body.domain,
        },
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create challenge")
    return result


@router.patch("/{challenge_id}", response_model=dict)
def update_challenge(
    challenge_id: str,
    body: ChallengeUpdate,
    current_user: dict = Depends(get_current_user),
):
    challenge = db_fetchone(
        "SELECT sponsor_id FROM challenges WHERE id = :id",
        {"id": challenge_id},
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge["sponsor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        return db_fetchone("SELECT * FROM challenges WHERE id = :id", {"id": challenge_id})

    if "rubric_json" in updates:
        updates["rubric_json"] = json.dumps([c.model_dump() for c in body.rubric_json])
    if "deadline" in updates:
        updates["deadline"] = updates["deadline"].isoformat()

    set_parts = []
    for k in updates:
        if k == "rubric_json":
            set_parts.append(f"rubric_json = :{k}::jsonb")
        else:
            set_parts.append(f"{k} = :{k}")
    set_clause = ", ".join(set_parts)

    params = {**updates, "id": challenge_id}
    return db_execute(
        f"UPDATE challenges SET {set_clause} WHERE id = :id RETURNING *",
        params,
    )
