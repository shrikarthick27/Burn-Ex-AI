# PRD.md — Burn-Ex: AI-Based Calorie Estimation System

## 1. Problem Statement
Develop an AI model to estimate calories burned during physical activities using a
self-generated dataset, without relying on external APIs.

- Tech Stack: Computer Vision, Machine Learning
- Outcome: Accurate and privacy-preserving fitness analytics

## 2. Why This Matters (Market Gap)
Mainstream fitness trackers (e.g. Strava) estimate calories using GPS speed/elevation
and manually entered body weight. This only works for outdoor, GPS-trackable activity
(running, cycling, walking, hiking). It cannot measure indoor bodyweight training
(squats, push-ups, jumping jacks) at all, and it applies a flat calculation regardless
of how well an exercise is performed.

Burn-Ex fills this gap: camera-based pose estimation that works indoors, with no
wearable or GPS required, and that adjusts its estimate based on movement quality —
not just activity type.

## 3. Target Users
- [PLACEHOLDER — fill in: home fitness users? gym-goers without wearables? judges'
  demo persona?]

## 4. Core Features (MVP for hackathon)

1. **Pose-based activity capture**
   - Webcam input → MediaPipe Pose → joint keypoints per frame
2. **Feature extraction**
   - Rep count, average movement speed, range of motion (joint angle delta), duration
3. **Calorie estimation model**
   - RandomForestRegressor (scikit-learn) trained on self-recorded, self-labeled data
   - Ground-truth labels generated via MET formula:
     `calories = MET × weight(kg) × duration(hours)`
4. **Form-quality differentiation**
   - Same rep count, different calorie output depending on range of motion / movement
     control (this is the core "wow" differentiator vs. flat MET-lookup competitors)
5. **Live demo UI**
   - Flask (or Streamlit) app: webcam feed with pose overlay, live calorie estimate
6. **Avatar / motivation layer** (stretch feature, build after core pipeline works)
   - Pixel-art avatar that evolves in visual stages based on workout consistency
     (session count / streaks), framed as an *illustrative motivational projection*,
     not a medical or literal body-transformation claim
7. **Privacy-by-design**
   - Pose keypoints processed locally; raw video frames not stored or transmitted

## 4a. Habit / Engagement Design
The product intentionally uses habit-forming mechanics — visible progress, streaks,
and avatar evolution as small consistent rewards — to encourage users to keep working
out. Position this to judges as **behavioral design for consistency** (i.e. helping
people stick to fitness goals), not as attention-maximizing/addictive design — this
framing is both more accurate to the actual goal (fitness follow-through) and lands
better with judges, since manipulative engagement patterns are viewed negatively in a
health/fitness context.

Mechanics to include:
- Session streak counter (consecutive days/sessions worked out)
- Avatar visual evolution tied to consistency, not raw intensity (rewards showing up,
  not just going hard once)
- Immediate post-workout feedback (calorie estimate + a small celebratory UI moment)
  so the reward is felt right after the action, not delayed

## 5. Exercises Covered (v1 dataset scope)
- Squats
- Jumping jacks
- Push-ups
- Marching / walking in place
- Burpees (stretch, if time allows)

## 6. Dataset Plan
Hackathon organizers explicitly permitted external datasets given time constraints.
Burn-Ex uses the **Kaggle "Exercise Detection dataset"** (mrigaankjaswal) —
frame-level pose joint angles across Push Ups, Pull ups, Jumping Jacks, Squats,
and Russian twists — https://www.kaggle.com/datasets/mrigaankjaswal/exercise-detection-dataset

This is disclosed accurately in the pitch as an external dataset, not presented as
self-generated. Known limitations (synthetic clip windows, assumed constant weight
since the source has no per-person weight data) are documented in
`references/dataset_format.md` and acknowledged openly if judges ask about label
accuracy.

If time allows, supplementary self-recorded clips can be added via the original
`extract_features.py` video pipeline — both paths feed the same downstream
`build_dataset.py` / `train_model.py` steps.

## 7. Success Criteria for Demo
- Live webcam demo runs without crashing
- Model produces a calorie estimate that is directionally sane (not wildly off from
  MET-table expectation)
- Clean-form vs. sloppy-form comparison visibly produces different calorie output
- [PLACEHOLDER — any judging criteria given by the hackathon organizers, if known]

## 8. Explicit Non-Goals (for this hackathon build)
- Not attempting medical-grade calorie accuracy
- Not attempting real body-transformation prediction (avatar is motivational/illustrative
  only, explicitly labeled as such in the UI)
- Not building multi-camera or 3D pose (single webcam only)
- Not supporting activities outside the fixed exercise list above
