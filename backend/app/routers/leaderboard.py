from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.database import supabase

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/{challenge_id}", response_model=list)
def get_leaderboard(challenge_id: str, limit: int = Query(50, le=200)):
    # Refresh materialized view then query
    try:
        supabase.rpc("refresh_leaderboard").execute()
    except Exception:
        pass  # Non-critical; fall through to stale data

    result = supabase.table("leaderboard").select("*").eq("challenge_id", challenge_id).order("rank").limit(limit).execute()
    return result.data or []


@router.get("/profile/{builder_id}", response_model=list)
def get_builder_submissions(builder_id: str):
    result = supabase.table("submissions").select(
        "*, challenges(title, domain, prize_amount, prize_currency)"
    ).eq("builder_id", builder_id).order("submitted_at", desc=True).execute()
    return result.data or []
