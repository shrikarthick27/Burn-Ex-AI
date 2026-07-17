import os
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import pickle
import numpy as np

base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"
with open(os.path.join(base_dir, 'pose_landmarker.task'), 'rb') as f:
    model_data = f.read()
base_options = python.BaseOptions(model_asset_buffer=model_data)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    output_segmentation_masks=False)
folders = ["pull Up", "push-up", "russian twist", "squat"]
base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"
cache_dir = os.path.join(base_dir, "poses_cache")
os.makedirs(cache_dir, exist_ok=True)

def extract_pose_from_video(video_path):
    detector = vision.PoseLandmarker.create_from_options(options)
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30
    frames_data = []
    
    frame_idx = 0
    last_timestamp_ms = -1
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        timestamp_ms = int((frame_idx / fps) * 1000)
        if timestamp_ms <= last_timestamp_ms:
            timestamp_ms = last_timestamp_ms + 1
        last_timestamp_ms = timestamp_ms
        
        results = detector.detect_for_video(mp_image, timestamp_ms)
        
        if results.pose_landmarks and len(results.pose_landmarks) > 0:
            landmarks = results.pose_landmarks[0]
            frame_points = {}
            for idx in [11,12, 13,14, 15,16, 23,24, 25,26, 27,28]:
                lm = landmarks[idx]
                if lm.visibility > 0.5:
                    frame_points[idx] = (lm.x, lm.y)
            frames_data.append(frame_points)
        else:
            frames_data.append({})
        frame_idx += 1
            
    cap.release()
    detector.close()
    return {"fps": fps, "frames": frames_data}

total_processed = 0
for folder in folders:
    folder_path = os.path.join(base_dir, folder)
    if not os.path.exists(folder_path):
        continue
        
    for file in os.listdir(folder_path):
        if file.endswith(".mp4"):
            video_path = os.path.join(folder_path, file)
            cache_file = os.path.join(cache_dir, f"{folder}_{file}.pkl")
            
            if os.path.exists(cache_file):
                continue
                
            print(f"Extracting poses for {file}...")
            data = extract_pose_from_video(video_path)
            
            with open(cache_file, "wb") as f:
                pickle.dump(data, f)
            total_processed += 1

print(f"Extraction complete! Processed {total_processed} new clips.")
