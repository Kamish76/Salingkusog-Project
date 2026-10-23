# Salingkusog Freedom Board, 3x3 Bingo & Raffle System — Project Scope

**Project Name:** Salingkusog Freedom Board, 3x3 Intramurals Bingo & Raffle Challenge  
**Target Event:** University Intramurals ("Salingkusog")  
**Target Audience:** University Students, Faculty, Alumni, Student Athletes, and Campus Visitors  
**Repository:** `Salingkusog-Project`  
**Core Technologies:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Neon Serverless PostgreSQL, Neon Managed Better Auth, Neon Object Storage (S3-compatible)  

---

## 1. Executive Summary

During university intramurals (*Salingkusog*), campus energy is at its peak. However, student photos and memories are often fragmented across private social media stories or group chats. 

The **Salingkusog Platform** is an interactive, gamified campus hub designed to maximize student engagement through three integrated pillars:
1. **Public & Realtime Event Dashboard (Home Page):** Unauthenticated visitors preview live campus photos, activity counters, and recently completed lines; authenticated students access their live dashboard, 3x3 Bingo Card, and real-time photo stream.
2. **Multi-Day 3x3 Intramurals Bingo Card:** A 9-slot interactive challenge card where students complete campus tasks (snapping selfies at events, cheering matches, visiting booths). Slots are day-gated across the multi-day intramurals calendar.
3. **Verifiable Raffle Submission Engine:** Completing a row, column, or diagonal allows the user to submit for an official Raffle Entry with a unique Raffle ID. When organizers draw winners on stage, the winning Raffle ID is verified via admin panel photo inspection to ensure valid selfies and genuine task completion.
4. **Viral Social Export Templates:** 1-click generation of branded 9:16 (Instagram / TikTok stories) and 1:1 (Facebook / Instagram posts) cards showcasing the user's completed bingo tiles and university spirit.

---

## 2. Core Feature Pillars

### A. Home Page: Public Preview & Authenticated Realtime Dashboard
1. **Unauthenticated / Public Visitor Experience:**
   - **Live Event Teaser & Hero:** Welcoming students and visitors with event countdown and current day theme.
   - **Public Photo Stream Preview:** Masonry gallery displaying recently approved campus photos and bingo task submissions.
   - **Campus Activity Stats:** Highlighting global metrics (Total Photos Snapped, Completed Bingo Lines, Active Colleges).
   - **Seamless Auth Call-to-Action:** 1-click Google OAuth sign-in to unlock personal Bingo cards and claim raffle entries.
2. **Authenticated Student Dashboard:**
   - **Personal 3x3 Bingo Card View:** Direct access to view completed slots, pending challenges, and upcoming day-locked tiles.
   - **Realtime Upload Stream:** Live-updating feed of newly uploaded photos and proofs from fellow students across campus.
   - **Completed Lines Ticker:** Live campus celebration feed announcing when students complete rows, columns, or diagonals (e.g., *"🎉 Maria C. just completed Row 2 and earned a Raffle Ticket!"*).
   - **Daily Active Tasks Quick-Jump:** Prominently surfaces the challenges that are unlocked for the current event day.
   - **Participant Highlight Spotlight:** Recognizes top participants and active college cheer squads.

### B. Multi-Day 3x3 Bingo Challenge Engine
1. **Fixed 3x3 Grid (9 Entries):**
   - 9 structured tiles representing campus intramural challenges.
   - **Selfie Verification Criterion:** Every photo submission must be a **selfie of the student user themselves**, unless explicitly designated otherwise in the task definition (e.g. group photos, campus landmark selfies).
2. **Multi-Day Scheduling & Day-Locks:**
   - Salingkusog spans multiple event days (e.g. Day 1: Opening & Parade, Day 2: Ball Games & Cheering, Day 3: Finals & Pageant).
   - Specific bingo tiles are locked to designated days (`unlock_day`). Locked tiles display a padlock icon and countdown, preventing premature submissions while building anticipation for subsequent days.
3. **Slot Submission & In-Browser Optimization:**
   - Tapping an unlocked tile opens the camera/photo upload modal with task instructions.
   - **Client-Side 1080p WebP Downscaling:** Photos are resized and compressed in-browser before upload, keeping file sizes under ~200-300 KB to preserve mobile data and stay well within Neon's 5 GB storage tier.
   - On submission, the slot is marked **Completed** on the user's card and cross-posted to the live public feed.

