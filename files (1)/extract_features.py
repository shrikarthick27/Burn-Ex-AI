"""
extract_features.py — Extract movement features from exercise video clips using
MediaPipe Pose.

Usage:
    python extract_features.py --input path/to/clip.mp4 --output features.csv
    python extract_features.py --input path/to/folder/ --output features.csv

Each row in the output CSV corresponds to one clip:
    filename, exercise_type, reps, avg_speed, range_of_motion, duration_seconds

exercise_type is parsed from the filename — see references/dataset_format.md for
the expected naming convention. If your team uses a different convention, update
`parse_exercise_type()` below rather than renaming all your files.
"""

import argparse
import csv
import os
import sys

import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose

# Which joints define the primary angle to track per exercise, for rep counting
# and range-of-motion calculation. Add new exercises here.
EXERCISE_JOINT_MAP = {
    "squat": ("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"),
    "pushup": ("LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"),
    "jumpingjack": ("LEFT_HIP", "LEFT_SHOULDER", "LEFT_ELBOW"),
    "march": ("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"),
    "burpee": ("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"),
}

MIN_DETECTED_FRAME_RATIO = 0.5  # if fewer than 50% of frames have a detected pose,
                                  # exclude the clip rather than compute garbage features


def parse_exercise_type(filename):
    """Expects filenames like squat_person1_65kg.mp4 — adjust if your convention differs."""
    base = os.path.basename(filename).lower()
    for exercise in EXERCISE_JOINT_MAP:
        if base.startswith(exercise):
            return exercise
    return None


def calculate_angle(a, b, c):
    """Angle at point b, given three (x, y) points."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle = np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))
    return angle


def extract_clip_features(video_path):
    exercise_type = parse_exercise_type(video_path)
    if exercise_type is None:
        print(f"[WARN] Could not determine exercise type for {video_path}, skipping.")
        return None

    joint_names = EXERCISE_JOINT_MAP[exercise_type]

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    angles = []
    wrist_positions = []
    total_frames = 0
    detected_frames = 0

    with mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            total_frames += 1

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)

            if result.pose_landmarks:
                detected_frames += 1
                lm = result.pose_landmarks.landmark

                try:
                    p1 = [lm[getattr(mp_pose.PoseLandmark, joint_names[0])].x,
                          lm[getattr(mp_pose.PoseLandmark, joint_names[0])].y]
                    p2 = [lm[getattr(mp_pose.PoseLandmark, joint_names[1])].x,
                          lm[getattr(mp_pose.PoseLandmark, joint_names[1])].y]
                    p3 = [lm[getattr(mp_pose.PoseLandmark, joint_names[2])].x,
                          lm[getattr(mp_pose.PoseLandmark, joint_names[2])].y]
                    angle = calculate_angle(p1, p2, p3)
                    angles.append(angle)
                    wrist_positions.append(p2)  # use middle joint as movement tracker
                except (IndexError, AttributeError):
                    continue

    cap.release()

    if total_frames == 0 or (detected_frames / total_frames) < MIN_DETECTED_FRAME_RATIO:
        print(f"[WARN] Too few detected frames in {video_path} "
              f"({detected_frames}/{total_frames}), excluding clip.")
        return None

    duration_seconds = total_frames / fps

    # Rep count: count peaks in the angle signal (simple threshold-crossing approach)
    reps = count_reps(angles)

    # Range of motion: max - min angle observed
    range_of_motion = (max(angles) - min(angles)) if angles else 0

    # Average movement speed: mean frame-to-frame displacement of tracked joint
    avg_speed = calculate_avg_speed(wrist_positions, fps)

    return {
        "filename": os.path.basename(video_path),
        "exercise_type": exercise_type,
        "reps": reps,
        "avg_speed": round(avg_speed, 4),
        "range_of_motion": round(range_of_motion, 2),
        "duration_seconds": round(duration_seconds, 2),
    }


def count_reps(angles, smoothing_window=5, threshold_ratio=0.5):
    """Simple peak-counting on a smoothed angle signal. Tune threshold_ratio if
    reps are over/under counted for a given exercise."""
    if len(angles) < smoothing_window * 2:
        return 0
    smoothed = np.convolve(angles, np.ones(smoothing_window) / smoothing_window, mode="valid")
    mid = (max(smoothed) + min(smoothed)) / 2
    crossings = 0
    above = smoothed[0] > mid
    for val in smoothed[1:]:
        now_above = val > mid
        if now_above != above:
            crossings += 1
            above = now_above
    return crossings // 2


def calculate_avg_speed(positions, fps):
    if len(positions) < 2:
        return 0.0
    positions = np.array(positions)
    diffs = np.linalg.norm(np.diff(positions, axis=0), axis=1)
    return float(np.mean(diffs) * fps)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Video file or folder of videos")
    parser.add_argument("--output", required=True, help="Output CSV path")
    args = parser.parse_args()

    if os.path.isdir(args.input):
        clips = [os.path.join(args.input, f) for f in os.listdir(args.input)
                  if f.lower().endswith((".mp4", ".mov", ".avi"))]
    else:
        clips = [args.input]

    if not clips:
        print(f"[ERROR] No video files found at {args.input}")
        sys.exit(1)

    rows = []
    for i, clip in enumerate(clips, 1):
        print(f"Extracting features from clip {i}/{len(clips)}: {clip}")
        row = extract_clip_features(clip)
        if row:
            rows.append(row)

    if not rows:
        print("[ERROR] No clips produced usable features. Check video quality/framing.")
        sys.exit(1)

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. Wrote {len(rows)} feature rows to {args.output}")


if __name__ == "__main__":
    main()
