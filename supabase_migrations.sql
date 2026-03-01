-- ============================================================
-- EliteBuilders — Supabase SQL Migrations
-- Run this entire file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
-- ============================================================

-- 1. PROFILES
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  role text not null default 'builder' check (role in ('builder','sponsor','admin')),
  name text,
  bio text,
  github_url text,
  cv_url text,
  season_score integer default 0,
  company_name text,
  company_logo_url text,
  created_at timestamptz default now()
);

-- 2. CHALLENGES
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  rubric_json jsonb not null default '[]',
  dataset_url text,
  deadline timestamptz not null,
  prize_amount numeric default 0,
  prize_currency text default 'INR',
  domain text,
  status text default 'draft' check (status in ('draft','active','closed')),
  created_at timestamptz default now()
);

-- 3. SUBMISSIONS
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  repo_url text not null,
  deck_url text,
  video_url text,
  submitted_at timestamptz default now(),
  llm_score_json jsonb,
  llm_total_score integer,
  final_score integer,
  judge_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending','scored','reviewed')),
  contacted boolean default false,
  unique(builder_id, challenge_id)
);

-- 4. BADGES
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  badge_type text check (badge_type in ('top10','winner','sponsor_fav','top_performer')),
  awarded_at timestamptz default now()
);

-- 5. LLM EVAL LOGS
create table if not exists llm_eval_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  prompt_text text,
  raw_response text,
  parsed_score jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table challenges enable row level security;
alter table submissions enable row level security;
alter table badges enable row level security;
alter table llm_eval_logs enable row level security;

-- PROFILES
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);

-- CHALLENGES
create policy "challenges_select_public" on challenges for select
  using (status != 'draft' or sponsor_id = (select id from profiles where user_id = auth.uid()));

create policy "challenges_insert_sponsor" on challenges for insert
  with check ((select role from profiles where user_id = auth.uid()) in ('sponsor','admin'));

create policy "challenges_update_own" on challenges for update
  using (
    sponsor_id = (select id from profiles where user_id = auth.uid()) or
    (select role from profiles where user_id = auth.uid()) = 'admin'
  );

-- SUBMISSIONS
create policy "submissions_insert_builder" on submissions for insert
  with check (builder_id = (select id from profiles where user_id = auth.uid()));

create policy "submissions_select_authorized" on submissions for select
  using (
    builder_id = (select id from profiles where user_id = auth.uid()) or
    (select sponsor_id from challenges where id = challenge_id) = (select id from profiles where user_id = auth.uid()) or
    (select role from profiles where user_id = auth.uid()) = 'admin'
  );

create policy "submissions_update_authorized" on submissions for update
  using (
    (select sponsor_id from challenges where id = challenge_id) = (select id from profiles where user_id = auth.uid()) or
    (select role from profiles where user_id = auth.uid()) = 'admin'
  );

-- BADGES
create policy "badges_select_all" on badges for select using (true);
create policy "badges_insert_admin" on badges for insert
  with check ((select role from profiles where user_id = auth.uid()) = 'admin');

-- LLM EVAL LOGS (admin only)
create policy "llm_logs_admin" on llm_eval_logs for all
  using ((select role from profiles where user_id = auth.uid()) = 'admin');

-- ============================================================
-- LEADERBOARD MATERIALIZED VIEW
-- ============================================================

create materialized view if not exists leaderboard as
select
  s.id,
  s.challenge_id,
  s.builder_id,
  s.llm_total_score,
  s.final_score,
  coalesce(s.final_score, s.llm_total_score) as effective_score,
  s.status,
  s.contacted,
  s.submitted_at,
  p.name as builder_name,
  p.github_url,
  rank() over (
    partition by s.challenge_id
    order by coalesce(s.final_score, s.llm_total_score) desc nulls last
  ) as rank
from submissions s
join profiles p on s.builder_id = p.id;

-- Index for fast lookups
create unique index if not exists leaderboard_id_idx on leaderboard (id);
create index if not exists leaderboard_challenge_idx on leaderboard (challenge_id, rank);

-- RPC function to refresh the materialized view (called by backend)
create or replace function refresh_leaderboard()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently leaderboard;
end;
$$;

-- ============================================================
-- OPTIONAL: Seed a demo challenge for testing
-- ============================================================
-- Uncomment and adjust once you have at least one sponsor profile:
--
-- insert into challenges (sponsor_id, title, description, rubric_json, deadline, prize_amount, prize_currency, domain, status)
-- values (
--   '<your-sponsor-profile-id>',
--   'Build a Conversational AI for E-commerce',
--   'Create an AI-powered product recommendation chatbot using any LLM. The bot should understand natural language queries, maintain conversation context, and recommend relevant products from a sample catalog.',
--   '[
--     {"name": "Technical Implementation", "description": "Quality of LLM integration, prompt design, and code structure", "max_score": 30},
--     {"name": "UX & Product Thinking", "description": "User experience, conversation flow, and product framing", "max_score": 25},
--     {"name": "Business Value", "description": "Clarity of use case, demo quality, and pitch deck", "max_score": 25},
--     {"name": "Innovation", "description": "Creative use of AI, novel approach, or standout features", "max_score": 20}
--   ]',
--   now() + interval '14 days',
--   50000,
--   'INR',
--   'NLP',
--   'active'
-- );
