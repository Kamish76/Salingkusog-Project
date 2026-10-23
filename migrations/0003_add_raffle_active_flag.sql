-- Migration: 0003_add_raffle_active_flag.sql
-- Description: Add is_raffle_active toggle column to public.event_config
-- Target Database: Neon Serverless PostgreSQL (public schema)

ALTER TABLE public.event_config 
ADD COLUMN IF NOT EXISTS is_raffle_active BOOLEAN NOT NULL DEFAULT true;
