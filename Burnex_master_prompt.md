# THE SYSTEM — Master Build Prompt for Antigravity
### An AI-Powered Calorie Estimation Platform with RPG Progression Layer

> **Scope note for the builder:** The calorie estimation engine is the product. Every other system in this document — RPG progression, companion, HUD styling — exists to make people trust and keep using the calorie engine. If a feature listed below doesn't ultimately serve "the user understands and trusts their calorie burn better," cut it or simplify it. Do not let progression/gamification scope grow beyond what supports the core estimation experience.

---

## 1. Product Vision

### 1.1 What this actually is
THE SYSTEM is a computer-vision-based calorie estimation application. A user performs a physical activity in front of a camera; the system tracks their body via pose estimation, derives motion-quality features (not just "which exercise is this"), and produces a calorie-burn estimate with an honest confidence range — not a fake-precision single number. Everything else in the product (levels, companion, HUD visuals) is a motivational wrapper around this core loop: **move → get tracked → get an honest, explainable calorie estimate → understand how to improve it.**

### 1.2 Why this differs from existing calorie trackers
Most fitness apps either (a) pull numbers from a wearable API, or (b) apply a flat MET-table lookup keyed only to activity type ("running = 8 METs, done"). Neither reflects the actual person moving in front of the camera. THE SYSTEM's differentiation:

- **Movement-quality-adjusted estimation**: intensity is derived from observed motion (range of motion, joint velocity, movement variance/sloppiness), not assumed from activity label alone.
- **Form affects the number**: a full-depth squat and a half-depth squat at the same rep count produce different calorie estimates, and the app shows the user why.
- **Honest uncertainty**: outputs are ranges with a confidence label ("180–240 kcal, medium confidence") plus a one-line explanation of what would tighten the estimate (better lighting, side-angle camera, more consistent pacing).
- **On-device, privacy-first**: frames are processed locally; only derived pose keypoints/features are retained, never raw video, and this is shown to the user explicitly in-app rather than buried in a settings page.

### 1.3 Emotional design goal
The user should feel like they are being coached by something that is honest with them rather than flattering them. The RPG/companion layer exists to make "your form was sloppy so your calorie estimate is lower" feel like useful feedback from an ally, not a scolding — never to inflate numbers or hide uncertainty for the sake of a bigger dopamine hit.

### 1.4 Motivation & retention strategy (kept subordinate to the estimation engine)
- **Visible improvement loop**: because the estimate is form-sensitive, a user who improves their form literally sees their numbers change — the progression system should visualize "calorie efficiency" trending up over sessions, not just cumulative totals.
- **Session streaks and companion evolution** exist to bring users back daily, but every level-up or evolution moment should be tied to an estimation-relevant milestone (e.g., "10 sessions with consistent form" rather than an arbitrary XP threshold), so gamification reinforces good movement rather than being disconnected fluff.
- Habit formation should rely on: (1) a short, low-friction session start (under 10 seconds from open-app to camera-tracking-live), (2) an end-of-session summary that always includes one specific, actionable form/estimation insight, and (3) a lightweight streak indicator that doesn't punish missed days harshly (no guilt-based red streak-loss UI).

---

## 2. Information Architecture

### 2.1 Screen inventory
1. **Onboarding** — camera permission, brief privacy explainer (on-device processing), optional weight/height input (used only for MET-based calorie math, stored locally), pick a starting companion look.
2. **Home / Dashboard** — today's estimated calories, streak, quick-start session button, companion display, last-session summary card.
3. **Session Setup** — pick exercise(s) from the supported set, camera framing check ("step back until your full body is in frame" with a live bounding-box indicator), lighting check.
4. **Live Session (core screen)** — camera feed with pose-skeleton overlay, live rep counter, live intensity/form indicator, running calorie estimate (shown as a live range, not a fixed number, updating as confidence improves).
5. **Session Summary** — final calorie range + confidence label, breakdown by exercise, one explicit form-quality insight ("your squat depth was inconsistent — deeper reps burn more"), rep counts, session duration.
6. **History** — list of past sessions, each showing exercise type, calorie range, and form-quality score; simple trend line of estimated calorie-efficiency over time.
7. **Companion Screen** — current evolution stage, progress toward next stage tied to estimation-consistency milestones, idle animation.
8. **Settings** — body metrics, privacy/data explainer (re-shown, not just onboarding-only), camera troubleshooting, data export/delete.

### 2.2 Core user journey (must be frictionless)
Open app → Home → tap "Start Session" → Session Setup (camera framing, ~10s) → Live Session → Session Summary → back to Home. Any redesign must not add steps to this path; if a proposed UI improvement adds a screen, justify why or cut it.

