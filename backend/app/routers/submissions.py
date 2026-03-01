from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
from app.database import supabase
from app.middleware.auth import get_current_user
from app.models.submission import SubmissionCreate, SubmissionOut, JudgeOverride
from app.services import groq_scorer, email_service, badge_service

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _validate_url(url: str | None, field: str):
    if url and not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=422, detail=f"{field} must be a valid URL")


@router.post("", response_model=dict, status_code=201)
async def create_submission(
    body: SubmissionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ("builder", "admin"):
        raise HTTPException(status_code=403, detail="Only builders can submit")

    _validate_url(body.repo_url, "repo_url")
    _validate_url(body.deck_url, "deck_url")
    _validate_url(body.video_url, "video_url")

    # Check deadline
    challenge = supabase.table("challenges").select("deadline, title, status").eq("id", body.challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Challenge is not active")

    deadline = datetime.fromisoformat(challenge.data["deadline"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")

    # Check duplicate
    existing = supabase.table("submissions").select("id").eq("builder_id", current_user["id"]).eq("challenge_id", body.challenge_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="You have already submitted to this challenge")

    data = {
        "builder_id": current_user["id"],
        "challenge_id": body.challenge_id,
        "repo_url": body.repo_url,
        "deck_url": body.deck_url,
        "video_url": body.video_url,
        "status": "pending",
    }
    result = supabase.table("submissions").insert(data).select("*").single().execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create submission")

    submission_id = result.data["id"]

    # Get builder email from Supabase Auth
    user_data = supabase.auth.admin.get_user_by_id(current_user["user_id"])
    builder_email = user_data.user.email if user_data.user else None

    if builder_email:
        email_service.send_submission_confirmed(
            to=builder_email,
            builder_name=current_user.get("name", "Builder"),
            challenge_title=challenge.data["title"],
        )

    # Trigger async scoring
    background_tasks.add_task(
        _run_scoring,
        submission_id=submission_id,
        builder_email=builder_email,
        builder_name=current_user.get("name", "Builder"),
        challenge_title=challenge.data["title"],
        builder_id=current_user["id"],
    )

    return result.data


async def _run_scoring(submission_id: str, builder_email: str | None, builder_name: str, challenge_title: str, builder_id: str):
    score_result = await groq_scorer.score_submission(submission_id)
    if score_result and builder_email:
        email_service.send_score_ready(
            to=builder_email,
            builder_name=builder_name,
            challenge_title=challenge_title,
            score=score_result.get("total_score", 0),
            feedback=score_result.get("overall_feedback", ""),
        )
        badge_service.check_top_performer(submission_id)

        # Get builder email for badge notification
        badge_check = supabase.table("badges").select("badge_type").eq("builder_id", builder_id).order("awarded_at", desc=True).limit(1).execute()
        if badge_check.data:
            challenge_res = supabase.table("submissions").select("challenge_id").eq("id", submission_id).single().execute()
            if challenge_res.data:
                email_service.send_badge_awarded(
                    to=builder_email,
                    builder_name=builder_name,
                    badge_type=badge_check.data[0]["badge_type"],
                    challenge_title=challenge_title,
                )


@router.get("/{submission_id}", response_model=dict)
def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("submissions").select("*").eq("id", submission_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub = result.data
    # Allow: owner, challenge sponsor, admin
    if (sub["builder_id"] != current_user["id"] and current_user["role"] != "admin"):
        challenge = supabase.table("challenges").select("sponsor_id").eq("id", sub["challenge_id"]).single().execute()
        if not challenge.data or challenge.data["sponsor_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

    return sub


@router.get("/challenge/{challenge_id}", response_model=list)
def get_challenge_submissions(challenge_id: str, current_user: dict = Depends(get_current_user)):
    # Sponsor or admin only
    challenge = supabase.table("challenges").select("sponsor_id").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.data["sponsor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    result = supabase.table("submissions").select(
        "*, profiles(name, github_url, bio, cv_url)"
    ).eq("challenge_id", challenge_id).order("llm_total_score", desc=True).execute()
    return result.data or []


@router.patch("/{submission_id}/contact", response_model=dict)
def mark_contacted(submission_id: str, current_user: dict = Depends(get_current_user)):
    sub = supabase.table("submissions").select("builder_id, challenge_id, contacted").eq("id", submission_id).single().execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    challenge = supabase.table("challenges").select("sponsor_id, title").eq("id", sub.data["challenge_id"]).single().execute()
    if not challenge.data or challenge.data["sponsor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = supabase.table("submissions").update({"contacted": True}).eq("id", submission_id).select("*").single().execute()

    # Award sponsor_fav badge
    badge_service.award_badge(sub.data["builder_id"], sub.data["challenge_id"], "sponsor_fav")

    # Notify builder
    builder = supabase.table("profiles").select("name").eq("id", sub.data["builder_id"]).single().execute()
    builder_auth = supabase.auth.admin.get_user_by_id(
        supabase.table("profiles").select("user_id").eq("id", sub.data["builder_id"]).single().execute().data["user_id"]
    )
    if builder_auth.user:
        email_service.send_contacted_notification(
            to=builder_auth.user.email,
            builder_name=builder.data.get("name", "Builder") if builder.data else "Builder",
            company_name=current_user.get("company_name", "A sponsor"),
            challenge_title=challenge.data["title"],
        )

    return result.data
