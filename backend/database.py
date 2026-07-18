import sqlite3
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "burnex.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Sessions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            exercise_type TEXT NOT NULL,
            detected_exercise TEXT,
            reps INTEGER NOT NULL,
            avg_speed REAL NOT NULL,
            range_of_motion REAL NOT NULL,
            duration_seconds REAL NOT NULL,
            weight_kg REAL NOT NULL,
            calories_burned REAL NOT NULL
        )
    """)
    
    # Try to add column if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN detected_exercise TEXT")
    except sqlite3.OperationalError:
        pass # Column likely already exists
    
    # Streaks Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS streaks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            current_streak INTEGER DEFAULT 0,
            max_streak INTEGER DEFAULT 0,
            last_active_date TEXT
        )
    """)
    
    # Seed streaks if empty
    cursor.execute("SELECT COUNT(*) FROM streaks")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO streaks (current_streak, max_streak, last_active_date) VALUES (0, 0, NULL)")
        
    conn.commit()
    conn.close()

def add_session(exercise_type, reps, avg_speed, range_of_motion, duration_seconds, weight_kg, calories_burned, detected_exercise=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO sessions (timestamp, exercise_type, detected_exercise, reps, avg_speed, range_of_motion, duration_seconds, weight_kg, calories_burned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (now_str, exercise_type, detected_exercise, reps, avg_speed, range_of_motion, duration_seconds, weight_kg, calories_burned))
    
    # Update Streak
    today_str = date.today().isoformat()
    
    cursor.execute("SELECT current_streak, max_streak, last_active_date FROM streaks WHERE id = 1")
    streak_row = cursor.fetchone()
    
    if streak_row:
        current_streak = streak_row["current_streak"]
        max_streak = streak_row["max_streak"]
        last_active = streak_row["last_active_date"]
        
        if last_active is None:
            # First workout ever
            current_streak = 1
            max_streak = max(max_streak, current_streak)
        else:
            last_active_date = datetime.strptime(last_active, "%Y-%m-%d").date()
            today_date = date.today()
            delta = (today_date - last_active_date).days
            
            if delta == 1:
                # Consecutive day
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            elif delta > 1:
                # Streak broken
                current_streak = 1
            # If delta == 0, workout was already recorded today, streak remains the same
            
        cursor.execute("""
            UPDATE streaks
            SET current_streak = ?, max_streak = ?, last_active_date = ?
            WHERE id = 1
        """, (current_streak, max_streak, today_str))
    
    conn.commit()
    conn.close()
    return current_streak

def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total sessions
    cursor.execute("SELECT COUNT(*) FROM sessions")
    total_sessions = cursor.fetchone()[0]
    
    # Total calories
    cursor.execute("SELECT SUM(calories_burned) FROM sessions")
    total_calories = cursor.fetchone()[0] or 0.0
    
    # Total reps
    cursor.execute("SELECT SUM(reps) FROM sessions")
    total_reps = cursor.fetchone()[0] or 0
    
    # Streak details
    cursor.execute("SELECT current_streak, max_streak FROM streaks WHERE id = 1")
    streak_row = cursor.fetchone()
    current_streak = streak_row["current_streak"] if streak_row else 0
    max_streak = streak_row["max_streak"] if streak_row else 0
    
    # Avatar level based on session count
    avatar_level = 1
    if total_sessions >= 10:
        avatar_level = 4
    elif total_sessions >= 6:
        avatar_level = 3
    elif total_sessions >= 3:
        avatar_level = 2
        
    conn.close()
    
    return {
        "total_sessions": total_sessions,
        "total_calories": round(total_calories, 2),
        "total_reps": total_reps,
        "current_streak": current_streak,
        "max_streak": max_streak,
        "avatar_level": avatar_level
    }

def get_all_sessions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    
    sessions = []
    for r in rows:
        sessions.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "exercise_type": r["exercise_type"],
            "detected_exercise": r["detected_exercise"],
            "reps": r["reps"],
            "avg_speed": r["avg_speed"],
            "range_of_motion": r["range_of_motion"],
            "duration_seconds": r["duration_seconds"],
            "weight_kg": r["weight_kg"],
            "calories_burned": r["calories_burned"]
        })
        
    conn.close()
    return sessions
