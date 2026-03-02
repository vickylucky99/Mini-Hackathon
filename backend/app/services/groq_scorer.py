import json
import logging
from groq import Groq
from app.config import settings
from app.database import db_fetchone, db_run

logger = logging.getLogger(__name__)

client = Groq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """You are an expert AI product evaluator at a competitive hackathon platform.
Score the submission against the provided rubric. Return ONLY valid JSON, no other text, no markdown.
Required schema:
{
  "criteria": [{"name": string, "score": integer (0-100), "feedback": string}],
  "total_score": integer (0-100),
  "overall_feedback": string,
  "flags": []
}
Rules:
- feedback must be constructive, specific, and actionable — not generic
- If submission is harmful, plagiarised, or off-topic: set total_score=0, add reason to flags
- Score each criterion proportionally to its weight in the rubric
- overall_feedback should mention builder name and challenge title"""

FIX_JSON_PROMPT = """The previous response was not valid JSON. Extract and return ONLY the valid JSON object from this text, fixing any syntax errors.
Return nothing else — just the raw JSON object."""


def _call_groq(messages: list, attempt: int = 1) -> str:
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2,
        max_tokens=2048,
    )
    return response.choices[0].message.content


def _parse_score(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def score_submission(submission_id: str) -> dict | None:
    row = db_fetchone(
        """
        SELECT s.*, c.title AS challenge_title, c.rubric_json, p.name AS builder_name
        FROM submissions s
        JOIN challenges c ON s.challenge_id = c.id
        JOIN profiles p ON s.builder_id = p.id
        WHERE s.id = :id
        """,
        {"id": submission_id},
    )
    if not row:
        logger.error(f"Submission {submission_id} not found")
        return None

    rubric = row.get("rubric_json") or []
    user_prompt = f"""Builder: {row.get('builder_name', 'Unknown')}
Challenge: {row.get('challenge_title', 'Unknown')}
RUBRIC: {json.dumps(rubric, indent=2)}

SUBMISSION:
- GitHub Repository: {row.get('repo_url', 'Not provided')}
- Pitch Deck: {row.get('deck_url', 'Not provided')}
- Demo Video: {row.get('video_url', 'Not provided')}

Score each criterion in the rubric on a 0-100 scale. Be specific and actionable in feedback.
Return ONLY the JSON object."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    raw_response = None
    parsed = None

    for attempt in range(1, 3):
        try:
            raw_response = _call_groq(messages, attempt)
            parsed = _parse_score(raw_response)
            break
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Attempt {attempt} failed for submission {submission_id}: {e}")
            if attempt == 1 and raw_response:
                messages = [
                    {"role": "system", "content": FIX_JSON_PROMPT},
                    {"role": "user", "content": raw_response},
                ]
            else:
                logger.error(f"All scoring attempts failed for submission {submission_id}")
                db_run(
                    """
                    INSERT INTO llm_eval_logs (submission_id, prompt_text, raw_response)
                    VALUES (:submission_id, :prompt_text, :raw_response)
                    """,
                    {"submission_id": submission_id, "prompt_text": user_prompt, "raw_response": raw_response},
                )
                return None

    # Log successful eval
    db_run(
        """
        INSERT INTO llm_eval_logs (submission_id, prompt_text, raw_response, parsed_score)
        VALUES (:submission_id, :prompt_text, :raw_response, :parsed_score::jsonb)
        """,
        {
            "submission_id": submission_id,
            "prompt_text": user_prompt,
            "raw_response": raw_response,
            "parsed_score": json.dumps(parsed),
        },
    )

    total_score = parsed.get("total_score", 0)
    db_run(
        """
        UPDATE submissions
        SET llm_score_json = :llm_score_json::jsonb, llm_total_score = :total_score, status = 'scored'
        WHERE id = :id
        """,
        {
            "llm_score_json": json.dumps(parsed),
            "total_score": total_score,
            "id": submission_id,
        },
    )

    return parsed
