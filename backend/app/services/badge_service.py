import logging
from app.database import supabase

logger = logging.getLogger(__name__)


def award_badge(builder_id: str, challenge_id: str, badge_type: str):
    # Avoid duplicate badges
    existing = supabase.table("badges").select("id").eq("builder_id", builder_id).eq("challenge_id", challenge_id).eq("badge_type", badge_type).execute()
    if existing.data:
        return

    supabase.table("badges").insert({
        "builder_id": builder_id,
        "challenge_id": challenge_id,
        "badge_type": badge_type,
    }).execute()
    logger.info(f"Badge {badge_type} awarded to builder {builder_id} for challenge {challenge_id}")


def check_top_performer(submission_id: str):
    """Award top_performer badge if score >= 65."""
    sub = supabase.table("submissions").select("builder_id, challenge_id, llm_total_score").eq("id", submission_id).single().execute()
    if not sub.data:
        return
    score = sub.data.get("llm_total_score", 0)
    if score and score >= 65:
        award_badge(sub.data["builder_id"], sub.data["challenge_id"], "top_performer")


def close_challenge_badges(challenge_id: str):
    """
    Called when admin closes a challenge.
    Awards 'winner' to rank 1, 'top10' to top 10% of scored submissions.
    Updates season_score for badge winners.
    """
    result = supabase.table("submissions").select("id, builder_id, llm_total_score, final_score").eq("challenge_id", challenge_id).in_("status", ["scored", "reviewed"]).execute()
    submissions = result.data or []
    if not submissions:
        return

    # Sort by effective score
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

        # Update season score
        if effective_score > 0:
            profile = supabase.table("profiles").select("season_score").eq("id", builder_id).single().execute()
            current = profile.data.get("season_score", 0) if profile.data else 0
            supabase.table("profiles").update({"season_score": current + effective_score}).eq("id", builder_id).execute()
