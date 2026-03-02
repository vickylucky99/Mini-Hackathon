from fastapi import APIRouter, Depends, HTTPException
from app.database import db_fetchone, db_fetchall, db_execute
from app.middleware.auth import get_current_user
from app.models.submission import JudgeOverride
from app.services import badge_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


@router.put("/submissions/{submission_id}/judge", response_model=dict)
def judge_override(
    submission_id: str,
    body: JudgeOverride,
    current_user: dict = Depends(_require_admin),
):
    result = db_execute(
        """
        UPDATE submissions
        SET final_score = :final_score, judge_id = :judge_id, status = 'reviewed'
        WHERE id = :id
        RETURNING *
        """,
        {"final_score": body.final_score, "judge_id": current_user["id"], "id": submission_id},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Submission not found")
    return result


@router.post("/challenges/{challenge_id}/close", response_model=dict)
def close_challenge(challenge_id: str, current_user: dict = Depends(_require_admin)):
    result = db_execute(
        "UPDATE challenges SET status = 'closed' WHERE id = :id RETURNING *",
        {"id": challenge_id},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Challenge not found")

    badge_service.close_challenge_badges(challenge_id)
    return {"message": "Challenge closed and badges awarded", "challenge": result}


@router.post("/badges/award", response_model=dict)
def award_badge_manual(
    builder_id: str,
    challenge_id: str,
    badge_type: str,
    current_user: dict = Depends(_require_admin),
):
    valid_types = {"top10", "winner", "sponsor_fav", "top_performer"}
    if badge_type not in valid_types:
        raise HTTPException(status_code=422, detail=f"badge_type must be one of {valid_types}")
    badge_service.award_badge(builder_id, challenge_id, badge_type)
    return {"message": f"Badge {badge_type} awarded"}


@router.get("/submissions/queue", response_model=list)
def judge_queue(current_user: dict = Depends(_require_admin)):
    rows = db_fetchall(
        """
        SELECT s.*,
            p.name AS builder_name, p.github_url AS builder_github_url,
            c.title AS challenge_title
        FROM submissions s
        JOIN profiles p ON s.builder_id = p.id
        JOIN challenges c ON s.challenge_id = c.id
        WHERE s.status = 'scored' AND s.judge_id IS NULL
        ORDER BY s.llm_total_score DESC NULLS LAST
        """,
    )
    for row in rows:
        row["profiles"] = {
            "name": row.pop("builder_name", None),
            "github_url": row.pop("builder_github_url", None),
        }
        row["challenges"] = {"title": row.pop("challenge_title", None)}
    return rows
