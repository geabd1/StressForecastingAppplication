import joblib
import numpy as np

model = joblib.load("stress_model.pkl")

def predict_stress(data):
    try:
        features = np.array([
            data["heart_rate"],
            data["sleep_hours"], 
            data["steps"]
        ]).reshape(1, -1) 
        
        prediction = model.predict(features)
        stress_level = "High" if prediction[0] == 1 else "Low"
        
        # Get prediction probabilities for confidence score
        probabilities = model.predict_proba(features)[0]
        confidence = max(probabilities)
        
        return {
            "status": "success", 
            "prediction": stress_level,
            "confidence": round(confidence, 2)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}