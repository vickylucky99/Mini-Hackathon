from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfileUpsert(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    github_url: Optional[str] = None
    cv_url: Optional[str] = None
    role: Optional[str] = "builder"
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None


class ProfileOut(BaseModel):
    id: str
    user_id: str
    role: str
    name: Optional[str]
    bio: Optional[str]
    github_url: Optional[str]
    cv_url: Optional[str]
    season_score: int
    company_name: Optional[str]
    company_logo_url: Optional[str]
    created_at: datetime
