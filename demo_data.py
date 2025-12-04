# demo_data.py
from database import SessionLocal
from models import User, FitbitData, StressPrediction, MoodEntry
from auth_simple import get_password_hash
from datetime import datetime, date, timedelta
import random

def create_demo_users():
    db = SessionLocal()
    
    try:
        # Demo users data
        demo_users = [
            {
                "name": "Sarah Johnson",
                "username": "sarah_demo",
                "email": "sarah@demo.com",
                "password": "demo123",
                "stress_profile": "High Stress"
            },
            {
                "name": "Mike Chen",
                "username": "mike_demo", 
                "email": "mike@demo.com",
                "password": "demo123",
                "stress_profile": "Low Stress"
            },
            {
                "name": "Emily Davis",
                "username": "emily_demo",
                "email": "emily@demo.com",
                "password": "demo123",
                "stress_profile": "Medium Stress"
            },
            {
                "name": "Alex Rodriguez",
                "username": "alex_demo",
                "email": "alex@demo.com",
                "password": "demo123",
                "stress_profile": "Variable Stress"
            }
        ]
        
        for user_data in demo_users:
            # Check if user already exists
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                # Create user
                user = User(
                    name=user_data["name"],
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=get_password_hash(user_data["password"]),
                    created_at=datetime.now()
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                print(f"✅ Created demo user: {user_data['name']}")
                
                # Create demo data based on stress profile
                create_demo_user_data(db, user, user_data["stress_profile"])
                
        print("🎉 Demo users created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating demo users: {e}")
        db.rollback()
    finally:
        db.close()

def create_demo_user_data(db, user, stress_profile):
    # Generate data based on stress profile
    if stress_profile == "High Stress":
        heart_rate_range = (85, 100)
        sleep_range = (4.0, 6.0)
        steps_range = (3000, 6000)
        mood_range = (1, 5)
    elif stress_profile == "Low Stress":
        heart_rate_range = (60, 70)
        sleep_range = (7.5, 9.0)
        steps_range = (8000, 12000)
        mood_range = (7, 10)
    elif stress_profile == "Medium Stress":
        heart_rate_range = (71, 84)
        sleep_range = (6.1, 7.4)
        steps_range = (6001, 7999)
        mood_range = (4, 7)
    else:  # Variable Stress
        heart_rate_range = (65, 95)
        sleep_range = (5.0, 8.0)
        steps_range = (4000, 10000)
        mood_range = (3, 9)
    
    # Create data for the last 7 days
    for days_ago in range(7):
        data_date = date.today() - timedelta(days=days_ago)
        
        # Create Fitbit data
        fitbit_data = FitbitData(
            user_id=user.id,
            heart_rate=random.randint(heart_rate_range[0], heart_rate_range[1]),
            sleep_hours=round(random.uniform(sleep_range[0], sleep_range[1]), 1),
            steps=random.randint(steps_range[0], steps_range[1]),
            calories_burned=random.randint(1800, 2500),
            data_date=data_date,
            recorded_at=datetime.now() - timedelta(days=days_ago)
        )
        db.add(fitbit_data)
        
        # Create mood entry
        mood_entry = MoodEntry(
            user_id=user.id,
            rating=random.randint(mood_range[0], mood_range[1]),
            notes=f"Demo mood entry for {data_date}",
            entry_date=data_date,
            created_at=datetime.now() - timedelta(days=days_ago)
        )
        db.add(mood_entry)
        
        # Create stress prediction
        if heart_rate_range[0] > 75:  # More clear threshold
            stress_level = "High"
        else:
            stress_level = "Low"        
        confidence = round(random.uniform(0.7, 0.95), 2)
        
        stress_pred = StressPrediction(
            user_id=user.id,
            prediction=stress_level,
            confidence=confidence,
            heart_rate=fitbit_data.heart_rate,
            sleep_hours=fitbit_data.sleep_hours,
            steps=fitbit_data.steps,
            created_at=datetime.now() - timedelta(days=days_ago)
        )
        db.add(stress_pred)
    
    db.commit()
    print(f"   📊 Created demo data for {user.name} ({stress_profile})")

if __name__ == "__main__":
    create_demo_users()