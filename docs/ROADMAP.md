# Salingkusog Project Roadmap

This roadmap breaks down the delivery of the Salingkusog Freedom Board, 3x3 Bingo Challenge, Raffle Engine, and Realtime Dashboard into 5 structured phases.

---

## Roadmap Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Phase 1     │ ──> │     Phase 2     │ ──> │     Phase 3     │ ──> │     Phase 4     │ ──> │     Phase 5     │
│  Architecture,  │     │ 3x3 Bingo Grid  │     │  Raffle Engine  │     │ Realtime Home   │     │ Social Export,  │
│  Storage & DB   │     │  & Day-Locking  │     │  & /dev/raffle  │     │ Dashboard & Feed│     │ QA & Live Event │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Phase 1: Architecture, Storage & Database Foundation (Milestone 1)
- [x] Configure Neon Managed Better Auth & Google OAuth with Next.js 16 Proxy handshake.
- [x] Configure Neon Object Storage / S3 bucket (`assets`) with client-side 1080p WebP image optimization (`src/lib/image-processing.ts`, `src/lib/storage.ts`).
- [x] Establish RBAC hierarchy (`superadmin`, `admin`, `user`) and dedicated User Management Console (`/dev/users`).
- [ ] Database Schema Migration via Neon SQL (`src/lib/db.ts`):
  - [ ] `bingo_tasks`: 3x3 grid slots (0..8), `unlock_day` (Day 1, 2, 3), `requires_selfie` boolean.
  - [ ] `posts`: image URL, user ID, caption, `is_bingo_entry`, `bingo_task_id`, `status`.
  - [ ] `user_bingo_progress`: user ID, task ID, post ID, `completed_at`.
  - [ ] `raffle_entries`: `raffle_code`, user ID, `line_type`, `line_index`, `task_ids`, `post_ids`, verification status.
  - [ ] `post_reactions`: cheer/hype reactions.
- [ ] Seed default 9 Salingkusog intramurals challenge tasks across Days 1–3.

---

## Phase 2: 3x3 Bingo Grid Engine & Multi-Day Locking (Milestone 2)
- [ ] Build Interactive 3x3 Bingo Grid UI (`src/components/bingo/bingo-grid.tsx`):
  - 9 structured tiles displaying challenge title, category badge, and day indicator.
  - Tile States:
    - 🔒 **Locked**: Assigned to a future day (displays padlock + day label).
    - ⏳ **Unlocked / Pending**: Available to complete today.
    - ✅ **Completed**: Shows thumbnail of uploaded photo proof with checkmark.
- [ ] Slot Submission Modal (`src/components/bingo/task-upload-modal.tsx`):
  - Displays specific selfie instructions and task requirements.
  - Camera capture / photo picker.
  - In-browser 1080p WebP downscaler (<300 KB).
  - Optional caption input and anonymity toggle.
- [ ] Server Action for Task Proof Submission:
  - Validates caller authentication and checks that `unlock_day` is active.
  - Uploads photo to Neon Storage, records post in `posts`, and links progress in `user_bingo_progress`.

---

## Phase 3: Raffle Ticket Engine & Admin Verification Portal (Milestone 3)
- [ ] Line Completion Detection Engine (`src/lib/bingo-win.ts`):
  - Evaluates rows (0-2), columns (0-2), diagonals (0-1), and blackout.
  - Identifies which lines are newly completed and eligible for raffle submission.
- [ ] "Submit Done & Claim Raffle" Flow:
  - User taps claim button upon line completion.
  - Server generates unique, secure Raffle ID (e.g. `SK-RFL-XXXXXX`).
  - Stores entry in `raffle_entries` with line snapshot (`task_ids`, `post_ids`).
- [ ] User Raffle Wallet UI:
  - Displays all earned Raffle IDs, timestamp, and line type (Row, Column, Diagonal).
- [ ] Live Draw Organizer Verification Panel (`/dev/raffle`):
  - Search / lookup by `raffle_code`.
  - Side-by-side display of the 3 selfie photos submitted for that line.
  - Verification actions: **"Verify & Award"** or **"Disqualify"** (records reason).

---

## Phase 4: Home Page Dashboard & Realtime Campus Feed (Milestone 4)
- [ ] Public Unauthenticated Visitor Experience:
  - Event banner, countdown, and active day theme.
  - Realtime photo preview masonry gallery.
  - Campus activity counters (photos uploaded, completed lines, active colleges).
  - Seamless 1-tap Google OAuth login.
- [ ] Authenticated Student Live Dashboard:
  - Personal 3x3 Bingo Board view + Today's active tasks.
  - Realtime upload stream featuring recently uploaded selfies and intramural proofs.
  - Live celebration ticker for completed rows/cols by fellow students.
  - Campus spirit leaderboard / highlight reel for top contributors.
- [ ] Lightweight Realtime / Polling Refresh:
  - Polling or SSE / Neon Realtime integration for live feed updates without page reloads.

---

## Phase 5: Social Export Templates, QA & Live Campus Launch (Milestone 5)
- [ ] Social Story & Feed Exporter:
  - In-browser HTML5 Canvas generator.
  - **9:16 Vertical Story Template** for Instagram & TikTok.
  - **1:1 Square Post Template** for Facebook & Instagram feed.
  - Overlays Salingkusog branding, user alias/name, and completed bingo line stamps.
  - 1-click Download / Web Share API (`navigator.share`).
- [ ] Mobile Performance & Low-Bandwidth Stress Testing:
  - Verify smooth operation under campus Wi-Fi / LTE conditions.
- [ ] On-Site Physical Banners & QR Codes:
  - Generate QR codes linking directly to the mobile dashboard and upload modal.
- [ ] Live Event Operations & Stage Raffle Drawing Support:
  - Standby support during intramural opening ceremonies, daily games, and awarding.