### 2.3 States to design explicitly
- **Empty state (History, first run)**: no sessions yet — show a single sample session card explaining what the data will look like, not a blank void.
- **Loading state (pose model initializing)**: show a short, honest loading message ("Loading pose tracking…"), never a fake progress bar that doesn't reflect real load time.
- **Low-confidence state (bad lighting/framing)**: explicit, non-punitive prompt ("I can't see your full body clearly — step back or adjust lighting") rather than silently producing a bad estimate.
- **Error state (camera permission denied / no camera)**: clear recovery path, link to how to re-enable permission.
- **Onboarding exit / skip**: allow skipping body-metric input, but clearly state that skipping reduces calorie-estimate accuracy (fall back to a default weight bucket).

---

## 3. UI System

### 3.1 Visual direction
Dark, futuristic HUD-inspired interface — angular panels, thin glowing borders, occasional scan-line or particle accents — but restrained enough that the live camera feed and pose overlay (the actual functional core) are never visually competed with. The HUD styling should never obscure the calorie number, the confidence label, or the pose skeleton.

### 3.2 Design tokens (example starting values; Antigravity may refine)
- **Background**: near-black charcoal (#0B0D10) base, secondary panel surface slightly lighter (#14171C)
- **Primary accent**: ember-orange (#FF6A2C), used sparingly — companion glow, active-state highlights, the live calorie number
- **Secondary accent**: cool cyan (#3FD0FF) for tracking/pose-overlay lines, kept visually distinct from the orange "calorie/energy" accent so users don't confuse tracking-status color with calorie-status color
- **Typography**: a clean geometric sans for numbers/data (calorie counts, confidence %), a slightly more humanist sans for coaching copy/insights — numbers should never use a "gamer" display font that hurts legibility
- **Spacing/grid**: 8px base unit, angular panel corners (clipped corners, not full rectangles) but generous internal padding so data isn't cramped
- **Motion**: panel transitions are fast (150–250ms) and directional (slide/fade), reserving slower glow/particle animation exclusively for companion and level-up moments — never on data-bearing elements like the live calorie readout, which should update smoothly but promptly (no artificial delay for "drama")

### 3.3 Accessibility requirements
- Confidence/uncertainty must never be conveyed by color alone — always paired with text label ("medium confidence")
- Minimum 4.5:1 contrast for all calorie/data text against its background
- Pose overlay must have a toggle to hide it (some users find skeleton overlays visually distracting) without losing the calorie estimate
- All live-session audio/haptic cues (e.g., rep-count chime) must have a mute option

---

## 4. Calorie Estimation Engine (core system — most detail belongs here)

### 4.1 Pipeline
1. **Pose extraction**: MediaPipe Pose (or equivalent) extracts joint keypoints per frame from the live camera feed, entirely on-device.
2. **Feature derivation per rep/window**:
   - Range of motion (joint-angle delta, e.g. hip-knee angle swing for squats)
   - Joint velocity and acceleration (movement speed)
   - Movement variance ("sloppiness" — inconsistency across reps)
   - Rep count via peak detection on the relevant joint-angle signal
   - Activity classification (which exercise is being performed, from the supported set)
3. **Ground-truth-anchored regression**: a simple, explainable regressor (Random Forest or similar — deliberately not a black-box deep net, so it can be described to a judge or user in one sentence) maps `(activity type, derived motion features, user weight, duration)` → calorie estimate. MET-value tables (publicly documented, e.g. squats ≈ 3.5 MET baseline, jumping jacks ≈ 8 MET, burpees ≈ 10 MET) anchor the baseline; the regression adjusts around that baseline using the motion-quality features rather than replacing it outright.
4. **Confidence estimation**: confidence is derived from tracking quality signals — how much of the body was visible/occluded, frame rate stability, keypoint-detection confidence scores from the pose model itself — and expressed as a range and a plain-language label, never a bare single number.
5. **Output**: live-updating range during the session; final range + label + one plain-language driver of uncertainty at session end ("estimate would tighten with a side-on camera angle").

### 4.2 Supported exercise set (v1)
Squats, jumping jacks, push-ups, marching/walking-in-place, and (stretch) burpees or high-knees. Keep this list small and well-tuned rather than broad and shallow — a judge/user should see each exercise handled with visible care (correct joint-angle logic per exercise) rather than a generic "any activity" claim that isn't backed by per-exercise tuning.

### 4.3 What must NOT happen
- No silent fallback to a flat MET-only number when pose tracking is degraded — the app must say so.
- No fabricated precision ("You burned exactly 214 kcal") — always range + confidence.
- No raw video leaving the device and no raw video persisted to disk; only derived keypoints/features are stored, and this must be visibly true in the implementation, not just stated in copy.

---

## 5. RPG Progression Layer (subordinate wrapper, not the product)

Every progression element below must map to an estimation-related behavior. Do not introduce XP, currency, or unlocks that are disconnected from actual sessions, form quality, or estimation consistency.

- **XP** — earned per completed session, scaled slightly by form-quality score (encourages good movement, not just app-opening)
- **Levels/Ranks** — cosmetic titles only ("Novice" → "Elite"), gate nothing about the estimation engine itself
- **Streaks** — consecutive days with at least one tracked session; missed-day UI is neutral, not punitive
- **Companion evolution** — see Section 6; tied to session-count and form-consistency milestones, not raw time-in-app
- **Session history trend** — the closest thing to a "stat" that matters: a simple line showing estimated calorie-efficiency (calories per unit of consistent effort) over time, so improvement is visible and honest
- Explicitly **out of scope for v1**: loot boxes, in-app currency shops, boss battles, seasonal events, skill trees, PvP/leaderboards against other users. These add surface area without supporting the calorie-estimation core and should be left out unless the person explicitly asks to add them back in later.

---

## 6. Companion — "The Ember"

Original, non-copyrighted evolving fighter-mascot design (full spec below), used as the emotional face of the app's coaching moments. The companion:

- Reacts to session-summary insights (e.g., subtly more "energized" animation after a session with consistent form), not to arbitrary session count alone
- Never celebrates a bad-form session as if it were a good one — its "hype" animations are reserved for genuine form/consistency milestones
- Has 3 evolution stages, each with idle animation, a level-up transition, and a small set of short motivational lines tied to real feedback (e.g., "Your depth was solid today" rather than generic hype text)

### 6.1 Visual design (consistent across stages)
Flat 2D vector illustration, bold clean outlines, transparent background, charcoal/gray base body with a single evolving orange "ember" accent representing inner energy — deliberately simple so it renders well at small HUD sizes and animates cheaply.

**Stage 1 — Novice**: hunched, tentative stance, thin build, faint dim ember glow at chest, muted low-contrast palette.
**Stage 2 — Rising**: upright athletic ready-stance, visible muscle definition, brighter glowing chest core, orange accent trim at wrists/ankles.
**Stage 3 — Elite**: dynamic mid-action pose, strong defined build, full bright chest aura with light spilling onto outline edges, subtle spark/particle effects.

Animation notes: slow breathing-scale idle pulse (~3s loop) at all stages; glow-pulse timing/brightness increases with stage; level-up transition is a brief (~600ms) scale/flash with color shift. No stage evolution should ever fire from time-in-app alone — always from a real session/form milestone.

---

## 7. Live Workout Experience (screen-level detail)

- Camera feed with toggleable pose-skeleton overlay (cyan lines/dots), visible before "Start" is even pressed so tracking is transparent from the first moment
- Live rep counter, updating per detected rep
- Live form/intensity indicator — a simple, non-alarming visual (e.g., a small bar or ring) reflecting current movement-quality signal, not a harsh red/green pass-fail
- Live calorie estimate shown as a range that narrows as more reps/data accumulate within the session, with the current confidence label always visible alongside it
- End-of-session transition into Session Summary should be quick and should always surface exactly one specific, actionable insight — never a vague "great job!" alone

---

## 8. Data & Privacy Presentation

- Onboarding must state, in plain language, that video is processed on-device and not uploaded; this should be repeated (not hidden) in Settings
- A visible, persistent "Model: Active" indicator during live sessions confirms to the user (and to anyone watching, e.g. hackathon judges) that estimation is genuinely running locally, not mocked
- Data export/delete option in Settings for any locally stored session history

---

## 9. Explicit Build Priorities for Antigravity

When time or scope is constrained, prioritize in this order:
1. Calorie estimation pipeline works end-to-end and shows an honest range + confidence label
2. Live pose overlay + rep counting is visibly accurate and responsive
3. Session summary surfaces one real, specific form/estimation insight per session
4. Companion evolution and HUD polish
5. Everything else in Section 5 (broader RPG systems) — only after the above four are solid

Do not let HUD visual polish, companion animation richness, or progression-system breadth grow at the expense of items 1–3. If a proposed feature doesn't make the calorie estimate more accurate, more explainable, or more trustworthy, treat it as optional polish, not core scope.
