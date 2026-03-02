from fastapi import APIRouter, Depends, HTTPException, Header
from app.database import supabase
from app.middleware.auth import _extract_token, _validate_token
from app.models.profile import ProfileUpsert, ProfileOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_user_id(authorization: str = Header(...)) -> str:
    token = _extract_token(authorization)
    return _validate_token(token)


@router.post("/profile", response_model=ProfileOut)
def upsert_profile(body: ProfileUpsert, user_id: str = Depends(_get_user_id)):
    try:
        existing = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error — have you run supabase_migrations.sql? ({e})"
        )

    try:
        if existing.data:
            result = supabase.table("profiles").update(
                body.model_dump(exclude_none=True)
            ).eq("user_id", user_id).select("*").single().execute()
        else:
            data = body.model_dump(exclude_none=True)
            data["user_id"] = user_id
            result = supabase.table("profiles").insert(data).select("*").single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile upsert failed: {e}")

    if not result.data:
        raise HTTPException(status_code=500, detail="Profile operation returned no data")
    return result.data


@router.get("/profile/me", response_model=ProfileOut)
def get_my_profile(user_id: str = Depends(_get_user_id)):
    try:
        result = supabase.table("profiles").select("*").eq("user_id", user_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data
