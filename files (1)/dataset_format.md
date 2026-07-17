# Dataset Format Reference

## Video filename convention
`extract_features.py` parses exercise type from the filename prefix. Expected format:

```
<exercise>_<person>_<weightkg>kg.mp4
```

Examples:
```
squat_person1_65kg.mp4
pushup_person2_72kg.mp4
jumpingjack_person1_65kg_take2.mp4
```

The exercise prefix must match a key in `EXERCISE_JOINT_MAP` in
`extract_features.py`: squat, pushup, jumpingjack, march, burpee.

## weights.csv format
Required by `build_dataset.py`. One row per clip filename:

```csv
filename,weight_kg
squat_person1_65kg.mp4,65
pushup_person2_72kg.mp4,72
jumpingjack_person1_65kg_take2.mp4,65
```

Even though weight is embedded in the filename for readability, the script reads
it from this CSV explicitly — this avoids fragile filename-parsing for the actual
numeric value used in calorie labels. Keep this file updated as your teammate
records more clips.

## Recording guidelines (for whoever is filming)
- Full body in frame, ~2-2.5m from camera
- Fixed camera position for the whole clip (no panning/zooming)
- Well-lit room, avoid strong backlighting
- 30-60 seconds per clip
- Note each performer's approximate weight before recording, don't estimate after
  the fact

## Why this matters
Feature extraction quality depends heavily on consistent framing — inconsistent
angles/distances between clips introduces noise into range-of-motion and speed
calculations, which directly degrades the trained model's accuracy.
