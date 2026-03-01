from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class RubricCriterion(BaseModel):
    name: str
    description: str
    max_score: int


class ChallengeCreate(BaseModel):
    title: str
    description: str
    rubric_json: List[RubricCriterion]
    dataset_url: Optional[str] = None
    deadline: datetime
    prize_amount: Optional[float] = 0
    prize_currency: Optional[str] = "INR"
    domain: Optional[str] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rubric_json: Optional[List[RubricCriterion]] = None
    dataset_url: Optional[str] = None
    deadline: Optional[datetime] = None
    prize_amount: Optional[float] = None
    prize_currency: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None


class ChallengeOut(BaseModel):
    id: str
    sponsor_id: str
    title: str
    description: Optional[str]
    rubric_json: Any
    dataset_url: Optional[str]
    deadline: datetime
    prize_amount: float
    prize_currency: str
    domain: Optional[str]
    status: str
    created_at: datetime
