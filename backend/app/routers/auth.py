from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings
from app.database import supabase
from app.models.profile import ProfileUpsert, ProfileOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token, settings.supabase_jwt_secret,
            algorithms=["HS256"], options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")


@router.post("/profile", response_model=ProfileOut)
def upsert_profile(body: ProfileUpsert, user_id: str = Depends(_get_user_id)):
    existing = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    if existing.data:
        # Update
        result = supabase.table("profiles").update(body.model_dump(exclude_none=True)).eq("user_id", user_id).select("*").single().execute()
    else:
        # Insert
        data = body.model_dump(exclude_none=True)
        data["user_id"] = user_id
        result = supabase.table("profiles").insert(data).select("*").single().execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Profile operation failed")
    return result.data


@router.get("/profile/me", response_model=ProfileOut)
def get_my_profile(user_id: str = Depends(_get_user_id)):
    result = supabase.table("profiles").select("*").eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data