### C. Verifiable Raffle Submission & Drawing System
1. **Line Completion Detection:**
   - The engine automatically checks for completed lines:
     - 3 Horizontal Rows
     - 3 Vertical Columns
     - 2 Diagonals
     - Full Card (Blackout bonus)
2. **"Submit Done" / Claim Raffle Action:**
   - When any valid line is achieved, the user receives an alert and can tap **"Submit Done & Claim Raffle Ticket"**.
   - The server validates that all 3 tasks in that line possess completed photo submissions.
3. **Unique Raffle ID Generation:**
   - Each approved line submission generates a unique, human-readable Raffle ID (e.g. `SK-RFL-78A42B`).
   - The user can view all their active Raffle IDs in their profile and dashboard ticket wallet.
4. **Live Draw Organizer Verification Panel (`/dev/raffle`):**
   - During the live stage raffle draw, organizers pick a winning Raffle ID.
   - Organizers enter the Raffle ID in the verification portal to instantly view:
     - Winning student's name, email, and college affiliation.
     - The exact line completed (row, column, diagonal).
     - The 3 uploaded photos side-by-side to verify valid selfies and task compliance.
   - Organizers click **"Verify & Award"** or **"Disqualify / Incomplete"** (with documented reason).

### D. Social Sharing & Story Export Templates
1. **Export Formats:**
   - **9:16 Vertical Story Template:** Tailored for Instagram Stories, Facebook Stories, and TikTok.
   - **1:1 Square Post Template:** Optimized for Instagram feed posts and profile carousels.
2. **Dynamic Canvas Rendering:**
   - Assembles the student's 3x3 photo thumbnails into a branded graphic.
   - Overlays official *Salingkusog* branding, user handle/alias, college insignia, and celebration badges (e.g., *"BINGO WINNER!", "Row 1 Complete"*).
   - 1-click "Download Story Image" or Web Share API trigger on mobile browsers.

### E. Moderation, RBAC & Safety (`/dev`)
1. **Accountability Model:**
   - Every upload and raffle entry is tied directly to the authenticated user's ID (`neon_auth.user`).
   - Public view supports pseudonyms ("Anonymous Tiger") to encourage participation, but backend logs retain real accounts to prevent abuse.
2. **Moderator Tools:**
   - `/dev`: System overview, diagnostics, and SuperAdmin role assignments.
   - `/dev/users`: User search, role filtering, and lazy loading.
   - `/dev/tools/storage`: Storage quota monitor, image optimizer testing, and bucket cleanup.
   - `/dev/raffle`: Realtime raffle lookup, line photo review, and winner validation.

---

## 3. System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Application                      │
│                                                                        │
│  • Public Event Dashboard & Realtime Photo Stream (src/app/page.tsx)   │
│  • Interactive 3x3 Bingo Grid with Day-Locking                         │
│  • Raffle Ticket Wallet & "Submit Done" Modal                          │
│  • Story Image Canvas Exporter (9:16 & 1:1)                            │
│  • Dev & Management Console (/dev, /dev/users, /dev/raffle)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Server Actions & Route Handlers                   │
│                                                                        │
│  • Neon Managed Better Auth Handshake (src/proxy.ts, src/lib/auth)     │
│  • Direct Image Upload & Magic-Byte Guard (src/app/actions/storage.ts) │
│  • Bingo Slot Submission & Cross-Posting Action                        │
│  • Line Completion Verification & Raffle ID Issuance Action            │
│  • Live Raffle Winner Lookup & Status Verification Action              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Neon Serverless Lakebase PostgreSQL                │
│                                                                        │
│  • neon_auth.user & neon_auth.session                                  │
│  • posts (image_url, user_id, caption, is_bingo_entry, status)         │
│  • bingo_tasks (slot_index [0..8], unlock_day, requires_selfie, ...)   │
│  • user_bingo_progress (user_id, task_id, post_id, completed_at)       │
│  • raffle_entries (raffle_code, user_id, line_type, line_index, ...)   │
│  • post_reactions (post_id, user_id, reaction_type)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Specification

