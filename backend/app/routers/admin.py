from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase
from app.middleware.auth import get_current_user
from app.models.submission import JudgeOverride
from app.services import badge_service, email_service

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
    result = supabase.table("submissions").update({
        "final_score": body.final_score,
        "judge_id": current_user["id"],
        "status": "reviewed",
    }).eq("id", submission_id).select("*").single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")
    return result.data


@router.post("/challenges/{challenge_id}/close", response_model=dict)
def close_challenge(challenge_id: str, current_user: dict = Depends(_require_admin)):
    result = supabase.table("challenges").update({"status": "closed"}).eq("id", challenge_id).select("*").single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    badge_service.close_challenge_badges(challenge_id)
    return {"message": "Challenge closed and badges awarded", "challenge": result.data}


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
    result = supabase.table("submissions").select(
        "*, profiles(name, github_url), challenges(title)"
    ).eq("status", "scored").is_("judge_id", "null").order("llm_total_score", desc=True).execute()
    return result.data or []
