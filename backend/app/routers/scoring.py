from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.database import db_fetchone
from app.middleware.auth import get_current_user
from app.services import groq_scorer

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.post("/trigger/{submission_id}", response_model=dict)
async def trigger_scoring(
    submission_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    sub = db_fetchone(
        "SELECT id, status FROM submissions WHERE id = :id",
        {"id": submission_id},
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    background_tasks.add_task(groq_scorer.score_submission, submission_id)
    return {"message": "Scoring triggered", "submission_id": submission_id}
