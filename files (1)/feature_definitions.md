# Feature Definitions Reference

Detailed explanation of each feature computed by `extract_features.py`, for
debugging when predictions look wrong.

## reps
Counted via threshold-crossing on the smoothed primary joint-angle signal for the
exercise (see `EXERCISE_JOINT_MAP`). The signal is smoothed with a 5-frame moving
average, then peaks/troughs relative to the midpoint between max and min angle are
counted as rep boundaries.

**If rep counts look wrong**: usually means the joint-angle signal is noisy (bad
pose detection) or the exercise's primary joint mapping doesn't suit sudden
movements (e.g. jumping jacks — the current mapping is an approximation, tune
`smoothing_window` or `threshold_ratio` in `count_reps()` if needed).

## avg_speed
Mean frame-to-frame pixel displacement of the tracked middle joint (e.g. knee for
squats, elbow for push-ups), scaled by fps to approximate a per-second speed. This
is in normalized image-coordinate units (0-1 range per MediaPipe's output), not
real-world units — it's a relative speed measure for comparing clips against each
other, not an absolute physical speed.

## range_of_motion
`max(angle) - min(angle)` across the clip, in degrees. Directly reflects how deep/
full the movement was — this is the feature most responsible for distinguishing
"clean form" from "sloppy form" in the demo.

## duration_seconds
Total clip length based on frame count / fps. Straightforward.

## Expected value ranges (rough, for sanity-checking your own data)
These are illustrative expectations based on typical bodyweight exercise motion,
not measured from your actual dataset — use them as a rough sanity check, then
replace with real observed ranges from your own features.csv once you have data:
- range_of_motion: squats/pushups with full form generally show a noticeably wider
  angle swing than shallow/sloppy reps of the same exercise
- avg_speed: should be visibly higher for jumping jacks/burpees than for slow
  controlled squats

If your computed values don't show these relative patterns, check camera framing
and pose detection quality first before assuming the feature logic itself is wrong.
