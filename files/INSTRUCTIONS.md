# INSTRUCTIONS.md — Agent Roles & Goals

## Purpose
This file defines what the coding agent (Antigravity) is responsible for building,
in what order, and what "done" looks like at each stage. Refer to PRD.md for product
context and AGENTS.md for tech stack / hard rules before writing code.

## Primary Goal
Build a working end-to-end pipeline: recorded/live video → pose features → calorie
estimate, demoable live on a webcam, within a single hackathon session.

## Build Order (do not skip ahead — each phase depends on the last)

### Phase 1 — Feature extraction script
- Input: a video file path
- Output: one row of features (rep count, avg movement speed, range of motion,
  duration) using MediaPipe Pose keypoints
- Goal: run this against one real recorded clip and get sane, non-null numbers out

### Phase 2 — Dataset assembly script
- Input: a folder of labeled clips (exercise type + performer weight in filename or
  a companion CSV — confirm format with the user, do not assume)
- Output: a single CSV with one row per clip: features + MET-derived calorie label
- MET values must come from the MET reference table the user provides — do not
  invent MET values

### Phase 3 — Model training script
- Input: the CSV from Phase 2
- Train/test split, train a RandomForestRegressor, print basic error metrics
  (e.g. MAE) so the user can sanity-check before the demo
- Save the trained model to disk for reuse in the live demo

### Phase 4 — Live demo app
- Flask (or Streamlit) app
- Webcam feed with pose overlay rendered live
- Runs the same feature-extraction logic from Phase 1 on a rolling window of frames
- Loads the trained model from Phase 3 and displays a live calorie estimate
- Must not crash on a missing/undetected pose — handle gracefully (e.g. "no person
  detected" state)

### Phase 5 — Avatar / motivation layer (only after Phase 4 works)
- Simple sprite-swap logic based on workout session count / streak thresholds
  (exact thresholds: [PLACEHOLDER — user to define, e.g. every 3 sessions])
- UI copy must be framed as illustrative/motivational, not a literal predictive claim
  about the user's future body (see PRD.md Non-Goals)

## Definition of Done (per phase)
A phase is done when it runs successfully against real recorded data (not synthetic
placeholder data) and the user has visually confirmed the output looks correct.

## When Uncertain
If a required input (MET values, dataset format, weight data, avatar thresholds) is
missing, stop and ask the user rather than inventing a placeholder value and
proceeding silently.
