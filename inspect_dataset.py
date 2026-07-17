import os
import cv2
from collections import defaultdict

folders = ["pull Up", "push-up", "russian twist", "squat"]
base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"

stats = defaultdict(lambda: {"count": 0, "durations": [], "resolutions": set(), "fps": set()})

for folder in folders:
    folder_path = os.path.join(base_dir, folder)
    if not os.path.exists(folder_path):
        continue
    for file in os.listdir(folder_path):
        if file.endswith(".mp4"):
            file_path = os.path.join(folder_path, file)
            cap = cv2.VideoCapture(file_path)
            
            # Count
            stats[folder]["count"] += 1
            
            # FPS and Duration
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            stats[folder]["durations"].append(duration)
            stats[folder]["fps"].add(round(fps, 2))
            
            # Resolution
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            stats[folder]["resolutions"].add(f"{width}x{height}")
            
            cap.release()

# Print Summary
print("--- Dataset Inspection Summary ---")
for folder, data in stats.items():
    durations = data["durations"]
    min_dur = min(durations) if durations else 0
    max_dur = max(durations) if durations else 0
    avg_dur = sum(durations) / len(durations) if durations else 0
    print(f"Exercise: {folder}")
    print(f"  Count: {data['count']} clips")
    print(f"  Duration Range: {min_dur:.2f}s - {max_dur:.2f}s (Avg: {avg_dur:.2f}s)")
    print(f"  Resolutions: {', '.join(data['resolutions'])}")
    print(f"  FPS: {', '.join(map(str, data['fps']))}")
    print()
