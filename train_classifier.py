import os
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

base_dir = r"c:\Users\shrik\OneDrive\Desktop\Burn-EX"
csv_path = os.path.join(base_dir, "training_data.csv")
model_path = os.path.join(base_dir, "backend", "classifier.pkl")

def main():
    print("Loading dataset for classification...")
    df = pd.read_csv(csv_path)

    # Use joint-specific ROMs as primary features.
    # These directly reflect WHICH joints move most — a perfect discriminator:
    #   push-up  → high elbow_rom, low knee_rom
    #   squat    → low elbow_rom, high knee_rom
    #   pull-up  → high elbow_rom, high torso_rom
    #   russian  → high torso_rom, low knee_rom
    feature_columns = ['elbow_rom', 'knee_rom', 'torso_rom', 'avg_speed', 'reps']
    target_column = 'exercise_type'

    # Drop rows where new features may be missing (older CSV without them)
    df = df.dropna(subset=feature_columns)

    X = df[feature_columns]
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")

    clf = RandomForestClassifier(n_estimators=200, random_state=42, max_depth=12, min_samples_leaf=2)
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print("\n--- Classification Report ---")
    print(classification_report(y_test, preds, zero_division=0))
    print(f"Overall Accuracy: {acc * 100:.1f}%")
    print(f"Feature importances: { dict(zip(feature_columns, clf.feature_importances_.round(3))) }\n")

    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    print(f"Classifier saved to {model_path}")

if __name__ == "__main__":
    main()
