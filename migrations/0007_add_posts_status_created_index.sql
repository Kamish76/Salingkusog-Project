-- Migration: 0007_add_posts_status_created_index.sql
-- Description: Composite index on status and created_at DESC for high-volume campus scrapbook stream.
-- Target Database: Neon Serverless PostgreSQL (public schema)

CREATE INDEX IF NOT EXISTS idx_posts_status_created ON public.posts(status, created_at DESC);
