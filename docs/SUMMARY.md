# Salingkusog — Executive Project Summary

> **One-Line Vision:** A gamified, real-time campus web platform that turns university intramurals (*Salingkusog*) into an interactive 3x3 photo bingo challenge and verifiable live-stage raffle draw.

---

## 1. Why Salingkusog?

During university intramurals, student spirit and campus energy reach their peak. However, event photos, cheering moments, and memories are typically fragmented across private group chats and fleeting social media stories. 

**Salingkusog** unifies the campus through an open, live digital wall paired with an interactive 3x3 challenge card. By turning event participation (watching ball games, food booth visits, mascot encounters) into an engaging game with tangible raffle prizes, the platform maximizes student attendance, inter-college spirit, and viral online visibility.

---

## 2. Core Pillars at a Glance

| Pillar | What It Does | Key Mechanism |
|---|---|---|
| **1. Live Home Dashboard** | Real-time campus pulse & photo stream | • **Public**: Preview event highlights, activity counters, and daily theme.<br>• **Authenticated**: Live photo stream, active tasks, and real-time ticker celebrating peers completing lines. |
| **2. 3x3 Intramurals Bingo** | 9-tile interactive campus challenge card | • **Selfie-First**: Photo proofs require a user selfie by default.<br>• **Multi-Day Locking**: Tasks unlock progressively across Day 1, Day 2, and Day 3.<br>• **Zero Bloat Uploads**: In-browser 1080p WebP downscaler (<250 KB). |
| **3. Verifiable Raffle System** | Rewards line completion with stage draw entries | • **Trigger**: Completing any Row (3), Column (3), or Diagonal (2).<br>• **Unique Ticket**: Generates a verifiable `raffle_code` (e.g. `SK-RFL-XXXXXX`).<br>• **Live Stage Review**: Organizers inspect the 3 submitted selfies in `/dev/raffle` before awarding prizes. |
| **4. Social Story Exporter** | Instant campus virality on social networks | • In-browser Canvas export into **9:16 Stories** (Instagram / TikTok) and **1:1 Posts** (Facebook / Instagram) stamped with official branding. |

---

## 3. The 30-Second Student Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Land on Home Page                                            │
│    • Public sees event countdown, stats & recent live photos    │
│    • 1-tap Google OAuth Sign-in                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. View 3x3 Bingo Card & Today's Active Tasks                   │
│    • Day 1 tasks unlocked; future days padlocked                │
│    • Review selfie instructions for unlocked challenges         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Snap Selfie & Complete Slot                                  │
│    • Photo downscaled to 1080p WebP in browser -> Neon Storage  │
│    • Slot updates with photo; cross-posted to Live Feed         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Form a Line (Row, Column, or Diagonal)                       │
│    • Tap "Submit Done & Claim Raffle"                           │
│    • Receive unique Raffle ID (e.g. SK-RFL-92B1C4)              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Share & Win!                                                 │
│    • Export branded 9:16 Story to Instagram / TikTok / Facebook │
│    • Host draws Raffle ID on stage -> Organizers verify selfies │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Rules & Constraints

1. **Selfie Verification Requirement:** Every bingo submission must clearly show the student user's face unless explicitly exempt by the challenge description (e.g. official team banner shots).
2. **Multi-Day Event Schedule:** Intramurals tasks are tied to specific event days (`unlock_day`). Future tasks cannot be submitted early, ensuring continuous daily engagement throughout the entire tournament.
3. **Storage Quota Preservation:** Neon's free tier provides 5 GB storage. Client-side canvas compression downscales images to 1080p WebP (~200–300 KB) before uploading, expanding free capacity to ~20,000–30,000 photos with zero serverless CPU overhead.
4. **Safe Accountability:** Students may toggle an alias ("Anonymous Student") on public feeds, but backend logs securely record the authenticated Google account ID to prevent cyberbullying or inappropriate uploads.

---

## 5. Technology Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React Server Components) + React 19
- **Styling:** Tailwind CSS v4
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`) via `src/lib/db.ts`
- **Authentication:** Neon Managed Better Auth with Google OAuth (`@neondatabase/auth`) via `src/proxy.ts`
- **Media Storage:** Neon Object Storage (AWS S3-compatible, `assets` bucket) via `src/lib/storage.ts`

---

## 6. Project Documentation Index

- Detailed Functional Scope & Database Schema: [`docs/PROJECT_SCOPE.md`](file:///Users/Kamish/Desktop/JEBZ%20DEVVV/Salingkusog-Project/docs/PROJECT_SCOPE.md)
- Creative Brainstorming & Intramural Task Ideas: [`docs/BRAINSTORMING.md`](file:///Users/Kamish/Desktop/JEBZ%20DEVVV/Salingkusog-Project/docs/BRAINSTORMING.md)
- 5-Phase Implementation Roadmap: [`docs/ROADMAP.md`](file:///Users/Kamish/Desktop/JEBZ%20DEVVV/Salingkusog-Project/docs/ROADMAP.md)
- Active Technical Specification: [`.icm/01_spec/output/spec.md`](file:///Users/Kamish/Desktop/JEBZ%20DEVVV/Salingkusog-Project/.icm/01_spec/output/spec.md)
- DevBrain Architecture Memory: `01_Projects/Salingkusog-Project/Project-Context.md`
