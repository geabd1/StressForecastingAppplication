from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import MoodEntry, User
from auth_simple import get_current_user
from pydantic import BaseModel
from datetime import datetime, timedelta, date
from typing import List

router = APIRouter()

class MoodRating(BaseModel):
    rating: int
    notes: str = None

@router.post("/mood")
async def add_mood_rating(
    mood_data: MoodRating,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not 1 <= mood_data.rating <= 10:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")
    
    # Create mood entry
    mood_entry = MoodEntry(
        user_id=current_user.id,
        rating=mood_data.rating,
        notes=mood_data.notes,
        entry_date=date.today()
    )
    db.add(mood_entry)
    db.commit()
    
    return {"message": "Mood rating added successfully"}

@router.get("/mood")
async def get_mood_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get last 30 days of mood data
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    mood_entries = db.query(MoodEntry).filter(
        MoodEntry.user_id == current_user.id,
        MoodEntry.created_at >= thirty_days_ago
    ).order_by(MoodEntry.created_at.desc()).all()
    
    return {
        "mood_data": [
            {
                "rating": entry.rating,
                "notes": entry.notes,
                "timestamp": entry.created_at.isoformat() if entry.created_at else None,
                "date": entry.entry_date.isoformat() if entry.entry_date else None
            }
            for entry in mood_entries
        ]
    }

@router.get("/mood/weekly")
async def get_weekly_mood_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get last 7 days of mood data
    week_ago = date.today() - timedelta(days=7)
    mood_entries = db.query(MoodEntry).filter(
        MoodEntry.user_id == current_user.id,
        MoodEntry.entry_date >= week_ago
    ).order_by(MoodEntry.entry_date).all()
    
    # Create daily summary
    daily_data = {}
    for entry in mood_entries:
        date_str = entry.entry_date.isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = []
        daily_data[date_str].append(entry.rating)
    
    # Calculate daily averages
    weekly_data = []
    for i in range(7):
        day_date = date.today() - timedelta(days=i)
        day_name = day_date.strftime("%a")
        avg_rating = None
        date_str = day_date.isoformat()
        
        if date_str in daily_data:
            avg_rating = sum(daily_data[date_str]) / len(daily_data[date_str])
        
        weekly_data.append({
            "date": day_name,
            "rating": round(avg_rating, 1) if avg_rating else None
        })
    
    return weekly_data[::-1]  # Reverse to show oldest first

@router.get("/mood/average")
async def get_average_mood(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    mood_entries = db.query(MoodEntry).filter(
        MoodEntry.user_id == current_user.id,
        MoodEntry.created_at >= start_date
    ).all()
    
    if not mood_entries:
        return {"average_mood": 5.0, "total_entries": 0}
    
    avg_mood = sum(entry.rating for entry in mood_entries) / len(mood_entries)
    return {"average_mood": round(avg_mood, 1), "total_entries": len(mood_entries)}