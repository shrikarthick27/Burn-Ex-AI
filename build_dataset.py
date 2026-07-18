import os
import pickle
import numpy as np
import pandas as pd
from scipy.signal import find_peaks

base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"
cache_dir = os.path.join(base_dir, "poses_cache")
output_csv = os.path.join(base_dir, "training_data.csv")

# Constants
MET_VALUES = {
    "squat": 3.5,
    "push-up": 8.0,
    "pull Up": 8.0,
    "russian twist": 7.0
}

WEIGHT_BUCKETS = [55, 65, 75, 85]

# Helper to calculate angle
def calculate_angle(a, b, c):
    ba = [a[0] - b[0], a[1] - b[1]]
    bc = [c[0] - b[0], c[1] - b[1]]
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

dataset = []

weight_idx = 0

for file in os.listdir(cache_dir):
    if not file.endswith(".pkl"):
        continue
        
    # parse exercise from filename (e.g., "squat_squat_7.mp4.pkl")
    # Actually the cache file is f"{folder}_{file}.pkl"
    parts = file.split("_")
    exercise = parts[0]
    if exercise not in MET_VALUES:
        # handle "pull Up" which has space
        if file.startswith("pull Up"):
            exercise = "pull Up"
        elif file.startswith("russian twist"):
            exercise = "russian twist"
        elif file.startswith("push-up"):
            exercise = "push-up"
        elif file.startswith("squat"):
            exercise = "squat"
        else:
            continue
            
    with open(os.path.join(cache_dir, file), "rb") as f:
        data = pickle.load(f)
        
    fps = data["fps"] if data["fps"] > 0 else 30
    frames = data["frames"]
    duration = len(frames) / fps
    
    # Track ALL joint angle series independently (for classifier robustness)
    elbow_angles = []   # Shoulder(11) - Elbow(13) - Wrist(15)
    knee_angles  = []   # Hip(23) - Knee(25) - Ankle(27)
    torso_angles = []   # Shoulder(11) - Hip(23) - Knee(25)
    wrist_y      = []

    for frame in frames:
        if 11 in frame and 13 in frame and 15 in frame:
            elbow_angles.append(calculate_angle(frame[11], frame[13], frame[15]))
        if 23 in frame and 25 in frame and 27 in frame:
            knee_angles.append(calculate_angle(frame[23], frame[25], frame[27]))
        if 11 in frame and 23 in frame and 25 in frame:
            torso_angles.append(calculate_angle(frame[11], frame[23], frame[25]))
        if 15 in frame:
            wrist_y.append(frame[15][1])

    # Primary angles for calorie features (exercise-specific)
    if exercise == "squat":
        primary_angles = np.array(knee_angles)
    elif exercise in ["push-up", "pull Up"]:
        primary_angles = np.array(elbow_angles)
    else:  # russian twist
        primary_angles = np.array(torso_angles)

    if len(primary_angles) < 5:
        continue

    # Joint-specific ROMs (key classifier discriminators)
    elbow_rom = float(np.max(elbow_angles) - np.min(elbow_angles)) if len(elbow_angles) > 1 else 0.0
    knee_rom  = float(np.max(knee_angles)  - np.min(knee_angles))  if len(knee_angles)  > 1 else 0.0
    torso_rom = float(np.max(torso_angles) - np.min(torso_angles)) if len(torso_angles) > 1 else 0.0

    # Primary ROM (for calorie model)
    rom = float(np.max(primary_angles) - np.min(primary_angles))

    # Reps (peak detection on primary signal)
    smoothed = np.convolve(primary_angles, np.ones(5)/5, mode='valid')
    peaks, _ = find_peaks(-smoothed, distance=fps*0.5, prominence=15)
    reps = len(peaks)

    # Avg Speed
    if len(wrist_y) > 1:
        avg_speed = float(np.mean(np.abs(np.diff(wrist_y))) * fps)
    else:
        avg_speed = 0.0

    # Weight round-robin
    weight = WEIGHT_BUCKETS[weight_idx % len(WEIGHT_BUCKETS)]
    weight_idx += 1

    # Ground Truth Calories
    calories_burned = MET_VALUES[exercise] * weight * (duration / 3600.0)

    dataset.append({
        "exercise_type":   exercise,
        "reps":            reps,
        "avg_speed":       avg_speed,
        "range_of_motion": rom,
        "elbow_rom":       elbow_rom,
        "knee_rom":        knee_rom,
        "torso_rom":       torso_rom,
        "duration_seconds": duration,
        "weight_kg":       weight,
        "calories_burned": calories_burned
    })

df = pd.DataFrame(dataset)
df.to_csv(output_csv, index=False)
print(f"Dataset built with {len(df)} rows. Saved to {output_csv}.")
