from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
from app.database import db_fetchone, db_fetchall, db_execute, db_run
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

    challenge = db_fetchone(
        "SELECT id, deadline, title, status FROM challenges WHERE id = :id",
        {"id": body.challenge_id},
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge["status"] != "active":
        raise HTTPException(status_code=400, detail="Challenge is not active")

    deadline_str = challenge["deadline"]
    if isinstance(deadline_str, str):
        deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
    else:
        deadline = deadline_str  # already a datetime from psycopg2
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(status_code=400, detail="Submission deadline has passed")

    existing = db_fetchone(
        "SELECT id FROM submissions WHERE builder_id = :builder_id AND challenge_id = :challenge_id",
        {"builder_id": current_user["id"], "challenge_id": body.challenge_id},
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted to this challenge")

    result = db_execute(
        """
        INSERT INTO submissions (builder_id, challenge_id, repo_url, deck_url, video_url, status)
        VALUES (:builder_id, :challenge_id, :repo_url, :deck_url, :video_url, 'pending')
        RETURNING *
        """,
        {
            "builder_id": current_user["id"],
            "challenge_id": body.challenge_id,
            "repo_url": body.repo_url,
            "deck_url": body.deck_url,
            "video_url": body.video_url,
        },
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create submission")

    builder_email = current_user.get("email")
    builder_name = current_user.get("name", "Builder")
    challenge_title = challenge["title"]
    submission_id = result["id"]

    if builder_email:
        email_service.send_submission_confirmed(
            to=builder_email,
            builder_name=builder_name,
            challenge_title=challenge_title,
        )

    background_tasks.add_task(
        _run_scoring,
        submission_id=submission_id,
        builder_email=builder_email,
        builder_name=builder_name,
        challenge_title=challenge_title,
        builder_id=current_user["id"],
    )

    return result


async def _run_scoring(
    submission_id: str,
    builder_email: str | None,
    builder_name: str,
    challenge_title: str,
    builder_id: str,
):
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

    badge_check = db_fetchone(
        "SELECT badge_type FROM badges WHERE builder_id = :builder_id "
        "ORDER BY awarded_at DESC LIMIT 1",
        {"builder_id": builder_id},
    )
    if badge_check and builder_email:
        email_service.send_badge_awarded(
            to=builder_email,
            builder_name=builder_name,
            badge_type=badge_check["badge_type"],
            challenge_title=challenge_title,
        )


@router.get("/{submission_id}", response_model=dict)
def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    sub = db_fetchone(
        "SELECT * FROM submissions WHERE id = :id",
        {"id": submission_id},
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub["builder_id"] != current_user["id"] and current_user["role"] != "admin":
        challenge = db_fetchone(
            "SELECT sponsor_id FROM challenges WHERE id = :id",
            {"id": sub["challenge_id"]},
        )
        if not challenge or challenge["sponsor_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

    return sub


@router.get("/challenge/{challenge_id}", response_model=list)
def get_challenge_submissions(challenge_id: str, current_user: dict = Depends(get_current_user)):
    challenge = db_fetchone(
        "SELECT sponsor_id FROM challenges WHERE id = :id",
        {"id": challenge_id},
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge["sponsor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    rows = db_fetchall(
        """
        SELECT s.*,
            p.name AS builder_name, p.github_url AS builder_github_url,
            p.bio AS builder_bio, p.cv_url AS builder_cv_url
        FROM submissions s
        JOIN profiles p ON s.builder_id = p.id
        WHERE s.challenge_id = :challenge_id
        ORDER BY s.llm_total_score DESC NULLS LAST
        """,
        {"challenge_id": challenge_id},
    )
    # Nest builder profile info to match old Supabase format
    for row in rows:
        row["profiles"] = {
            "name": row.pop("builder_name", None),
            "github_url": row.pop("builder_github_url", None),
            "bio": row.pop("builder_bio", None),
            "cv_url": row.pop("builder_cv_url", None),
        }
    return rows


@router.patch("/{submission_id}/contact", response_model=dict)
def mark_contacted(submission_id: str, current_user: dict = Depends(get_current_user)):
    sub = db_fetchone(
        "SELECT builder_id, challenge_id, contacted FROM submissions WHERE id = :id",
        {"id": submission_id},
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    challenge = db_fetchone(
        "SELECT sponsor_id, title FROM challenges WHERE id = :id",
        {"id": sub["challenge_id"]},
    )
    if not challenge or challenge["sponsor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = db_execute(
        "UPDATE submissions SET contacted = true WHERE id = :id RETURNING *",
        {"id": submission_id},
    )

    badge_service.award_badge(sub["builder_id"], sub["challenge_id"], "sponsor_fav")

    builder = db_fetchone(
        "SELECT name, email FROM profiles WHERE id = :id",
        {"id": sub["builder_id"]},
    )
    if builder and builder.get("email"):
        email_service.send_contacted_notification(
            to=builder["email"],
            builder_name=builder.get("name", "Builder"),
            company_name=current_user.get("company_name", "A sponsor"),
            challenge_title=challenge["title"],
        )

    return result
