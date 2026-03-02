-- ============================================================
-- EliteBuilders — PostgreSQL schema for Render PostgreSQL + Clerk
-- Run once in psql or Render's "Shell" tab on your database.
-- NOTE: No Supabase-specific features (no RLS, no auth.users FK).
--       Access control is handled entirely by FastAPI.
-- ============================================================

-- profiles: one row per user; user_id is the Clerk user ID (text)
CREATE TABLE IF NOT EXISTS profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text UNIQUE NOT NULL,          -- Clerk user ID e.g. "user_2abc..."
  email             text,
  role              text NOT NULL DEFAULT 'builder'
                      CHECK (role IN ('builder','sponsor','admin')),
  name              text,
  bio               text,
  github_url        text,
  cv_url            text,
  season_score      integer DEFAULT 0,
  company_name      text,
  company_logo_url  text,
  created_at        timestamptz DEFAULT now()
);

-- challenges
CREATE TABLE IF NOT EXISTS challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  rubric_json     jsonb NOT NULL DEFAULT '[]',
  dataset_url     text,
  deadline        timestamptz NOT NULL,
  prize_amount    numeric DEFAULT 0,
  prize_currency  text DEFAULT 'INR',
  domain          text,
  status          text DEFAULT 'draft'
                    CHECK (status IN ('draft','active','closed')),
  created_at      timestamptz DEFAULT now()
);

-- submissions
CREATE TABLE IF NOT EXISTS submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id    uuid REFERENCES challenges(id) ON DELETE CASCADE,
  repo_url        text NOT NULL,
  deck_url        text,
  video_url       text,
  submitted_at    timestamptz DEFAULT now(),
  llm_score_json  jsonb,
  llm_total_score integer,
  final_score     integer,
  judge_id        uuid REFERENCES profiles(id),
  status          text DEFAULT 'pending'
                    CHECK (status IN ('pending','scored','reviewed')),
  contacted       boolean DEFAULT false,
  UNIQUE (builder_id, challenge_id)
);

-- badges
CREATE TABLE IF NOT EXISTS badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE,
  badge_type   text CHECK (badge_type IN ('top10','winner','sponsor_fav','top_performer')),
  awarded_at   timestamptz DEFAULT now()
);

-- llm_eval_logs
CREATE TABLE IF NOT EXISTS llm_eval_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  uuid REFERENCES submissions(id) ON DELETE CASCADE,
  prompt_text    text,
  raw_response   text,
  parsed_score   jsonb,
  created_at     timestamptz DEFAULT now()
);

-- ── Leaderboard view ────────────────────────────────────────────
-- Regular view (always up to date; no refresh needed).
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  s.id,
  s.challenge_id,
  s.builder_id,
  s.llm_total_score,
  s.final_score,
  COALESCE(s.final_score, s.llm_total_score)  AS effective_score,
  s.status,
  s.contacted,
  s.submitted_at,
  p.name        AS builder_name,
  p.github_url,
  RANK() OVER (
    PARTITION BY s.challenge_id
    ORDER BY COALESCE(s.final_score, s.llm_total_score) DESC NULLS LAST
  ) AS rank
FROM submissions s
JOIN profiles p ON s.builder_id = p.id;

-- ── Indexes for common query patterns ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenges_status     ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_submissions_builder   ON submissions(builder_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_badges_builder        ON badges(builder_id);
