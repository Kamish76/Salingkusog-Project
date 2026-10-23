-- Migration: 0002_raffle_and_reactions.sql
-- Description: Schema for Raffle Entries, Post Reactions, and Event Configuration.
-- Target Database: Neon Serverless PostgreSQL (public schema)

-- 1. Raffle Entries Table (Valid line ticket submissions and verification)
CREATE TABLE IF NOT EXISTS public.raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_code VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('row', 'column', 'diagonal', 'blackout')),
  line_index INT NOT NULL CHECK (line_index >= 0 AND line_index <= 2),
  task_ids UUID[] NOT NULL,
  post_ids UUID[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'verified', 'disqualified')),
  disqualification_reason TEXT,
  verified_by UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_raffle_entries_user_line UNIQUE (user_id, line_type, line_index)
);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_code ON public.raffle_entries(raffle_code);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_user_id ON public.raffle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_status ON public.raffle_entries(status);

-- 2. Post Reactions Table (Cheer and Spirit Reactions on Campus Stream Posts)
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('fire', 'cheer', 'heart', 'trophy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_reactions_post_user_type UNIQUE (post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);

-- 3. Event Configuration Table (Controls active intramural day and system locks)
CREATE TABLE IF NOT EXISTS public.event_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  current_day INT NOT NULL DEFAULT 1 CHECK (current_day BETWEEN 1 AND 3),
  is_event_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL
);

-- Seed initial event configuration
INSERT INTO public.event_config (key, current_day, is_event_active)
VALUES ('active_event', 1, true)
ON CONFLICT (key) DO NOTHING;
