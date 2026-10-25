-- Migration: 0006_drop_unused_post_reactions.sql
-- Description: Drop unused public.post_reactions table and its indices.
-- Target Database: Neon Serverless PostgreSQL (public schema)

DROP TABLE IF EXISTS public.post_reactions CASCADE;
