from fastapi import APIRouter, HTTPException
from app.database import db_fetchone, db_fetchall

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{profile_id}", response_model=dict)
def get_profile(profile_id: str):
    profile = db_fetchone(
        "SELECT * FROM profiles WHERE id = :id",
        {"id": profile_id},
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    badges = db_fetchall(
        """
        SELECT b.*, c.title AS challenge_title
        FROM badges b
        LEFT JOIN challenges c ON b.challenge_id = c.id
        WHERE b.builder_id = :builder_id
        """,
        {"builder_id": profile_id},
    )
    for b in badges:
        b["challenges"] = {"title": b.pop("challenge_title", None)}

    profile["badges"] = badges
    return profile
