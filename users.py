# users.py - COMPLETE FILE
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, FitbitConnection
from auth_simple import get_current_user, get_password_hash
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    name: str

class UserUpdate(BaseModel):
    username: str = None
    email: str = None
    name: str = None
    current_password: str = None
    new_password: str = None

@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user (NO FAKE DATA)
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "User created successfully", "user_id": user.id}

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if user has Fitbit connected
    fitbit_connection = db.query(FitbitConnection).filter(FitbitConnection.user_id == current_user.id).first()
    fitbit_connected = fitbit_connection is not None
    
    # Get last sync time if connected
    fitbit_last_sync = None
    if fitbit_connection and fitbit_connection.last_sync_at:
        fitbit_last_sync = fitbit_connection.last_sync_at.isoformat()
    
    # Get Fitbit user ID if connected
    fitbit_user_id = None
    if fitbit_connection:
        fitbit_user_id = fitbit_connection.fitbit_user_id
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "name": current_user.name,
        "fitbit_connected": fitbit_connected,
        "fitbit_last_sync": fitbit_last_sync,
        "fitbit_user_id": fitbit_user_id,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@router.put("/me")
async def update_user_info(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password if changing password
    if user_data.new_password and not user_data.current_password:
        raise HTTPException(status_code=400, detail="Current password required to set new password")
    
    # Update fields
    if user_data.username:
        # Check if username is taken
        existing = db.query(User).filter(User.username == user_data.username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = user_data.username
    
    if user_data.email:
        # Check if email is taken
        existing = db.query(User).filter(User.email == user_data.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_data.email
    
    if user_data.name:
        current_user.name = user_data.name
    
    if user_data.new_password:
        from auth_simple import verify_password
        if not verify_password(user_data.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.password_hash = get_password_hash(user_data.new_password)
    
    db.commit()
    
    # Return updated user info including Fitbit status
    fitbit_connection = db.query(FitbitConnection).filter(FitbitConnection.user_id == current_user.id).first()
    fitbit_connected = fitbit_connection is not None
    fitbit_last_sync = None
    if fitbit_connection and fitbit_connection.last_sync_at:
        fitbit_last_sync = fitbit_connection.last_sync_at.isoformat()
    
    return {
        "message": "User updated successfully",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "name": current_user.name,
            "fitbit_connected": fitbit_connected,
            "fitbit_last_sync": fitbit_last_sync,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }

# Optional: Add endpoint to check Fitbit connection status specifically
@router.get("/me/fitbit-status")
async def get_fitbit_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fitbit_connection = db.query(FitbitConnection).filter(FitbitConnection.user_id == current_user.id).first()
    
    if not fitbit_connection:
        return {
            "fitbit_connected": False,
            "message": "Fitbit not connected"
        }
    
    return {
        "fitbit_connected": True,
        "fitbit_user_id": fitbit_connection.fitbit_user_id,
        "last_sync": fitbit_connection.last_sync_at.isoformat() if fitbit_connection.last_sync_at else None,
        "connected_since": fitbit_connection.connected_at.isoformat() if fitbit_connection.connected_at else None
    }

# Optional: Add endpoint to disconnect Fitbit
@router.delete("/me/fitbit-connection")
async def disconnect_fitbit(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fitbit_connection = db.query(FitbitConnection).filter(FitbitConnection.user_id == current_user.id).first()
    
    if not fitbit_connection:
        raise HTTPException(status_code=400, detail="Fitbit not connected")
    
    db.delete(fitbit_connection)
    db.commit()
    
    return {"message": "Fitbit disconnected successfully"}

@router.post("/create-demo-users")
async def create_demo_users_endpoint(db: Session = Depends(get_db)):
    """
    Create demo users for testing
    """
    try:
        # Import and run the demo creation
        from demo_data import create_demo_users
        create_demo_users()
        return {"message": "Demo users created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating demo users: {str(e)}")