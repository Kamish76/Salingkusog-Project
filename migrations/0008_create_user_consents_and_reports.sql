-- Migration: 0008_create_user_consents_and_reports.sql
-- Description: Creates user_consents for Philippine DPA compliance and photo_reports for takedown requests.
-- Target Database: Neon Serverless PostgreSQL (public schema)

-- 1. User Consents Table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE UNIQUE,
  terms_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  privacy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  agreed_terms_privacy BOOLEAN NOT NULL DEFAULT true,
  agreed_public_gallery BOOLEAN NOT NULL DEFAULT true,
  agreed_promotional_use BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);

-- 2. Photo Reports Table (for takedown and non-consent removal requests)
CREATE TABLE IF NOT EXISTS public.photo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  reason VARCHAR(50) NOT NULL, -- 'no_consent', 'inappropriate', 'harassment', 'other'
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_reports_post ON public.photo_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_photo_reports_status ON public.photo_reports(status);
