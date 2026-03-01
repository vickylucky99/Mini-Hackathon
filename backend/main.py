from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, challenges, submissions, leaderboard, scoring, admin, profiles

app = FastAPI(title="EliteBuilders API", version="1.0.0")

# Support comma-separated list in FRONTEND_URL env var
_origins = list({
    o.strip()
    for o in settings.frontend_url.split(",")
    if o.strip()
} | {"http://localhost:5173"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(challenges.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
