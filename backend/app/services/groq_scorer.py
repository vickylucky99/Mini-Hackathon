import json
import logging
from groq import Groq
from app.config import settings
from app.database import supabase

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
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def score_submission(submission_id: str) -> dict | None:
    # Fetch submission
    sub_res = supabase.table("submissions").select("*, challenges(title, rubric_json), profiles(name)").eq("id", submission_id).single().execute()
    if not sub_res.data:
        logger.error(f"Submission {submission_id} not found")
        return None

    sub = sub_res.data
    challenge = sub.get("challenges", {})
    builder = sub.get("profiles", {})

    user_prompt = f"""Builder: {builder.get('name', 'Unknown')}
Challenge: {challenge.get('title', 'Unknown')}
RUBRIC: {json.dumps(challenge.get('rubric_json', []), indent=2)}

SUBMISSION:
- GitHub Repository: {sub.get('repo_url', 'Not provided')}
- Pitch Deck: {sub.get('deck_url', 'Not provided')}
- Demo Video: {sub.get('video_url', 'Not provided')}

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
                # Retry with JSON fix prompt
                messages = [
                    {"role": "system", "content": FIX_JSON_PROMPT},
                    {"role": "user", "content": raw_response},
                ]
            else:
                logger.error(f"All scoring attempts failed for submission {submission_id}")
                # Log the failure
                supabase.table("llm_eval_logs").insert({
                    "submission_id": submission_id,
                    "prompt_text": user_prompt,
                    "raw_response": raw_response,
                    "parsed_score": None,
                }).execute()
                return None

    # Log successful eval
    supabase.table("llm_eval_logs").insert({
        "submission_id": submission_id,
        "prompt_text": user_prompt,
        "raw_response": raw_response,
        "parsed_score": parsed,
    }).execute()

    # Update submission with score
    total_score = parsed.get("total_score", 0)
    supabase.table("submissions").update({
        "llm_score_json": parsed,
        "llm_total_score": total_score,
        "status": "scored",
    }).eq("id", submission_id).execute()

    return parsed
