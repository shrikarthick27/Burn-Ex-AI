"""
train_model.py — Train a RandomForestRegressor on the labeled dataset produced
by build_dataset.py.

Usage:
    python train_model.py --dataset dataset.csv --output model.pkl

Prints MAE (mean absolute error) on a held-out test split so you can sanity-check
before demoing. If MAE looks huge relative to typical calorie values (e.g. >50%
of the average label), something upstream is likely wrong — check feature
extraction quality before assuming the model itself is the problem.
"""

import argparse
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

FEATURE_COLUMNS = ["reps", "avg_speed", "range_of_motion", "duration_seconds", "weight_kg"]
LABEL_COLUMN = "calories_label"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    df = pd.read_csv(args.dataset)

    missing_cols = [c for c in FEATURE_COLUMNS + [LABEL_COLUMN] if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing expected columns: {missing_cols}")

    X = df[FEATURE_COLUMNS]
    y = df[LABEL_COLUMN]

    if len(df) < 10:
        print(f"[WARN] Only {len(df)} rows in dataset — this is a very small "
              f"training set. Model quality will be limited, but this is expected "
              f"and acceptable for a hackathon demo dataset.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42
    )

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    avg_label = y.mean()

    print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows.")
    print(f"Mean Absolute Error: {mae:.2f} calories")
    print(f"Average calorie label in dataset: {avg_label:.2f}")
    print(f"MAE as % of average label: {(mae / avg_label * 100):.1f}%")

    with open(args.output, "wb") as f:
        pickle.dump(model, f)

    print(f"Model saved to {args.output}")


if __name__ == "__main__":
    main()
