from stress_model import predict_stress

# Ask for user input
heart_rate = int(input("Enter heart rate (bpm): "))
sleep_hours = float(input("Enter sleep hours: "))
steps = int(input("Enter number of steps: "))

# Prepare data
data = {
    "heart_rate": heart_rate,
    "sleep_hours": sleep_hours,
    "steps": steps
}

# Predict stress
result = predict_stress(data)

if result["status"] == "success":
    print(f"✅ Predicted Stress Level: {result['prediction']}")
else:
    print(f"⚠️ Error: {result['message']}")

