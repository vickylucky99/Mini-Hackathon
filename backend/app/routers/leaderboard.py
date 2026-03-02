from fastapi import APIRouter, Query
from app.database import db_fetchall

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/{challenge_id}", response_model=list)
def get_leaderboard(challenge_id: str, limit: int = Query(50, le=200)):
    # The 'leaderboard' view in postgres_migrations.sql computes ranks on the fly.
    return db_fetchall(
        "SELECT * FROM leaderboard WHERE challenge_id = :challenge_id "
        "ORDER BY rank LIMIT :limit",
        {"challenge_id": challenge_id, "limit": limit},
    )


@router.get("/profile/{builder_id}", response_model=list)
def get_builder_submissions(builder_id: str):
    rows = db_fetchall(
        """
        SELECT s.*,
            c.title AS challenge_title, c.domain AS challenge_domain,
            c.prize_amount AS challenge_prize_amount,
            c.prize_currency AS challenge_prize_currency
        FROM submissions s
        JOIN challenges c ON s.challenge_id = c.id
        WHERE s.builder_id = :builder_id
        ORDER BY s.submitted_at DESC
        """,
        {"builder_id": builder_id},
    )
    for row in rows:
        row["challenges"] = {
            "title": row.pop("challenge_title", None),
            "domain": row.pop("challenge_domain", None),
            "prize_amount": row.pop("challenge_prize_amount", None),
            "prize_currency": row.pop("challenge_prize_currency", None),
        }
    return rows
