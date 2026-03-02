from fastapi import APIRouter, Depends, HTTPException, Header
from app.database import db_fetchone, db_execute
from app.middleware.auth import _extract_token, _validate_token
from app.models.profile import ProfileUpsert, ProfileOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_user_id(authorization: str = Header(...)) -> str:
    token = _extract_token(authorization)
    return _validate_token(token)


@router.post("/profile", response_model=ProfileOut)
def upsert_profile(body: ProfileUpsert, user_id: str = Depends(_get_user_id)):
    try:
        existing = db_fetchone(
            "SELECT id FROM profiles WHERE user_id = :user_id",
            {"user_id": user_id},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error — have you run postgres_migrations.sql? ({e})",
        )

    fields = body.model_dump(exclude_none=True)

    try:
        if existing:
            if not fields:
                result = db_fetchone(
                    "SELECT * FROM profiles WHERE user_id = :user_id",
                    {"user_id": user_id},
                )
            else:
                set_clause = ", ".join(f"{k} = :{k}" for k in fields)
                params = {**fields, "user_id": user_id}
                result = db_execute(
                    f"UPDATE profiles SET {set_clause} WHERE user_id = :user_id RETURNING *",
                    params,
                )
        else:
            fields["user_id"] = user_id
            cols = ", ".join(fields.keys())
            placeholders = ", ".join(f":{k}" for k in fields.keys())
            result = db_execute(
                f"INSERT INTO profiles ({cols}) VALUES ({placeholders}) RETURNING *",
                fields,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile upsert failed: {e}")

    if not result:
        raise HTTPException(status_code=500, detail="Profile operation returned no data")
    return result


@router.get("/profile/me", response_model=ProfileOut)
def get_my_profile(user_id: str = Depends(_get_user_id)):
    result = db_fetchone(
        "SELECT * FROM profiles WHERE user_id = :user_id",
        {"user_id": user_id},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result
