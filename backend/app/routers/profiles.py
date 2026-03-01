from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{profile_id}", response_model=dict)
def get_profile(profile_id: str):
    result = supabase.table("profiles").select("*").eq("id", profile_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Attach badges
    badges = supabase.table("badges").select(
        "*, challenges(title)"
    ).eq("builder_id", profile_id).execute()

    profile = result.data
    profile["badges"] = badges.data or []
    return profile
