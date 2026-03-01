from fastapi import Header, HTTPException, status
from app.database import supabase


def _extract_token(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth header")
    return authorization.split(" ", 1)[1]


def _validate_token(token: str) -> str:
    """Validate JWT via Supabase and return the user_id (sub)."""
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return response.user.id
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Could not validate token: {e}")


async def get_current_user(authorization: str = Header(...)):
    token = _extract_token(authorization)
    user_id = _validate_token(token)

    result = supabase.table("profiles").select("*").eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return result.data


async def get_current_user_optional(authorization: str = Header(default=None)):
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
