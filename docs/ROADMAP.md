# Salingkusog Project Roadmap

This roadmap breaks down the delivery of the Salingkusog Freedom Board and Bingo System into 5 structured phases.

---

## Roadmap Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Phase 1    │ ──> │   Phase 2    │ ──> │   Phase 3    │ ──> │   Phase 4    │ ──> │   Phase 5    │
│ Architecture │     │ Freedom Wall │     │ Bingo System │     │ Engagement & │     │ Launch &     │
│  & Storage   │     │  Photo Feed  │     │ & Cross-post │     │  Moderation  │     │ Live Event   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Phase 1: Architecture, Storage & Database Foundation (Milestone 1)
- [x] Establish git branch (`docu`) and baseline documentation (`docs/PROJECT_SCOPE.md`, `docs/ROADMAP.md`, `docs/BRAINSTORMING.md`).
- [ ] Configure Neon Object Storage / S3 bucket upload pipeline for images (`assets` bucket configured in `neon.ts`).
- [ ] Implement database migrations for core tables:
  - `posts` table (with anonymity flag, user attribution, image URL, and status).
  - `bingo_tasks` table (with slot index, challenge description, and active status).
  - `user_bingo_progress` table (connecting user, task, and the uploaded post proof).
- [ ] Establish server actions for secure file upload and signed URL generation.

---

## Phase 2: Public Freedom Board Core Feed (Milestone 2)
- [ ] Build Public Feed layout (responsive masonry grid with image lightbox / full-screen preview).
- [ ] Implement Fast Image Loading (optimized Next.js `<Image />` with blur placeholders).
- [ ] Build Upload Modal:
  - Image file picker + client-side compression (converts to WebP/JPEG < 1.5MB for fast loading).
  - Caption input (max 280 characters).
  - Anonymity toggle: "Post Anonymously" vs. "Display My Name".
  - Optional College / Team affiliation selector.
- [ ] Auth Gate check: If guest, prompt Google OAuth login dialog, then return to upload.
- [ ] Optimistic feed updates or quick revalidation on post submission.

---

## Phase 3: Intramurals Bingo Engine & Cross-Posting (Milestone 3)
- [ ] Build Interactive Bingo Card UI:
  - 3x3 (9 tasks) or 4x4 (16 tasks) responsive grid.
  - Slot card states: `Pending`, `In-Progress`, `Completed` (displaying thumbnail of uploaded photo).
- [ ] Seed default Salingkusog intramurals challenge tasks (e.g. mascot selfie, cheering at sports event, food stall snack, etc.).
- [ ] Slot Submission Flow:
  - Clicking a slot opens task instructions and photo upload.
  - Submitting marks the slot completed for the authenticated user.
  - Automatically inserts an entry into `posts` with `is_bingo_entry = true` and `bingo_task_id = ...`.
- [ ] Bingo Win Detection & Celebration:
  - Calculate completed rows, columns, and diagonals in real time.
  - Trigger celebratory confetti and award "BINGO!" digital badge.

---

## Phase 4: Social Engagement & Admin Moderation (Milestone 4)
- [ ] Feed Filtering & Sorting:
  - Tabs: `All Posts`, `🎯 Bingo Proofs`, `💬 General Shoutouts`, `🔥 Top Trending`.
  - Filter by College / Department (e.g., Engineering, Education, Business, Arts).
- [ ] Quick Reactions System:
  - Reaction buttons on each post: 🔥 (Hype), 👏 (Cheer), ❤️ (Love), 🏆 (Winner).
  - Instant optimistic counter increment for authenticated users.
- [ ] Moderation Dashboard in `/dev`:
  - Accessible to `superadmin` and `admin` roles.
  - Real-time review queue of latest uploads.
  - 1-click "Hide Post" or "Flag Content".
  - Moderator ability to see true account identity for any reported anonymous post.
  - Ability for organizers to add or modify active Bingo tasks.

---

## Phase 5: Stress Testing, Campus Rollout & Event Execution (Milestone 5)
- [ ] Mobile Performance & Low-Bandwidth Optimization:
  - Test on congested university Wi-Fi / LTE mobile data.
  - Progressive Web App (PWA) manifest or Add to Home Screen prompts.
- [ ] QR Code generation and promotional material kit:
  - QR codes for posters around campus sports arenas and student booths linking straight to the Freedom Board.
- [ ] Intramurals Day 1 to Day N Live Operations:
  - Live monitoring during opening ceremony and championship games.
  - Announce top bingo finishers or raffle prize winners.
