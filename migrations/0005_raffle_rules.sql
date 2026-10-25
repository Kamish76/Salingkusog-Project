-- Migration: 0005_raffle_rules.sql
-- Description: Dynamic Raffle Rules configuration table, event config user cap, and raffle entries rule_key metadata.
-- Target Database: Neon Serverless PostgreSQL (public schema)

-- 1. Create Raffle Rules Configuration Table
CREATE TABLE IF NOT EXISTS public.raffle_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('bingo_line', 'milestone', 'memory_drop', 'general')),
  description TEXT NOT NULL,
  tickets_awarded INT NOT NULL DEFAULT 1 CHECK (tickets_awarded >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raffle_rules_category ON public.raffle_rules(category);
CREATE INDEX IF NOT EXISTS idx_raffle_rules_active ON public.raffle_rules(is_active);

-- 2. Seed Initial Canonical Raffle Rules
INSERT INTO public.raffle_rules (rule_key, name, category, description, tickets_awarded, is_active)
VALUES
  ('line_row', 'Horizontal Row Completion', 'bingo_line', 'Awarded when a student completes all 3 challenges in any horizontal row.', 1, true),
  ('line_column', 'Vertical Column Completion', 'bingo_line', 'Awarded when a student completes all 3 challenges in any vertical column.', 1, true),
  ('line_diagonal', 'Diagonal Line Completion', 'bingo_line', 'Awarded when a student completes all 3 challenges across the main or anti-diagonal.', 1, true),
  ('line_blackout', 'Full Card Blackout', 'bingo_line', 'Bonus raffle ticket awarded when a student completes all 9 slots on their bingo card.', 2, true),
  ('milestone_3', 'Bronze Milestone (Any 3 Slots)', 'milestone', 'Awarded upon completing any 3 challenge slots on the bingo card, regardless of line alignment.', 1, true),
  ('milestone_6', 'Silver Milestone (Any 6 Slots)', 'milestone', 'Awarded upon completing any 6 challenge slots across the intramurals event days.', 1, true),
  ('memory_drop', 'Campus Memory Drop', 'memory_drop', 'Bonus ticket awarded when dropping a general campus spirit photo to the public scrapbook board.', 1, false)
ON CONFLICT (rule_key) DO NOTHING;

-- 3. Add max_tickets_per_user to event_config (0 = unlimited)
ALTER TABLE public.event_config
ADD COLUMN IF NOT EXISTS max_tickets_per_user INT NOT NULL DEFAULT 0;

-- 4. Extend public.raffle_entries to store rule_key
ALTER TABLE public.raffle_entries
ADD COLUMN IF NOT EXISTS rule_key VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_rule_key ON public.raffle_entries(rule_key);

-- 5. Expand line_type check constraint on public.raffle_entries to support milestones and memory drops
ALTER TABLE public.raffle_entries
DROP CONSTRAINT IF EXISTS raffle_entries_line_type_check;

ALTER TABLE public.raffle_entries
ADD CONSTRAINT raffle_entries_line_type_check
CHECK (line_type IN ('row', 'column', 'diagonal', 'blackout', 'milestone', 'memory_drop'));

ALTER TABLE public.raffle_entries
DROP CONSTRAINT IF EXISTS raffle_entries_line_index_check;

ALTER TABLE public.raffle_entries
ADD CONSTRAINT raffle_entries_line_index_check
CHECK (line_index >= 0);
