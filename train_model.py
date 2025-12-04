import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Load data
df = pd.read_csv("fitbit_data.csv")

X = df[["heart_rate", "sleep_hours", "steps"]]
y = df["stress_level"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"✅ Model Accuracy: {acc:.2f}")

# Save model
joblib.dump(model, "stress_model.pkl")
print("✅ Model saved as stress_model.pkl")
