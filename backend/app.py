import os
import pickle
import pandas as pd
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db, add_session, get_stats, get_all_sessions

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend cross-origin requests

# Paths
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")

# Load regression model
model = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print(f"Successfully loaded model from {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Model file not found at {MODEL_PATH}")

# Load classifier
CLASSIFIER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "classifier.pkl")
classifier = None
if os.path.exists(CLASSIFIER_PATH):
    try:
        with open(CLASSIFIER_PATH, "rb") as f:
            classifier = pickle.load(f)
        print(f"Successfully loaded classifier from {CLASSIFIER_PATH}")
    except Exception as e:
        print(f"Error loading classifier: {e}")

# Feature names expected by the model
FEATURE_COLUMNS = ["exerciseType", "reps", "avg_speed", "range_of_motion", "duration_seconds", "weight_kg"]

exercise_mapping = {
    "squat": 0,
    "push-up": 1,
    "pull Up": 2,
    "russian twist": 3
}

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.json
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    
    # Extract features
    try:
        exercise_str = data.get("exercise_type", "squat")
        features = {
            "exerciseType": exercise_mapping.get(exercise_str, 0),
            "reps": float(data.get("reps", 0)),
            "avg_speed": float(data.get("avg_speed", 0.0)),
            "range_of_motion": float(data.get("range_of_motion", 0.0)),
            "duration_seconds": float(data.get("duration_seconds", 0.0)),
            "weight_kg": float(data.get("weight_kg", 65.0))
        }
        tracking_quality = float(data.get("tracking_quality", 1.0))  # 0.0–1.0 from frontend
    except ValueError as e:
        return jsonify({"error": f"Invalid numerical inputs: {e}"}), 400

    # --- Confidence estimation ---
    # Based on: reps detected, ROM signal quality, avg_speed non-zero, duration
    confidence_score = 0.0
    if features["reps"] >= 5:
        confidence_score += 0.35
    elif features["reps"] >= 2:
        confidence_score += 0.15
    if features["range_of_motion"] >= 30:
        confidence_score += 0.25
    elif features["range_of_motion"] >= 10:
        confidence_score += 0.10
    if features["avg_speed"] > 0.001:
        confidence_score += 0.20
    if features["duration_seconds"] >= 60:
        confidence_score += 0.20
    elif features["duration_seconds"] >= 30:
        confidence_score += 0.10
    confidence_score += tracking_quality * 0.10

    if confidence_score >= 0.65:
        confidence_label = "High"
        spread_pct = 0.07   # ±7%
    elif confidence_score >= 0.35:
        confidence_label = "Medium"
        spread_pct = 0.15   # ±15%
    else:
        confidence_label = "Low"
        spread_pct = 0.25   # ±25%

    # Uncertainty driver: plain-language hint
    if features["reps"] < 2:
        uncertainty_driver = "Few reps detected — more reps tighten the estimate"
    elif features["range_of_motion"] < 15:
        uncertainty_driver = "Limited range of motion detected — a side-on camera angle helps"
    elif features["avg_speed"] < 0.001:
        uncertainty_driver = "Movement speed was very low — ensure your full body is in frame"
    elif features["duration_seconds"] < 30:
        uncertainty_driver = "Short session — longer sessions narrow the confidence range"
    else:
        uncertainty_driver = "Good tracking quality — this estimate is reliable"

    if model is None:
        # Explicit fallback — DO NOT silently give a clean number
        met = 5.0
        duration_hours = features["duration_seconds"] / 3600.0
        calories_mid = met * features["weight_kg"] * duration_hours
        calories_low = round(calories_mid * 0.75, 2)
        calories_high = round(calories_mid * 1.25, 2)
        return jsonify({
            "calories": round(calories_mid, 2),
            "calories_low": calories_low,
            "calories_high": calories_high,
            "confidence": "Low",
            "uncertainty_driver": "Using MET-table fallback (pose model not loaded) — estimate is approximate",
            "is_fallback": True,
            "detected_exercise": features.get("exercise_type", "unknown"),
            "detection_confidence": 0.0
        })

    # Prepare DataFrame for regression
    df = pd.DataFrame([features])[FEATURE_COLUMNS]
    
    # Run Exercise Classifier
    detected_exercise = exercise_str
    detection_confidence = 0.0
    if classifier is not None:
        try:
            clf_features = pd.DataFrame([{
                'reps': features["reps"],
                'avg_speed': features["avg_speed"],
                'range_of_motion': features["range_of_motion"],
                'duration_seconds': features["duration_seconds"]
            }])
            detected_exercise = classifier.predict(clf_features)[0]
            proba = classifier.predict_proba(clf_features)[0]
            detection_confidence = float(proba.max())
        except Exception as e:
            print(f"Classifier error: {e}")

    try:
        prediction = float(model.predict(df)[0])
        calories_low = round(prediction * (1 - spread_pct), 2)
        calories_high = round(prediction * (1 + spread_pct), 2)
        return jsonify({
            "calories": round(prediction, 2),
            "calories_low": max(0, calories_low),
            "calories_high": calories_high,
            "confidence": confidence_label,
            "uncertainty_driver": uncertainty_driver,
            "is_fallback": False,
            "detected_exercise": detected_exercise,
            "detection_confidence": detection_confidence
        })
    except Exception as e:
        return jsonify({"error": f"Prediction error: {e}"}), 500

@app.route("/api/session", methods=["POST"])
def session():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    try:
        exercise_type = data.get("exercise_type", "squat")
        reps = int(data.get("reps", 0))
        avg_speed = float(data.get("avg_speed", 0.0))
        range_of_motion = float(data.get("range_of_motion", 0.0))
        duration_seconds = float(data.get("duration_seconds", 0.0))
        weight_kg = float(data.get("weight_kg", 65.0))
        calories_burned = float(data.get("calories_burned", 0.0))
        detected_exercise = data.get("detected_exercise", None)
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid field format: {e}"}), 400
        
    new_streak = add_session(
        exercise_type=exercise_type,
        reps=reps,
        avg_speed=avg_speed,
        range_of_motion=range_of_motion,
        duration_seconds=duration_seconds,
        weight_kg=weight_kg,
        calories_burned=calories_burned,
        detected_exercise=detected_exercise
    )
    
    stats = get_stats()
    return jsonify({
        "success": True,
        "new_streak": new_streak,
        "stats": stats
    })

@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify(get_stats())

@app.route("/api/history", methods=["GET"])
def history():
    return jsonify(get_all_sessions())

@app.route("/api/sessions", methods=["DELETE"])
def delete_sessions():
    """Delete all session data and reset streaks — user-initiated data export/delete (§8)"""
    from database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions")
        cursor.execute("UPDATE streaks SET current_streak=0, max_streak=0, last_active_date=NULL WHERE id=1")
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "All session data deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/model-status", methods=["GET"])
def model_status():
    return jsonify({
        "status": "active" if model is not None else "offline",
        "has_model": model is not None
    })

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
