import uuid as _uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)


def _serialize(row: dict) -> dict:
    """Convert UUID and datetime values to JSON-safe strings."""
    result = {}
    for k, v in row.items():
        if isinstance(v, _uuid.UUID):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def db_fetchone(query: str, params: dict | None = None) -> dict | None:
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        row = result.mappings().first()
        return _serialize(dict(row)) if row else None


def db_fetchall(query: str, params: dict | None = None) -> list[dict]:
    with engine.connect() as conn:
        result = conn.execute(text(query), params or {})
        return [_serialize(dict(row)) for row in result.mappings()]


def db_execute(query: str, params: dict | None = None) -> dict | None:
    """Run INSERT/UPDATE/DELETE with RETURNING *; returns the first row."""
    with engine.begin() as conn:
        result = conn.execute(text(query), params or {})
        if result.returns_rows:
            row = result.mappings().first()
            return _serialize(dict(row)) if row else None
        return None


def db_run(query: str, params: dict | None = None) -> None:
    """Run INSERT/UPDATE/DELETE without caring about the return value."""
    with engine.begin() as conn:
        conn.execute(text(query), params or {})
