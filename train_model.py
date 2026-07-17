import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import pickle

base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"
dataset_path = os.path.join(base_dir, "training_data.csv")
model_path = os.path.join(base_dir, "backend", "model.pkl")

# Match the frontend/backend enum mapping:
exercise_mapping = {
    "squat": 0,
    "push-up": 1,
    "pull Up": 2,
    "russian twist": 3
}

if not os.path.exists(dataset_path):
    print(f"Error: Dataset not found at {dataset_path}")
    exit(1)

df = pd.read_csv(dataset_path)

# Map exercise strings to integers
df["exerciseType"] = df["exercise_type"].map(exercise_mapping)

# Features array as expected by the backend
# [exerciseType, reps, avgSpeed, rangeOfMotion, duration, weight]
X = df[["exerciseType", "reps", "avg_speed", "range_of_motion", "duration_seconds", "weight_kg"]]
y = df["calories_burned"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)

print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows.")
print(f"Mean Absolute Error: {mae:.2f} calories")

with open(model_path, "wb") as f:
    pickle.dump(model, f)
    
print(f"Model saved to {model_path}")
