"""
build_dataset.py — Join extracted features with MET values and per-clip weight
metadata to produce a labeled training dataset.

Usage:
    python build_dataset.py --features features.csv --weights weights.csv \
        --met-values met_values.csv --output dataset.csv

Expects:
- features.csv: output of extract_features.py
- weights.csv: filename,weight_kg (one row per clip — YOU must provide this,
  see references/dataset_format.md)
- met_values.csv: exercise_type,met_value (see references/met_values.md for
  standard reference values — copy the ones you're using into a CSV here)

Never guesses a missing weight or MET value — the script exits with a clear
error naming what's missing, rather than silently defaulting.
"""

import argparse
import csv
import sys


def load_csv_as_dict(path, key_col, value_col):
    result = {}
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            result[row[key_col]] = row[value_col]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", required=True)
    parser.add_argument("--weights", required=False,
                         help="CSV: filename,weight_kg — omit if the features CSV "
                              "already has a weight_kg column (e.g. Kaggle-adapted data)")
    parser.add_argument("--met-values", required=True,
                         help="CSV: exercise_type,met_value")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    weights = load_csv_as_dict(args.weights, "filename", "weight_kg") if args.weights else None
    met_values = load_csv_as_dict(args.met_values, "exercise_type", "met_value")

    rows_out = []
    errors = []

    with open(args.features, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            filename = row["filename"]
            exercise = row["exercise_type"]

            if weights is not None:
                weight = weights.get(filename)
            else:
                weight = row.get("weight_kg")  # already embedded in features CSV

            met = met_values.get(exercise)

            if weight is None:
                errors.append(f"Missing weight for clip: {filename}")
                continue
            if met is None:
                errors.append(f"Missing MET value for exercise type: {exercise}")
                continue

            weight = float(weight)
            met = float(met)
            duration_hours = float(row["duration_seconds"]) / 3600.0
            calories = met * weight * duration_hours

            rows_out.append({
                **row,
                "weight_kg": weight,
                "met_value": met,
                "calories_label": round(calories, 2),
            })

    if errors:
        print("[ERROR] Cannot build dataset — missing data for the following:")
        for e in errors:
            print(f"  - {e}")
        print("\nFix the weights.csv or met_values.csv file and re-run. "
              "Do not guess these values.")
        sys.exit(1)

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Done. Wrote {len(rows_out)} labeled rows to {args.output}")


if __name__ == "__main__":
    main()
