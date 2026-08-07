-- Coding problems table (seeded from LeetCode dataset)
CREATE TABLE IF NOT EXISTS public.coding_problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leetcode_id     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  topics          TEXT[] NOT NULL DEFAULT '{}',
  description     TEXT NOT NULL,
  examples        JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints     TEXT[] NOT NULL DEFAULT '{}',
  hints           TEXT[] NOT NULL DEFAULT '{}',
  code_snippets   JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_tags    TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coding_problems_leetcode_id_idx ON public.coding_problems (leetcode_id);
CREATE INDEX IF NOT EXISTS coding_problems_slug_idx ON public.coding_problems (slug);
CREATE INDEX IF NOT EXISTS coding_problems_difficulty_idx ON public.coding_problems (difficulty);
CREATE INDEX IF NOT EXISTS coding_problems_topics_idx ON public.coding_problems USING GIN (topics);
CREATE INDEX IF NOT EXISTS coding_problems_company_tags_idx ON public.coding_problems USING GIN (company_tags);

-- User coding submissions
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  problem_id      UUID NOT NULL REFERENCES public.coding_problems (id) ON DELETE CASCADE,
  language        TEXT NOT NULL,
  code            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, wrong_answer, time_limit, runtime_error, compile_error
  runtime_ms      INTEGER,
  memory_kb       INTEGER,
  stdout          TEXT,
  stderr          TEXT,
  test_cases_passed INTEGER DEFAULT 0,
  test_cases_total  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coding_submissions_user_id_idx ON public.coding_submissions (user_id);
CREATE INDEX IF NOT EXISTS coding_submissions_problem_id_idx ON public.coding_submissions (problem_id);
CREATE INDEX IF NOT EXISTS coding_submissions_status_idx ON public.coding_submissions (status);

ALTER TABLE public.coding_problems DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions DISABLE ROW LEVEL SECURITY;
