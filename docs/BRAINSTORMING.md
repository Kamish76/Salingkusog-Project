# Salingkusog Freedom Board & Bingo — Brainstorming & Idea Canvas

This document captures creative concepts, user experience considerations, sample tasks, and engagement mechanics for the Salingkusog university intramurals platform.

---

## 1. The Core Engagement Loop

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Student Attends Intramurals Event (e.g. Volleyball Match)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Opens Salingkusog App & Checks Bingo Grid                    │
│    ("Cheer during match point" or "Photo with opposing team")   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Snaps Photo & Submits Slot Proof                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ Completes Bingo Slot         │        │ Automatically Posts to Wall  │
│ (Gets closer to BINGO!)      │        │ (Entire campus sees proof)   │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 2. Intramurals Bingo Task Ideas (Campus-Tested)

A standard **3x3 Grid (9 slots)** or **4x4 Grid (16 slots)** allows everyone to participate, including athletes, spectators, faculty, and student organizers.

### Recommended 3x3 Grid Configuration (High Completion Rate)
| Slot | Category | Challenge Name | Challenge Description |
|:---:|:---|:---|:---|
| **1** | School Spirit | *Parade of Champions* | Snap a photo of the opening parade or your college banner |
| **2** | Food & Booths | *Fuel Up* | Photo of your favorite snack or drink from the student food stalls |
| **3** | Athletic Energy | *Game Point Moment* | Photo watching any live match (basketball, volleyball, football, etc.) |
| **4** | Pep & Cheering | *Loud & Proud* | Photo of you or friends holding cheer clappers or wearing team colors |
| **5** | **FREE SPACE / Core** | *I Am Here!* | Selfie anywhere in the intramurals grounds / sports complex |
| **6** | Sportsmanship | *Rivals & Friends* | Photo with a student or athlete from a rival college team |
| **7** | Culture & Arts | *Glam & Groove* | Snap the cheer dance competition or Mr. & Ms. Salingkusog pageant |
| **8** | Campus Mascot | *Catch the Mascot* | Selfie with the university mascot or college mascot |
| **9** | Celebration | *Victory Pose* | Photo celebrating after an event or awards ceremony |

---

## 3. Anonymity vs. Accountability Model

A major challenge with university "Freedom Walls" is preventing cyberbullying, profanity, and offensive imagery while preserving the fun, open atmosphere students love.

### The Hybrid Solution
1. **Public View:**
   - The public sees: *"Anonymous Cheetah"* or *"Anonymous Student [College of Science]"* + photo + caption.
   - Or, if toggled off: *Full student name + Google profile avatar*.
2. **Backend Protection:**
   - Every post is strictly bound to `user_id` (Google OAuth email).
   - If an inappropriate or non-consensual image is posted, moderators in `/dev` can see the student email immediately and delete/ban within seconds.
3. **Pre-Submission Warning Banner:**
   - *"Your post will appear anonymously to other students. However, your university account is linked internally to ensure a safe, friendly intramurals environment."*

---

## 4. Engagement & Reward Mechanics

How to get thousands of students to participate:

1. **Raffle Tickets for Lines:**
   - Complete 1 Line (Horizontal, Vertical, Diagonal) = 1 Raffle Entry.
   - Complete Full Card (Blackout) = 5 Bonus Raffle Entries + Exclusive Digital "Salingkusog Master" Finisher Badge.
2. **College Spirit Leaderboard:**
   - Track which college/department has submitted the most total Bingo proofs and Freedom Board cheers.
   - Live banner: *"College of Engineering is in the lead with 342 Bingo proofs!"*
3. **On-Site QR Codes:**
   - Print banners with QR codes at high-traffic spots (gymnasiums, grandstands, concessionaires).
   - QR code instantly opens the upload screen or Freedom Board on mobile browsers.

---

## 5. Potential Pitfalls & Mitigation Strategies

| Risk | Mitigation |
|:---|:---|
| **Slow mobile loading in crowded gym** | Automatic client-side image compression (down to < 1MB WebP) before upload; thumbnail lazy loading with Next.js Image. |
| **Fake or Duplicate Proofs** | Require camera capture option on mobile; allow community reporting / flagging on suspicious submissions. |
| **Offensive or Inappropriate Photos** | SuperAdmin & Admin instant-hide panel in `/dev`; real user account linked to every upload. |
| **Storage cost / limit** | Use Neon Object Storage bucket or Cloudflare R2 / S3 with standard image retention policies. |
