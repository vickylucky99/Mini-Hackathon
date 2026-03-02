import jwt as pyjwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, status
from app.config import settings
from app.database import db_fetchone

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwks_client


def _extract_token(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth header — expected 'Bearer <token>'",
        )
    return authorization.split(" ", 1)[1]


def _validate_token(token: str) -> str:
    """Verify Clerk JWT using JWKS and return the Clerk user_id (sub)."""
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        data = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        sub = data.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No sub in token")
        return sub
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {e}",
        )


async def get_current_user(authorization: str = Header(...)) -> dict:
    token = _extract_token(authorization)
    user_id = _validate_token(token)

    profile = db_fetchone(
        "SELECT * FROM profiles WHERE user_id = :user_id",
        {"user_id": user_id},
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


async def get_current_user_optional(authorization: str = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
