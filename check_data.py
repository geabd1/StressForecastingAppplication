from database import SessionLocal
from models import User, MoodEntry, FitbitData, StressPrediction

def check_data():
    db = SessionLocal()
    
    try:
        print("📊 Checking database data...")
        
        # Count records
        user_count = db.query(User).count()
        mood_count = db.query(MoodEntry).count()
        fitbit_count = db.query(FitbitData).count()
        stress_count = db.query(StressPrediction).count()
        
        print(f"👥 Users: {user_count}")
        print(f"😊 Mood entries: {mood_count}")
        print(f"⌚ Fitbit data: {fitbit_count}")
        print(f"📈 Stress predictions: {stress_count}")
        
        # Show sample data
        print("\n📋 Sample Users:")
        users = db.query(User).limit(3).all()
        for user in users:
            print(f"   {user.username} ({user.name}) - {user.email}")
            
        print("\n📋 Recent Mood Entries:")
        moods = db.query(MoodEntry).order_by(MoodEntry.created_at.desc()).limit(5).all()
        for mood in moods:
            print(f"   User {mood.user_id}: {mood.rating}/10 - {mood.entry_date}")
            
        print("\n📋 Recent Fitbit Data:")
        fitbit_data = db.query(FitbitData).order_by(FitbitData.data_date.desc()).limit(3).all()
        for data in fitbit_data:
            print(f"   User {data.user_id}: {data.steps} steps, {data.sleep_hours} hrs sleep, {data.heart_rate} bpm")
            
    except Exception as e:
        print(f"❌ Error checking data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()