### 1. `bingo_tasks`
```sql
CREATE TABLE bingo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index INT NOT NULL CHECK (slot_index >= 0 AND slot_index <= 8) UNIQUE, -- 3x3 grid (0 to 8)
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'spirit', -- 'spirit', 'sports', 'booth', 'culture'
  unlock_day INT NOT NULL DEFAULT 1, -- Day 1, Day 2, Day 3 of Intramurals
  requires_selfie BOOLEAN NOT NULL DEFAULT true, -- default requires user selfie
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2. `posts`
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  college_dept TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_bingo_entry BOOLEAN NOT NULL DEFAULT false,
  bingo_task_id UUID REFERENCES bingo_tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published', -- 'published', 'flagged', 'hidden'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_bingo ON posts(is_bingo_entry, bingo_task_id);
```

### 3. `user_bingo_progress`
```sql
CREATE TABLE user_bingo_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES bingo_tasks(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

CREATE INDEX idx_user_bingo_user ON user_bingo_progress(user_id);
```

### 4. `raffle_entries`
```sql
CREATE TABLE raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. 'SK-RFL-9B2F4A'
  user_id TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  line_type VARCHAR(20) NOT NULL, -- 'row', 'column', 'diagonal', 'blackout'
  line_index INT NOT NULL, -- 0..2 for rows/cols, 0..1 for diagonals, 0 for blackout
  task_ids UUID[] NOT NULL, -- the 3 tasks that form the winning line
  post_ids UUID[] NOT NULL, -- the 3 photo proof posts submitted
  status VARCHAR(20) NOT NULL DEFAULT 'valid', -- 'valid', 'verified', 'disqualified'
  disqualification_reason TEXT,
  verified_by TEXT REFERENCES neon_auth.user(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, line_type, line_index) -- prevents duplicate ticket submission for same line
);

CREATE INDEX idx_raffle_code ON raffle_entries(raffle_code);
CREATE INDEX idx_raffle_user ON raffle_entries(user_id);
CREATE INDEX idx_raffle_status ON raffle_entries(status);
```

### 5. `post_reactions`
```sql
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'fire', 'cheer', 'heart', 'trophy'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);
```

---

## 5. User Journey & Core Flows

```
[Unauthenticated Visitor]
         │
         ▼
  Home Dashboard (Preview Mode)
  • Event countdown & daily theme
  • Realtime campus photo stream preview
  • Activity counters & completed lines stats
         │
         │ [Google OAuth Login]
         ▼
[Authenticated Student]
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
   Live Feed Dashboard                          3x3 Bingo Grid View
   • Realtime uploads across campus             • 9 interactive tiles
   • Completed line celebration ticker          • Day-locked future slots (padlock)
   • Active college leaderboard                 • Unlocked daily challenges
         │                                              │
         │                                              ▼
         │                                      Tap Unlocked Tile
         │                                      • View selfie instructions
         │                                      • Snap/select photo
         │                                      • In-browser 1080p WebP compression
         │                                      • Upload to Neon Storage
         │                                              │
         │                                              ▼
         └────────────────────────────────────── Slot Marked Complete!
                                                • Cross-posted to Live Feed
                                                • Card updates with thumbnail
                                                        │
                                                        ▼
                                                Line Complete? (Row/Col/Diag)
                                                        │
                                                        ▼
                                                "Submit Done & Claim Raffle"
                                                        │
                                                        ▼
                                                Raffle ID Issued (e.g. SK-RFL-XXXXX)
                                                Saved in Student's Raffle Wallet
                                                        │
                                                        ▼
                                                Export & Share to Socials
                                                (9:16 IG/TikTok Story or 1:1 Post)
```

---

## 6. Live Raffle Draw & Verification Protocol

1. **The Draw:** During the official university stage program or live stream, the host draws a winning ticket code (e.g., via digital wheel or random selection of registered `raffle_code`s).
2. **Instant Lookup:** Event organizers input the code into `/dev/raffle`.
3. **Admin Verification Inspection:**
   - Displays student name, email, and timestamp of line completion.
   - Displays the 3 photos side-by-side that comprise the line.
   - Admin checks:
     - Is the user clearly visible in the selfie photos?
     - Does each photo satisfy the specific slot criteria?
4. **Resolution:**
   - If verified: Admin clicks **"Verify & Award"**, confirming the prize allocation in the audit record.
   - If fraudulent or invalid: Admin clicks **"Disqualify"**, records reason, and the host re-draws.
