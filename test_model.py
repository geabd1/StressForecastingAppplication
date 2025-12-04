from stress_model import predict_stress

test_data = {
    "heart_rate": 80,
    "sleep_hours": 6,
    "steps": 5000,
    "calories_burned": 1800
}

print(predict_stress(test_data))
