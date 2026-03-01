from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.database import supabase
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

    sub = supabase.table("submissions").select("id, status").eq("id", submission_id).single().execute()
    if not sub.data:
        raise HTTPException(status_code=404, detail="Submission not found")

    background_tasks.add_task(groq_scorer.score_submission, submission_id)
    return {"message": "Scoring triggered", "submission_id": submission_id}
