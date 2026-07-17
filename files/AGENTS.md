# AGENTS.md

## Project
Burn-Ex — AI-based calorie estimation from pose/motion data, self-generated dataset,
no external fitness APIs. See PRD.md for product context, KNOWLEDGE.md for
architecture, GUARDRAILS.md for hard constraints, INSTRUCTIONS.md for build order.

## Tech Stack

### ML / CV core (unchanged — do not swap these mid-hackathon)
- **Language**: Python 3.10+
- **Computer vision**: OpenCV, MediaPipe (Pose)
- **Data handling**: pandas
- **Modeling**: scikit-learn (RandomForestRegressor as the baseline model)
- **Optional**: matplotlib, only if generating an accuracy chart for the demo/pitch

### Backend API (serves the ML pipeline to the frontend)
- **Flask** with a small REST/JSON API layer (e.g. `/predict`, `/session`, `/avatar-state`)
  — keep this thin; it's a wrapper around the Python ML scripts, not new logic
- **WebSocket or Server-Sent Events** for streaming live pose/calorie updates to the
  frontend during a workout, so the UI updates in real time rather than polling
  (use `flask-socketio` if going this route — confirm with the user before adding it,
  per the "no new major dependency without flagging" rule)

### Frontend (this is where "ambient, neat, judge-attracting" polish lives)
- **React** (via Vite, not Create React App — faster dev server, less setup friction)
- **Tailwind CSS** for fast, clean styling under time pressure
- **Framer Motion** for the avatar animation / level-up transitions and other
  micro-interactions (this is what sells the "ambient, alive" feel to judges)
- Talks to the Flask backend over the REST/WebSocket API above — do not have the
  frontend call MediaPipe/sklearn directly

### Data persistence (for streaks, session history, avatar state)
- **SQLite** for the hackathon build — zero setup, file-based, good enough for a demo
  and judged environment (do not reach for Postgres/cloud DB under this time pressure
  unless a teammate already has one running)

### Stack decision rule
Pick this full stack now and commit — do not switch frameworks mid-build. If frontend
setup stalls badly (e.g. React tooling breaks with no time to debug), the fallback is
a single Flask template page with vanilla JS + Tailwind CDN — still styled, still
smooth, just less componentized. Decide this fallback trigger point in advance
(e.g. "if frontend isn't rendering by [time], fall back") rather than deciding under
panic.

## Coding Conventions
- Keep scripts modular and single-purpose: one script per pipeline phase
  (extract_features.py, build_dataset.py, train_model.py, app.py) rather than one
  monolithic file — this matches the phased build order in INSTRUCTIONS.md and
  makes it easy to debug which phase broke.
- Use plain, readable pandas/sklearn code over clever one-liners — this is a live
  demo project; the team needs to be able to explain any line if a judge asks.
- All file paths should be relative to the project root, not hardcoded absolute
  paths, so the project runs on any teammate's machine.
- Every script should run standalone from the command line with clear print
  statements showing progress (e.g. "Extracted features from clip 3/12") — useful
  both for debugging and for showing judges the pipeline working.

## Hard Rules
- Follow every constraint in GUARDRAILS.md without exception.
- Do not install or introduce packages outside the Tech Stack list above without
  checking with the user first.
- Do not proceed to the next build phase (per INSTRUCTIONS.md) until the current
  phase has been run against real data and visually confirmed working.
- Do not invent MET values, dataset labels, or feature formulas — source them from
  KNOWLEDGE.md or ask the user.

## Workflows

### Setting up the environment
1. Confirm `python3 --version` and `pip --version` work
2. Create `requirements.txt` listing the Tech Stack packages
3. `pip install -r requirements.txt`

### Adding a new feature to the extraction pipeline
1. Update `extract_features.py` to compute the new feature
2. Re-run `build_dataset.py` to regenerate the CSV with the new feature column
3. Re-run `train_model.py` — do not reuse a model trained on the old feature schema

### Debugging a broken pipeline stage
1. Re-run only the failing script in isolation with a single known-good clip
2. Print intermediate outputs (keypoints, feature row) rather than guessing
3. Do not move to the next phase until the current one prints sane values

### Preparing for demo
1. Run the full pipeline once end-to-end on a clean clip before the judged demo slot
2. Confirm the "no pose detected" fallback state works (test by stepping out of frame)
3. Have a pre-recorded fallback video ready in case live webcam fails in the demo room
