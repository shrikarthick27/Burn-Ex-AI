"""
adapt_kaggle_dataset.py — Convert the Kaggle "Exercise Detection dataset"
(frame-level joint angles, no clip grouping) into the clip-level feature format
Burn-Ex's build_dataset.py expects.

Source: Kaggle "Exercise Detection dataset" by mrigaankjaswal
        https://www.kaggle.com/datasets/mrigaankjaswal/exercise-detection-dataset
        (frame-level pose joint angles across Push Ups, Pull ups, Jumping Jacks,
        Squats, Russian twists — no per-clip grouping, no weight/calorie data)

Since the raw data has no clip boundaries, this script creates synthetic "clips"
by splitting each exercise's frames into fixed-size windows (default 90 frames,
~3 seconds at 30fps — adjust with --window-size). This is a reasonable but
approximate stand-in for real clip boundaries — flagged explicitly rather than
pretending these are real recorded sessions.

Since the dataset has no per-person weight, this script assigns an ASSUMED average
adult weight (default 65kg, override with --assumed-weight) to every window. This
must be disclosed in your dataset documentation and pitch — it is a real limitation,
not a hidden detail.

Usage:
    python adapt_kaggle_dataset.py --input exercise_angles.csv --output features.csv \
        --window-size 90 --assumed-weight 65
"""

import argparse

import numpy as np
import pandas as pd

# Map Kaggle's exact label strings to Burn-Ex's internal exercise_type keys
LABEL_MAP = {
    "Push Ups": "pushup",
    "Pull ups": "pullup",
    "Jumping Jacks": "jumpingjack",
    "Squats": "squat",
    "Russian twists": "russiantwist",
}

# Which angle column is the primary movement signal per exercise
PRIMARY_ANGLE_COLUMN = {
    "pushup": "Elbow_Angle",
    "pullup": "Elbow_Angle",
    "jumpingjack": "Shoulder_Angle",
    "squat": "Knee_Angle",
    "russiantwist": "Hip_Angle",
}

ASSUMED_FPS = 30  # dataset has no explicit fps/timestamp column; documented assumption


def count_reps(signal, smoothing_window=5):
    if len(signal) < smoothing_window * 2:
        return 0
    smoothed = np.convolve(signal, np.ones(smoothing_window) / smoothing_window, mode="valid")
    mid = (max(smoothed) + min(smoothed)) / 2
    crossings = 0
    above = smoothed[0] > mid
    for val in smoothed[1:]:
        now_above = val > mid
        if now_above != above:
            crossings += 1
            above = now_above
    return crossings // 2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--window-size", type=int, default=90,
                         help="Frames per synthetic clip (default 90 = ~3s at 30fps)")
    parser.add_argument("--assumed-weight", type=float, default=65.0,
                         help="Assumed average weight in kg (dataset has no real weight data)")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    df["exercise_type"] = df["Label"].map(LABEL_MAP)

    unmapped = df[df["exercise_type"].isna()]["Label"].unique()
    if len(unmapped) > 0:
        print(f"[WARN] Unmapped labels found, skipping: {unmapped}")
        df = df.dropna(subset=["exercise_type"])

    rows_out = []
    clip_counter = 0

    for exercise_type, group in df.groupby("exercise_type"):
        angle_col = PRIMARY_ANGLE_COLUMN[exercise_type]
        signal_all = group[angle_col].values

        n_windows = len(signal_all) // args.window_size
        for w in range(n_windows):
            window = signal_all[w * args.window_size:(w + 1) * args.window_size]

            reps = count_reps(window)
            range_of_motion = float(max(window) - min(window))
            avg_speed = float(np.mean(np.abs(np.diff(window)))) * ASSUMED_FPS
            duration_seconds = args.window_size / ASSUMED_FPS

            clip_counter += 1
            rows_out.append({
                "filename": f"kaggle_{exercise_type}_{clip_counter}.synthetic",
                "exercise_type": exercise_type,
                "reps": reps,
                "avg_speed": round(avg_speed, 4),
                "range_of_motion": round(range_of_motion, 2),
                "duration_seconds": round(duration_seconds, 2),
                "weight_kg": args.assumed_weight,
            })

    out_df = pd.DataFrame(rows_out)
    out_df.to_csv(args.output, index=False)

    print(f"Done. Wrote {len(out_df)} synthetic clip-level rows to {args.output}")
    print(f"NOTE: weight_kg is an ASSUMED constant ({args.assumed_weight}kg) — "
          f"the source dataset has no real per-person weight data. Disclose this "
          f"in your pitch/documentation.")
    print(f"NOTE: clip boundaries are synthetic {args.window_size}-frame windows, "
          f"not real recorded sessions.")


if __name__ == "__main__":
    main()
