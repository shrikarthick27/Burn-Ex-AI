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
    
    # We use these exact same features for the classifier
    # weight_kg is included if it helps, but motion is largely weight-independent. 
    # Let's keep the same 4 motion features to make it robust across users.
    feature_columns = ['reps', 'avg_speed', 'range_of_motion', 'duration_seconds']
    target_column = 'exercise_type'
    
    X = df[feature_columns]
    y = df[target_column]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, preds, zero_division=0))
    print(f"Overall Accuracy: {acc * 100:.1f}%\n")
    
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)
        
    print(f"Classifier saved to {model_path}")

if __name__ == "__main__":
    main()
