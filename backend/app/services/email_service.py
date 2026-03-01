import logging
import resend
from app.config import settings

logger = logging.getLogger(__name__)
resend.api_key = settings.resend_api_key


def _send(to: str, subject: str, html: str):
    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")


def send_submission_confirmed(to: str, builder_name: str, challenge_title: str):
    _send(
        to=to,
        subject=f"Submission received — {challenge_title}",
        html=f"""
        <h2>Your submission is in, {builder_name}!</h2>
        <p>We've received your submission for <strong>{challenge_title}</strong>.</p>
        <p>Our AI scorer will evaluate it within 15 minutes. You'll get another email once your provisional score is ready.</p>
        <p>Good luck! 🚀</p>
        """,
    )


def send_score_ready(to: str, builder_name: str, challenge_title: str, score: int, feedback: str):
    _send(
        to=to,
        subject=f"Your score is ready — {challenge_title}",
        html=f"""
        <h2>Score ready, {builder_name}!</h2>
        <p>Your submission for <strong>{challenge_title}</strong> has been evaluated.</p>
        <h3>Provisional Score: {score}/100</h3>
        <p><strong>Overall Feedback:</strong> {feedback}</p>
        <p>Check the leaderboard to see your ranking. A human judge may review and adjust your final score within 5 business days.</p>
        """,
    )


def send_badge_awarded(to: str, builder_name: str, badge_type: str, challenge_title: str):
    badge_labels = {
        "top10": "Top 10%",
        "winner": "Challenge Winner",
        "sponsor_fav": "Sponsor Favourite",
        "top_performer": "Top Performer",
    }
    label = badge_labels.get(badge_type, badge_type)
    _send(
        to=to,
        subject=f"Badge awarded: {label} — {challenge_title}",
        html=f"""
        <h2>Congratulations, {builder_name}!</h2>
        <p>You've earned the <strong>{label}</strong> badge for <strong>{challenge_title}</strong>.</p>
        <p>Your badge is now visible on your EliteBuilders profile. Share it on LinkedIn to showcase your achievement!</p>
        """,
    )


def send_contacted_notification(to: str, builder_name: str, company_name: str, challenge_title: str):
    _send(
        to=to,
        subject=f"{company_name} is interested in your submission!",
        html=f"""
        <h2>Great news, {builder_name}!</h2>
        <p><strong>{company_name}</strong> has marked your submission for <strong>{challenge_title}</strong> for outreach.</p>
        <p>They may be in touch soon. Make sure your profile and GitHub are up to date!</p>
        """,
    )
