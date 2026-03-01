from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from app.database import supabase
from app.middleware.auth import get_current_user
from app.models.challenge import ChallengeCreate, ChallengeUpdate, ChallengeOut

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("", response_model=List[dict])
def list_challenges(
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    limit: int = Query(50, le=100),
):
    query = supabase.table("challenges").select(
        "*, profiles(name, company_name, company_logo_url)"
    ).eq("status", status).order("created_at", desc=True).limit(limit)

    if domain:
        query = query.eq("domain", domain)

    result = query.execute()
    return result.data or []


@router.get("/{challenge_id}", response_model=dict)
def get_challenge(challenge_id: str):
    result = supabase.table("challenges").select(
        "*, profiles(name, company_name, company_logo_url)"
    ).eq("id", challenge_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return result.data


@router.post("", response_model=dict, status_code=201)
def create_challenge(body: ChallengeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("sponsor", "admin"):
        raise HTTPException(status_code=403, detail="Only sponsors can create challenges")

    rubric = [c.model_dump() for c in body.rubric_json]
    data = {
        "sponsor_id": current_user["id"],
        "title": body.title,
        "description": body.description,
        "rubric_json": rubric,
        "dataset_url": body.dataset_url,
        "deadline": body.deadline.isoformat(),
        "prize_amount": body.prize_amount,
        "prize_currency": body.prize_currency,
        "domain": body.domain,
        "status": "active",
    }
    result = supabase.table("challenges").insert(data).select("*").single().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create challenge")
    return result.data


@router.patch("/{challenge_id}", response_model=dict)
def update_challenge(
    challenge_id: str,
    body: ChallengeUpdate,
    current_user: dict = Depends(get_current_user),
):
    challenge = supabase.table("challenges").select("sponsor_id").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.data["sponsor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    updates = body.model_dump(exclude_none=True)
    if "rubric_json" in updates:
        updates["rubric_json"] = [c.model_dump() for c in body.rubric_json]
    if "deadline" in updates:
        updates["deadline"] = updates["deadline"].isoformat()

    result = supabase.table("challenges").update(updates).eq("id", challenge_id).select("*").single().execute()
    return result.data
