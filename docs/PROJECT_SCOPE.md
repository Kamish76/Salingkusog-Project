# Salingkusog Freedom Board & Bingo Challenge — Project Scope

**Project Name:** Salingkusog Freedom Board & Intramurals Bingo  
**Target Event:** University Intramurals ("Salingkusog")  
**Target Audience:** University Students, Faculty, Alumni, Student Athletes, and Campus Visitors  
**Repository:** `Salingkusog-Project`  
**Core Technologies:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Neon Serverless PostgreSQL, Neon Managed Better Auth, Neon Object Storage  

---

## 1. Executive Summary

During the university intramurals (*Salingkusog*), campus energy is at its peak. However, student photos and memories are often fragmented across private social media stories or group chats. 

The **Salingkusog Freedom Board** is a centralized, live digital campus wall paired with an interactive **Intramurals Bingo System**.
- **Public Freedom Wall:** Anyone (authenticated or guest) can view the live photo wall.
- **Controlled Posting:** To post images or text, students authenticate (via Google OAuth / university email).
- **Public Anonymity with Accountable Moderation:** Users can choose to publish anonymously or with an alias, but their identity is preserved in backend audit logs for anti-abuse and content moderation.
- **Intramurals Bingo Gamification:** A dynamic Bingo card containing intramural-themed campus challenges. Completing a task requires uploading photo proof to that specific slot. Every approved task proof automatically cross-posts to the public Freedom Board tagged with the completed challenge, driving high student engagement across all days of the event.

---

## 2. Core Feature Pillars

### A. Public Freedom Board (Feed)
1. **Unrestricted Viewing:** Instant public access without mandatory login; fast-loading, mobile-optimized masonry or grid gallery.
2. **Authenticated Uploads:** Users must log in via Google OAuth to upload photos.
3. **Posting Modes:**
   - **Anonymous / Pseudonymous Post:** Displays as "Anonymous Tiger / Student" or custom alias on the public feed.
   - **Attributed Post:** Displays user name/avatar and optional college/department badge.
4. **Feed Filters & Navigation:**
   - Filter by: `All Entries`, `Bingo Proofs`, `General Shoutouts`, `By College/Team`.
   - Sorting by: `Latest`, `Most Liked / Cheered`.
5. **Reactions & Engagement:** Lightweight campus cheer reactions (e.g., 🔥 Fire, 👏 Clap, 🏆 Trophy, 💙 College Pride).

### B. Salingkusog Bingo Challenge System
1. **Interactive Bingo Card (3x3 or 4x4 Grid):**
   - Each tile represents an intramurals task (e.g., "Selfie with College Mascot", "Photo cheering at basketball finals", "Snack at student council booths").
   - Center tile can be a "Free Space" or "Opening Parade Participation".
2. **Slot Proof Submission Flow:**
   - Tapping an incomplete tile opens the challenge details and upload form.
   - User snaps/uploads a photo and adds an optional caption.
   - On submission, the slot is marked **Completed** on the user's card.
3. **Automated Cross-Posting:**
   - The uploaded slot proof is automatically published to the public Freedom Board with a special badge (e.g., `🎯 Bingo Challenge: [Task Title]`).
4. **Gamification & Rewards:**
   - Detection of completed lines (horizontal, vertical, diagonal) triggers celebration effects (confetti).
   - Milestone badges (e.g., "1 Line Complete", "Double Bingo", "Blackout Champion").
   - Potential linkage to university raffle entries or souvenir redemption at the student council booth.

### C. Admin & Moderation Controls (`/dev`)
1. **Role-Based Access Control (RBAC):**
   - `superadmin` / `admin`: Able to hide or delete inappropriate photos, view the real account behind an anonymous post, and modify active Bingo tasks.
   - `developer`: Access to system diagnostics, storage health, and database metrics.
   - `user`: Standard access to personal Bingo card and Freedom Board.
2. **Audit & Safety Boundary:**
   - Real `user_id` stored for every post.
   - Rapid 1-click takedown / hide mechanism for inappropriate content.

---

## 3. System Architecture & Data Model

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js 16 Frontend                      │
│  • Public Freedom Board (Masonry Feed + Lightbox)                │
│  • Interactive Bingo Board Grid & Task Upload Modals             │
│  • User Profile & Progress Bar                                   │
│  • Admin Moderation Table (/dev)                                 │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js API & Server Actions                 │
│  • Session Verification (Neon Managed Better Auth)               │
│  • Direct Image Upload Handler (Neon Object Storage / S3)        │
│  • Post Creation & Bingo Slot Validation Action                  │
│  • Reaction & Feed Retrieval Actions                             │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Lakebase PostgreSQL (Neon Serverless)           │
│  • posts (id, user_id, is_anonymous, image_url, caption, ...)   │
│  • bingo_tasks (id, title, description, icon, slot_index)        │
│  • bingo_submissions (id, user_id, task_id, post_id, completed)  │
│  • post_reactions (post_id, user_id, reaction_type)              │
│  • neon_auth.user & neon_auth.session                            │
└──────────────────────────────────────────────────────────────────┘
```

### Proposed Database Schema

#### 1. `posts`
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT, -- e.g. "Anonymous Green Viper" or custom alias
  college_dept TEXT, -- optional college affiliation
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
```

#### 2. `bingo_tasks`
```sql
CREATE TABLE bingo_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index INT NOT NULL UNIQUE, -- 0 to 8 (3x3) or 0 to 15 (4x4)
  title VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'sports', 'culture', 'booth', 'spirit'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 3. `user_bingo_progress`
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

#### 4. `post_reactions`
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

## 4. Key Functional Constraints & Boundaries

1. **Guest Browsing vs. Authenticated Posting:**
   - Unauthenticated visitors can view all published posts and the global leaderboard/bingo challenges.
   - Tapping "Upload", "Post", or "Submit Bingo Slot" prompts immediate sign-in via Google OAuth with seamless redirect back to the action.
2. **Image Storage Constraints:**
   - Max file size: 5MB to 8MB per image.
   - Client-side pre-upload image compression (WebP / JPEG conversion) to save mobile bandwidth on campus Wi-Fi.
3. **Safety & Zero-Tolerance Harassment:**
   - All posts require an active Google OAuth account behind them. Even if labeled "Anonymous" to public viewers, system moderators can view the underlying user ID and email to enforce university campus conduct guidelines.
