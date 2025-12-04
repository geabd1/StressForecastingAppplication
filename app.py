from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from auth_simple import router as auth_router, get_current_user
from users import router as users_router
from mood import router as mood_router
from fitbit import router as fitbit_router
from pydantic import BaseModel
import os

# Import the ML model
try:
    from stress_model import predict_stress
    ML_MODEL_AVAILABLE = True
    print("✅ ML stress model loaded successfully")
except ImportError as e:
    print(f"❌ ML model not available: {e}")
    ML_MODEL_AVAILABLE = False
except Exception as e:
    print(f"❌ Error loading ML model: {e}")
    ML_MODEL_AVAILABLE = False

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CalmCast API", description="Stress Forecasting App", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api", tags=["authentication"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(mood_router, prefix="/api", tags=["mood"])
app.include_router(fitbit_router, prefix="/api", tags=["fitbit"])

class StressPredictionRequest(BaseModel):
    heart_rate: int
    sleep_hours: float
    steps: int

class StressPredictionResponse(BaseModel):
    status: str
    prediction: str
    confidence: float = None
    method: str

@app.post("/api/stress/predict", response_model=StressPredictionResponse)
async def predict_stress_level(
    data: StressPredictionRequest,
    current_user = Depends(get_current_user)
):
    """
    Predict stress level using ML model if available, otherwise fall back to heuristic
    """
    
    # Try ML model first
    if ML_MODEL_AVAILABLE:
        try:
            ml_result = predict_stress({
                "heart_rate": data.heart_rate,
                "sleep_hours": data.sleep_hours,
                "steps": data.steps
            })
            
            if ml_result["status"] == "success":
                # Log the prediction to database
                from database import SessionLocal
                from models import StressPrediction
                from datetime import datetime
                
                db = SessionLocal()
                try:
                    stress_pred = StressPrediction(
                        user_id=current_user.id,
                        prediction=ml_result["prediction"],
                        confidence=ml_result.get("confidence", 0.8),
                        heart_rate=data.heart_rate,
                        sleep_hours=data.sleep_hours,
                        steps=data.steps,
                        created_at=datetime.now()
                    )
                    db.add(stress_pred)
                    db.commit()
                except Exception as e:
                    print(f"❌ Failed to log prediction: {e}")
                    db.rollback()
                finally:
                    db.close()
                
                return StressPredictionResponse(
                    status="success",
                    prediction=ml_result["prediction"],
                    confidence=ml_result.get("confidence"),
                    method="ml_model"
                )
            else:
                print(f"❌ ML model prediction failed: {ml_result.get('message')}")
                # Fall through to heuristic
        except Exception as e:
            print(f"❌ ML model error: {e}")
            # Fall through to heuristic
    
    # Fallback to heuristic method
    print("🔄 Using heuristic fallback for stress prediction")
    stress_score = (data.heart_rate - 60) / 20 + (8 - data.sleep_hours) + (10000 - data.steps) / 5000
    prediction = "High" if stress_score > 2 else "Low"
    confidence = min(abs(stress_score - 2) / 3, 0.95)  # Simple confidence based on distance from threshold
    
    return StressPredictionResponse(
        status="success",
        prediction=prediction,
        confidence=round(confidence, 2),
        method="heuristic"
    )

@app.get("/api/stress/model-status")
async def get_model_status():
    """Check if ML model is available"""
    return {
        "ml_model_available": ML_MODEL_AVAILABLE,
        "method": "ml_model" if ML_MODEL_AVAILABLE else "heuristic"
    }

@app.get("/")
async def read_root():
    return {"message": "CalmCast API is running!"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)