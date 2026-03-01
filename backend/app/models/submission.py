from pydantic import BaseModel, HttpUrl
from typing import Optional, Any
from datetime import datetime


class SubmissionCreate(BaseModel):
    challenge_id: str
    repo_url: str
    deck_url: Optional[str] = None
    video_url: Optional[str] = None


class SubmissionOut(BaseModel):
    id: str
    builder_id: str
    challenge_id: str
    repo_url: str
    deck_url: Optional[str]
    video_url: Optional[str]
    submitted_at: datetime
    llm_score_json: Optional[Any]
    llm_total_score: Optional[int]
    final_score: Optional[int]
    judge_id: Optional[str]
    status: str
    contacted: bool


class JudgeOverride(BaseModel):
    final_score: int
    judge_notes: Optional[str] = None
