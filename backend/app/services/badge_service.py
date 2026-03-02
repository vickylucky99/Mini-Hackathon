import logging
from app.database import db_fetchone, db_fetchall, db_run

logger = logging.getLogger(__name__)


def award_badge(builder_id: str, challenge_id: str, badge_type: str):
    existing = db_fetchone(
        "SELECT id FROM badges WHERE builder_id = :builder_id AND challenge_id = :challenge_id AND badge_type = :badge_type",
        {"builder_id": builder_id, "challenge_id": challenge_id, "badge_type": badge_type},
    )
    if existing:
        return

    db_run(
        "INSERT INTO badges (builder_id, challenge_id, badge_type) VALUES (:builder_id, :challenge_id, :badge_type)",
        {"builder_id": builder_id, "challenge_id": challenge_id, "badge_type": badge_type},
    )
    logger.info(f"Badge {badge_type} awarded to builder {builder_id} for challenge {challenge_id}")


def check_top_performer(submission_id: str):
    """Award top_performer badge if llm_total_score >= 65."""
    sub = db_fetchone(
        "SELECT builder_id, challenge_id, llm_total_score FROM submissions WHERE id = :id",
        {"id": submission_id},
    )
    if not sub:
        return
    score = sub.get("llm_total_score", 0)
    if score and score >= 65:
        award_badge(sub["builder_id"], sub["challenge_id"], "top_performer")


def close_challenge_badges(challenge_id: str):
    """Award winner + top10 badges; update season_score for all ranked submissions."""
    submissions = db_fetchall(
        """
        SELECT id, builder_id, llm_total_score, final_score
        FROM submissions
        WHERE challenge_id = :challenge_id AND status IN ('scored', 'reviewed')
        """,
        {"challenge_id": challenge_id},
    )
    if not submissions:
        return

    ranked = sorted(
        submissions,
        key=lambda s: s.get("final_score") or s.get("llm_total_score") or 0,
        reverse=True,
    )
    total = len(ranked)
    top10_cutoff = max(1, round(total * 0.1))

    for idx, sub in enumerate(ranked):
        builder_id = sub["builder_id"]
        effective_score = sub.get("final_score") or sub.get("llm_total_score") or 0

        if idx == 0:
            award_badge(builder_id, challenge_id, "winner")
        if idx < top10_cutoff:
            award_badge(builder_id, challenge_id, "top10")

        if effective_score > 0:
            db_run(
                "UPDATE profiles SET season_score = COALESCE(season_score, 0) + :score WHERE id = :id",
                {"score": effective_score, "id": builder_id},
            )
