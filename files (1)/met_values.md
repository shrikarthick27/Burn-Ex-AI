# MET Values Reference

MET (Metabolic Equivalent of Task) values used for calorie label calculation:
`calories = MET × weight_kg × duration_hours`

These are commonly cited approximate values from standard physical activity
compendiums (the kind of MET tables widely used in fitness research/apps). Treat
these as a reasonable starting point, NOT verified exact figures for your specific
build — confirm the values you actually use and record them here before running
build_dataset.py, since the model's calorie labels depend directly on these.

| exercise_type | met_value | notes |
|---|---|---|
| squat | 5.0 | bodyweight, moderate pace |
| pushup | 8.0 | vigorous, continuous |
| jumpingjack | 8.0 | vigorous, full body |
| march | 3.5 | marching/walking in place, light-moderate |
| burpee | 8.0 | vigorous, whole body |

## To use in the pipeline
Copy the exercise_type and met_value columns into a CSV file (e.g. `met_values.csv`)
with header `exercise_type,met_value` and pass it to `build_dataset.py` via
`--met-values`.

## If you need to change a value
Update this table AND the CSV you're feeding to the pipeline — keep them in sync so
this doc stays an accurate record of what your model was actually trained on.
