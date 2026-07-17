# KNOWLEDGE.md — Architecture & Reference

## System Architecture (high level)

```
[Webcam / Video file]
        |
        v
[MediaPipe Pose] -> joint keypoints per frame
        |
        v
[Feature extraction] -> rep count, avg speed, range of motion, duration
        |
        v
[Trained model (RandomForestRegressor)] -> predicted calories
        |
        v
[Flask/Streamlit UI] -> live overlay + calorie display + avatar state
```

## Data Flow for Training (offline, done before/during hackathon)
```
[Recorded clips (self-generated only)]
        |
        v
[Feature extraction script] -> per-clip feature row
        |
        v
[MET-based label calculation] -> calories = MET x weight(kg) x duration(hours)
        |
        v
[Assembled CSV: features + calorie label]
        |
        v
[Train/test split -> RandomForestRegressor.fit()]
        |
        v
[Saved model file, reused by live demo]
```

## Calorie Label Formula (ground truth for training)
`calories = MET × weight(kg) × duration(hours)`

MET values are activity-specific and must be sourced from a standard MET reference
table — [PLACEHOLDER: paste the specific MET values you're using for squats, jumping
jacks, push-ups, marching, burpees here once decided, so the agent uses real values
and doesn't guess].

## Feature Definitions
- **Rep count**: derived from peaks/troughs in a tracked joint-angle signal over time
  (e.g. hip-knee angle for squats)
- **Average movement speed**: mean frame-to-frame displacement of relevant joints
- **Range of motion**: max angle delta of the primary joint involved in the exercise
- **Duration**: clip length in seconds

## Why This Differs From Existing Solutions (for reference when building UI copy)
- Strava and similar apps calculate calories from GPS speed/elevation + manually
  entered weight; they do not support indoor bodyweight exercises and do not adjust
  for form quality
- Burn-Ex uses camera-based pose data, works indoors with no GPS/wearable, and
  produces different calorie estimates for the same exercise performed with different
  form quality

## Open Items Requiring User Input
- Exact MET values per exercise
- Dataset file/folder naming convention (how weight + exercise type are attached to
  each clip)
- Avatar evolution thresholds
- Any hackathon-specific judging criteria
