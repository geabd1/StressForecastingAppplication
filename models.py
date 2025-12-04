from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, Date, Enum, DECIMAL
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class FitbitConnection(Base):
    __tablename__ = "fitbit_connections"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    fitbit_user_id = Column(String(100), unique=True, nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_sync_at = Column(DateTime, nullable=True)

class FitbitData(Base):
    __tablename__ = "fitbit_data"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    heart_rate = Column(Integer, nullable=True)
    sleep_hours = Column(DECIMAL(3, 1), nullable=True)
    steps = Column(Integer, nullable=True)
    calories_burned = Column(Integer, nullable=True)
    data_date = Column(Date, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    is_manual_edit = Column(Boolean, default=False)
    source = Column(String(20), default="fitbit")

class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    entry_date = Column(Date, nullable=False)

class StressPrediction(Base):
    __tablename__ = "stress_predictions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    prediction = Column(Enum('Low', 'High'), nullable=False)
    confidence = Column(DECIMAL(3, 2), nullable=False)
    heart_rate = Column(Integer, nullable=False)
    sleep_hours = Column(DECIMAL(3, 1), nullable=False)
    steps = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class FitbitAuthSession(Base):
    __tablename__ = "fitbit_auth_sessions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    state_token = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
