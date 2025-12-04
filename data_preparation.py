import pandas as pd
import numpy as np

# Simulated Fitbit-style dataset
data = {
    "heart_rate": np.random.randint(60, 120, 100),
    "sleep_hours": np.random.uniform(4, 9, 100),
    "steps": np.random.randint(1000, 10000, 100),
    "calories_burned": np.random.randint(1500, 3000, 100),
    "stress_level": np.random.choice([0, 1], 100)  # 0 = Low, 1 = High
}

df = pd.DataFrame(data)
df.to_csv("fitbit_data.csv", index=False)
print("✅ Data saved as fitbit_data.csv")
