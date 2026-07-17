# Dataset Format Reference

## Dataset source (as actually used)
Burn-Ex's training data comes from the **Kaggle "Exercise Detection dataset"** by
mrigaankjaswal: https://www.kaggle.com/datasets/mrigaankjaswal/exercise-detection-dataset

This is used with explicit hackathon organizer permission to use external datasets
under time constraints. This should be disclosed accurately in the pitch/PPT — cite
the dataset name and source rather than presenting it as self-generated.

The raw dataset is **frame-level joint angles** (Shoulder_Angle, Elbow_Angle,
Hip_Angle, Knee_Angle, Ankle_Angle, plus ground-reference angles), labeled by
exercise: Push Ups, Pull ups, Jumping Jacks, Squats, Russian twists. It has no
clip/session boundaries and no per-person weight or calorie data.

## Adapting it: scripts/adapt_kaggle_dataset.py
Since the raw data has no clip structure, `adapt_kaggle_dataset.py` splits each
exercise's frame sequence into fixed-size synthetic windows (default 90 frames,
~3 seconds at an assumed 30fps) and computes reps/range-of-motion/avg-speed per
window — the same feature schema `extract_features.py` produces from real video,
so both paths feed into `build_dataset.py` identically.

**Two disclosed limitations, both flagged in the script's own output:**
- Clip boundaries are synthetic (fixed windows), not real recorded sessions
- Weight is an **assumed constant** (default 65kg) applied to every row, since the
  source dataset has no real per-person weight data — this is a genuine accuracy
  limitation, not a hidden detail, and should be mentioned if judges ask how
  calorie labels were generated

## Original self-recorded-clip format (still supported, for use if the team also
records supplementary real footage)
If recording your own clips: `extract_features.py` parses exercise type from
filename prefix (`<exercise>_<person>_<weightkg>kg.mp4`), and `build_dataset.py`
accepts a `weights.csv` (`filename,weight_kg`) for that path. Omit `--weights`
when using Kaggle-adapted data, since weight is already embedded in the features
CSV — `build_dataset.py` handles both cases.

## met_values.csv format
Required by `build_dataset.py` regardless of data source:
```csv
exercise_type,met_value
squat,5.0
pushup,8.0
jumpingjack,8.0
pullup,8.0
russiantwist,4.5
```

## Why this matters
Since Kaggle-derived clips use synthetic windows and an assumed constant weight,
the model's calorie estimates carry more label noise than a fully self-recorded
dataset would. This is worth acknowledging directly in the pitch as a known
tradeoff made for time — judges generally respect an honest limitation stated
upfront far more than an unstated one they discover by asking.

