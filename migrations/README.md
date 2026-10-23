# Database Migrations Ledger

This directory contains ordered, idempotent SQL migration files for the Salingkusog platform hosted on Neon Serverless PostgreSQL.

## Migration Conventions
- Files are sequentially prefixed: `0001_...sql`, `0002_...sql`, etc.
- All statements must be **idempotent** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Tables in `public` integrate with user accounts stored in Neon Managed Better Auth (`neon_auth.user` and `neon_auth.session`).
- Foreign keys referencing users must use `UUID REFERENCES neon_auth.user(id) ON DELETE CASCADE` (or `SET NULL` for audit fields).

## Ledger
| Migration | Target Tables | Status | Description |
|---|---|---|---|
| `0001_initial_moderation_and_bingo.sql` | `bingo_tasks`, `posts`, `user_bingo_progress` | Applied | Baseline schema for 3x3 challenge slots, photo proof posts, and 9 seeded tasks. |
| `0002_raffle_and_reactions.sql` | `raffle_entries`, `post_reactions`, `event_config` | Applied | Raffle ticket entries, line tracking, cheer reactions, and event day configuration. |
| `0003_add_raffle_active_flag.sql` | `event_config` | Applied | Adds `is_raffle_active` toggle column to control raffle drawings. |
