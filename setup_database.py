# setup_database.py
from database import engine, Base
from models import User, MoodEntry, FitbitConnection, FitbitData, StressPrediction, UserSession, FitbitAuthSession

# Create all tables
Base.metadata.create_all(bind=engine)
print("✅ All database tables verified!")