from fastapi import FastAPI
from routes import fitbit, user

app = FastAPI(title="Stress Prediction Backend")

@app.get("/")
def home():
    return {"message": "Backend is running successfully!"}

app.include_router(fitbit.router)
app.include_router(user.router)
