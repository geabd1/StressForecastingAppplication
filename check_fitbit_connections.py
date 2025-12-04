# check_fitbit_connections.py
from database import SessionLocal
from models import FitbitConnection, User

def check_fitbit_connections():
    db = SessionLocal()
    try:
        # Find all Fitbit connections
        connections = db.query(FitbitConnection).all()
        
        print("🔍 Current Fitbit Connections:")
        for conn in connections:
            user = db.query(User).filter(User.id == conn.user_id).first()
            if user:
                print(f"  👤 {user.name} (ID: {user.id}) -> Fitbit ID: {conn.fitbit_user_id}")
            else:
                print(f"  ❓ User ID {conn.user_id} -> Fitbit ID: {conn.fitbit_user_id}")
        
        # Check specifically for your Fitbit ID
        your_fitbit = db.query(FitbitConnection).filter(FitbitConnection.fitbit_user_id == 'CTZZX6').first()
        if your_fitbit:
            user = db.query(User).filter(User.id == your_fitbit.user_id).first()
            print(f"\n🎯 YOUR Fitbit account (CTZZX6) is connected to: {user.name if user else 'Unknown User'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_fitbit_connections()