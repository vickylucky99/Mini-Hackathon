from pydantic import BaseModel
from typing import List, Optional


class CriterionScore(BaseModel):
    name: str
    score: int
    feedback: str


class LLMScoreResult(BaseModel):
    criteria: List[CriterionScore]
    total_score: int
    overall_feedback: str
    flags: List[str] = []
