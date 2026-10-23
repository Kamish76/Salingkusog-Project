# Salingkusog Freedom Board, 3x3 Bingo & Raffle — Brainstorming & Idea Canvas

This document captures creative concepts, user experience considerations, sample tasks, multi-day scheduling, and social sharing mechanics for the Salingkusog university intramurals platform.

---

## 1. The Core Engagement Loop

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Student Attends Intramurals Event (e.g. Volleyball Match)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Opens Salingkusog App & Views 3x3 Bingo Grid                 │
│    (Checks unlocked Day 1/Day 2 tasks & selfie instructions)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Takes Selfie Proof & Submits to Unlocked Slot                │
│    (Downscaled to 1080p WebP in browser -> Neon Storage)        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ Slot Marked Completed        │        │ Automatically Cross-Posted   │
│ (Displays photo on card)     │        │ to Realtime Home Feed        │
└───────────────┬──────────────┘        └──────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Completes Row, Column, or Diagonal                           │
│    • Taps "Submit Done"                                         │
│    • Receives Unique Raffle ID (e.g., SK-RFL-78A42B)            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Exports 9:16 Story Template to Instagram / TikTok / Facebook │
│    • Drives campus virality and inspires other students to join │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Recommended 3x3 Multi-Day Bingo Configuration

A **3x3 Grid (9 slots total)** is compact, achievable for students during a fast-paced sports festival, and provides high completion rates without fatigue.

### Selfie-First Rule
> **Default Criterion:** Unless a task explicitly specifies otherwise, **every submission photo must be a selfie showing the student's face** in the context of the activity. This prevents downloading images from the internet or re-using friends' photos.

### Sample Multi-Day Schedule & Task Breakdown

| Slot # | Day Lock | Category | Task Name | Task Description & Photo Criterion |
|:---:|:---:|:---|:---|:---|
| **0 (Top-Left)** | **Day 1** | Spirit | *Parade of Champions* | **Selfie** marching with your college or cheering during the opening parade ceremonies. |
| **1 (Top-Mid)** | **Day 1** | Food & Concessions | *Campus Fuel* | **Selfie** enjoying a snack, meal, or cooler drink from the student council concession booths. |
| **2 (Top-Right)** | **Day 1** | School Pride | *Colors of Glory* | **Selfie** sporting your college team jersey, team face paint, or cheer headband. |
| **3 (Mid-Left)** | **Day 2** | Sportsmanship | *Rivals & Friends* | **Selfie** alongside an athlete or student from a competing rival college. *(Good sportsmanship!)* |
| **4 (Center)** | **Day 1** | Core Check-In | *I Am Here! (Free Slot)* | **Selfie** anywhere inside the main university sports complex / grandstand. |
| **5 (Mid-Right)** | **Day 2** | Ball Games | *Game Point Hype* | **Selfie** in the bleachers/stands with live action of an ongoing ball game (basketball, volleyball, etc.). |
| **6 (Bot-Left)** | **Day 3** | Culture & Pageant | *Glam & Groove* | **Selfie** watching the cheer dance competition, street dance, or Mr. & Ms. Salingkusog pageant. |
| **7 (Bot-Mid)** | **Day 2** | Mascot & Spirit | *Mascot Spotting* | **Selfie** with any college or university mascot, or holding a giant college cheer flag. |
| **8 (Bot-Right)** | **Day 3** | Grand Finale | *Victory Roar* | **Selfie** celebrating at the championship medal ceremonies, awarding, or closing concert. |

---

## 3. Raffle Ticket Mechanics & Line Completion Rules

### Line Combinations in 3x3 Grid
In a 3x3 grid, there are **8 possible winning lines**:
- **3 Rows:**
  - Row 1: Slots `[0, 1, 2]`
  - Row 2: Slots `[3, 4, 5]`
  - Row 3: Slots `[6, 7, 8]`
- **3 Columns:**
  - Column 1: Slots `[0, 3, 6]`
  - Column 2: Slots `[1, 4, 7]`
  - Column 3: Slots `[2, 5, 8]`
- **2 Diagonals:**
  - Diagonal 1 (Top-Left to Bot-Right): `[0, 4, 8]`
  - Diagonal 2 (Top-Right to Bot-Left): `[2, 4, 6]`
- **Optional Bonus:** Full Card (Blackout - all 9 slots completed).

### The "Submit Done" & Verification Protocol
1. **User Action:**
   - As soon as all 3 slots of any line are completed, the UI lights up with a celebration badge and activates the **"Claim Raffle Ticket"** button for that specific line.
   - User submits, and the server generates an authoritative `raffle_code` (e.g. `SK-RFL-4X91PA`).
   - A user can earn multiple raffle tickets (e.g., Row 1 + Column 1 = 2 separate Raffle IDs), rewarding active multi-day participation.
2. **Anti-Duplication:**
   - The database constraint `UNIQUE(user_id, line_type, line_index)` ensures a user cannot submit the same line multiple times.
3. **Live Raffle Draw Verification:**
   - On the grandstand stage, the MC spins the digital raffle wheel or draws a `raffle_code`.
   - The admin opens `/dev/raffle`, enters the code, and reviews the 3 selfie photos on a big screen or tablet.
   - If the selfies clearly depict the student user fulfilling each challenge, the prize is awarded on stage. If non-compliant (e.g., random internet memes or black screens), the ticket is disqualified with 1 click and a new ticket is drawn.

---

## 4. Realtime Home Dashboard Features

1. **Unauthenticated Public Preview:**
   - Visual teaser of the campus event.
   - Realtime feed showing thumbnail snippets of recent uploads.
   - Global activity counters: *"1,420 Photos Uploaded · 380 Raffle Tickets Earned · 6 Colleges Competing"*.
   - Quick Google OAuth button to participate immediately.
2. **Authenticated Student Dashboard:**
   - **Interactive 3x3 Bingo Card:** Instant view of your personal board with photo thumbnails for completed slots, padlock icons for future-day tasks, and click-to-upload for active unlocked tasks.
   - **Realtime Upload Stream:** Live masonry feed updating as students post photos across the university.
   - **Celebration Ticker:** Live ticker showing line completions:
     - *"⚡ John Doe completed Column 3 (Raffle #SK-RFL-810A) · 2m ago"*
     - *"🔥 Sarah L. completed Row 1 (Raffle #SK-RFL-928B) · 5m ago"*
   - **Participant Highlight Spotlight:** Rotating spotlight of standout submissions and active spirit leaders.

---

## 5. Social Sharing & Story Export Templates

To make Salingkusog viral on social media:
1. **Instagram & TikTok Story Template (9:16 Vertical):**
   - Header: Vibrant Salingkusog 2026 header banner with college badge.
   - Body: Clean, styled 3x3 grid displaying the user's uploaded photos with small completed badges on each slot.
   - Footer: User handle / alias, earned Raffle ID counter, and QR code pointing to the app.
   - Ready for 1-tap download or Web Share API.
2. **Facebook & Feed Post Template (1:1 Square):**
   - Compact 3x3 photo collage surrounded by official university colors and a bold "BINGO!" stamp over completed lines.
   - Perfect for Instagram carousels and Facebook timeline posts.
3. **Implementation Strategy:**
   - Render in-browser using HTML5 `<canvas>` (or SVG-to-Canvas).
   - Zero external third-party dependencies required.
   - Direct download as high-res PNG (`salingkusog-bingo.png`) or direct share to Instagram / Messenger via `navigator.share`.
