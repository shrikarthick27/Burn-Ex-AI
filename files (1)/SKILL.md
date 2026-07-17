---
name: burnex-pipeline
description: Build and run the Burn-Ex pose-based calorie estimation pipeline — extracting movement features from exercise videos via MediaPipe, assembling a labeled training dataset using MET-based calorie labels, and training a scikit-learn model to predict calories from movement quality. Use this skill whenever working on Burn-Ex's data pipeline, feature extraction, dataset assembly, or model training — including debugging any of the three stages, adding a new exercise type, or wiring the trained model into the live demo app.
---

# Burn-Ex Pipeline Skill

This skill covers the offline ML pipeline for Burn-Ex: turning recorded exercise
clips into a trained calorie-estimation model. It does NOT cover the frontend
(React/Flask/SQLite) — see AGENTS.md / KNOWLEDGE.md in the project root for that.

## When to use this skill
- Extracting pose features from a video clip or folder of clips
- Assembling a labeled training CSV from clips + a MET reference table
- Training or retraining the RandomForestRegressor calorie model
- Adding a new exercise type to the pipeline
- Debugging why a feature or prediction looks wrong

## Pipeline overview

```
video clips (self-recorded)
        |
        v
scripts/extract_features.py   -> one feature row per clip
        |
        v
scripts/build_dataset.py      -> features + MET-based calorie label -> dataset.csv
        |
        v
scripts/train_model.py        -> trained model.pkl + printed error metrics
```

Run these three scripts in order. Do not skip a stage — each one depends on the
previous stage's output file existing.

## Step-by-step workflow

### 1. Extract features from a clip or folder
```bash
python scripts/extract_features.py --input path/to/clip_or_folder --output features.csv
```
Reads video(s) with OpenCV, runs MediaPipe Pose per frame, and computes:
rep count, average movement speed, range of motion, and clip duration.
See `references/feature_definitions.md` for exactly how each feature is computed
and how to tune it per exercise.

### 2. Build the labeled dataset
```bash
python scripts/build_dataset.py --features features.csv --met-table references/met_values.md --output dataset.csv
```
Joins each feature row with a MET value (looked up by exercise type) and computes
the calorie label: `calories = MET × weight_kg × duration_hours`.
Weight per clip must come from your recording log — see
`references/dataset_format.md` for the expected file naming / metadata format.
**Never invent a weight or MET value — if either is missing for a clip, the script
should flag it, not guess.**

### 3. Train the model
```bash
python scripts/train_model.py --dataset dataset.csv --output model.pkl
```
Does an 80/20 train/test split, fits a `RandomForestRegressor`, and prints MAE
(mean absolute error) on the held-out set so you can sanity-check before demoing.

## Adding a new exercise type
1. Add its MET value to `references/met_values.md`
2. If the exercise needs a different joint-angle signal for rep counting (e.g.
   push-ups track elbow angle, squats track hip-knee angle), add that mapping in
   `scripts/extract_features.py` — see the `EXERCISE_JOINT_MAP` dict at the top
   of the file
3. Re-run the full pipeline (steps 1-3) — do not reuse an old dataset.csv with a
   new exercise type spliced in manually

## Common failure modes
- **No pose detected in a frame**: `extract_features.py` skips undetected frames
  rather than crashing; if a whole clip has too few detected frames it's excluded
  and logged, not silently zero-filled
- **Missing weight for a clip**: `build_dataset.py` will error out naming the
  missing clip rather than defaulting to an average weight — fix the dataset log,
  don't patch around it
- **Model predictions look way off**: usually a sign the feature extraction picked
  up a bad camera angle clip — check `references/feature_definitions.md` for the
  expected value ranges and compare against your actual features.csv

## Assets
`assets/` contains placeholder avatar sprite stages for the frontend team —
these are stand-ins, not final art. See `assets/README.md`.
