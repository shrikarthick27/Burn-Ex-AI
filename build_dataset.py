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
    
    # We need a primary angle to track reps and ROM
    angles = []
    wrist_y = []
    
    for frame in frames:
        if exercise == "squat":
            # Hip (23), Knee (25), Ankle (27)
            if 23 in frame and 25 in frame and 27 in frame:
                angles.append(calculate_angle(frame[23], frame[25], frame[27]))
        elif exercise in ["push-up", "pull Up"]:
            # Shoulder (11), Elbow (13), Wrist (15)
            if 11 in frame and 13 in frame and 15 in frame:
                angles.append(calculate_angle(frame[11], frame[13], frame[15]))
        elif exercise == "russian twist":
            # Shoulder (11), Hip (23), Knee (25)
            if 11 in frame and 23 in frame and 25 in frame:
                angles.append(calculate_angle(frame[11], frame[23], frame[25]))
        
        if 15 in frame:
            wrist_y.append(frame[15][1])
            
    if len(angles) < 5:
        # Not enough data
        continue
        
    angles = np.array(angles)
    
    # 1. ROM
    rom = np.max(angles) - np.min(angles)
    
    # 2. Reps (Peak detection)
    # Smooth the signal slightly
    smoothed = np.convolve(angles, np.ones(5)/5, mode='valid')
    # Use negative for squats/pushups where angle drops during rep
    peaks, _ = find_peaks(-smoothed, distance=fps*0.5, prominence=15)
    reps = len(peaks)
    
    # 3. Avg Speed (normalized y movement per second)
    if len(wrist_y) > 1:
        diffs = np.abs(np.diff(wrist_y))
        avg_speed = np.mean(diffs) * fps
    else:
        avg_speed = 0.0
        
    # Assign weight round-robin
    weight = WEIGHT_BUCKETS[weight_idx % len(WEIGHT_BUCKETS)]
    weight_idx += 1
    
    # 4. Ground Truth Calories
    # Calories = MET * weight_kg * duration_hours
    calories_burned = MET_VALUES[exercise] * weight * (duration / 3600.0)
    
    dataset.append({
        "exercise_type": exercise,
        "reps": reps,
        "avg_speed": avg_speed,
        "range_of_motion": rom,
        "duration_seconds": duration,
        "weight_kg": weight,
        "calories_burned": calories_burned
    })

df = pd.DataFrame(dataset)
df.to_csv(output_csv, index=False)
print(f"Dataset built with {len(df)} rows. Saved to {output_csv}.")
