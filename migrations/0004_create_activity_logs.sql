-- Migration: 0004_create_activity_logs.sql
-- Description: Audit and activity logging table for tracking user activities (registrations, posts) and admin activities (bans, unbans, roles, moderation, system config).
-- Target Database: Neon Serverless PostgreSQL (public schema)

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user', 'admin', 'system'
  actor_id UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  actor_role VARCHAR(20),
  target_id TEXT,
  target_type VARCHAR(50),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON public.activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON public.activity_logs(actor_id);
