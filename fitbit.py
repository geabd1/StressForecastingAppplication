from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from database import get_db
from models import FitbitData, FitbitConnection, User, FitbitAuthSession
from auth_simple import get_current_user
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
import secrets
import base64

load_dotenv()

router = APIRouter()

# Fitbit API credentials
FITBIT_CLIENT_ID = os.getenv("FITBIT_CLIENT_ID")
FITBIT_CLIENT_SECRET = os.getenv("FITBIT_CLIENT_SECRET")
FITBIT_REDIRECT_URI = "http://localhost:8000/api/fitbit/callback"

# Pydantic models for manual data
class ManualDataRequest(BaseModel):
    sleep_hours: float
    steps: int
    heart_rate: int
    notes: str = None

@router.get("/fitbit/login")
async def fitbit_login(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not FITBIT_CLIENT_ID or not FITBIT_CLIENT_SECRET:
        raise HTTPException(
            status_code=400, 
            detail="Fitbit credentials not configured. Please set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET in .env file"
        )
    
    # Generate state parameter for security
    state_token = secrets.token_urlsafe(32)
    
    # Store the user ID in database with the state token
    expires_at = datetime.now() + timedelta(minutes=10)
    
    auth_session = FitbitAuthSession(
        user_id=current_user.id,
        state_token=state_token,
        expires_at=expires_at
    )
    
    db.add(auth_session)
    db.commit()
    
    print(f"🔐 Stored auth session for user {current_user.name} (ID: {current_user.id}) with state: {state_token}")
    
    auth_url = (
        f"https://www.fitbit.com/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={FITBIT_CLIENT_ID}&"
        f"redirect_uri={FITBIT_REDIRECT_URI}&"
        f"scope=activity%20heartrate%20sleep%20profile&"
        f"state={state_token}&"
        f"expires_in=604800"
    )
    
    return {
        "auth_url": auth_url, 
        "state": state_token
    }

@router.get("/fitbit/callback")
async def fitbit_callback(
    code: str,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    if error:
        html_content = f"""
        <html>
            <head><title>Fitbit Connection Failed</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ Fitbit Connection Failed</h2>
                <p>Error: {error}</p>
                <p>Please try again.</p>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'fitbit_connected',
                            success: false,
                            message: 'Fitbit authorization failed: {error}'
                        }}, '*');
                    }}
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    if not code:
        html_content = """
        <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ No Authorization Code</h2>
                <p>No authorization code received from Fitbit.</p>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'fitbit_connected',
                            success: false,
                            message: 'No authorization code received'
                        }}, '*');
                    }}
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    if not state:
        html_content = """
        <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ Invalid Session</h2>
                <p>No state parameter received. Please try connecting again.</p>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'fitbit_connected',
                            success: false,
                            message: 'Invalid session'
                        }}, '*');
                    }}
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    try:
        print(f"🔐 Processing callback with state: {state}")
        print(f"🔐 Authorization code: {code[:10]}...")
        
        # Find the auth session by state token
        auth_session = db.query(FitbitAuthSession).filter(
            FitbitAuthSession.state_token == state,
            FitbitAuthSession.expires_at > datetime.now()
        ).first()
        
        if not auth_session:
            print(f"❌ No valid auth session found for state: {state}")
            html_content = """
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #f44336;">❌ Session Expired</h2>
                    <p>Your connection session has expired. Please try connecting again from your profile page.</p>
                    <script>
                        if (window.opener) {{
                            window.opener.postMessage({{
                                type: 'fitbit_connected',
                                success: false,
                                message: 'Session expired'
                            }}, '*');
                        }}
                        setTimeout(() => window.close(), 5000);
                    </script>
                </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        
        # Get the user from the auth session
        user = db.query(User).filter(User.id == auth_session.user_id).first()
        if not user:
            print(f"❌ User not found for ID: {auth_session.user_id}")
            html_content = """
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2 style="color: #f44336;">❌ User Not Found</h2>
                    <p>User account not found. Please make sure you're logged in.</p>
                    <script>
                        if (window.opener) {{
                            window.opener.postMessage({{
                                type: 'fitbit_connected',
                                success: false,
                                message: 'User not found'
                            }}, '*');
                        }}
                        setTimeout(() => window.close(), 5000);
                    </script>
                </body>
            </html>
            """
            return HTMLResponse(content=html_content)
        
        print(f"✅ Found user: {user.name} (ID: {user.id})")
        
        # Exchange code for tokens
        token_url = "https://api.fitbit.com/oauth2/token"
        
        # Create Basic Auth header
        auth_str = base64.b64encode(f"{FITBIT_CLIENT_ID}:{FITBIT_CLIENT_SECRET}".encode()).decode()
        
        data = {
            "grant_type": "authorization_code",
            "client_id": FITBIT_CLIENT_ID,
            "redirect_uri": FITBIT_REDIRECT_URI,
            "code": code
        }
        
        print(f"📤 Making token request to Fitbit...")
        
        response = requests.post(
            token_url,
            headers={
                "Authorization": f"Basic {auth_str}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data=data
        )
        
        print(f"📥 Token response status: {response.status_code}")
        
        if response.status_code != 200:
            error_data = response.json()
            error_detail = error_data.get('errors', [{}])[0].get('message', 'Unknown error')
            print(f"❌ Fitbit API error: {error_detail}")
            
            # Clean up the auth session
            db.delete(auth_session)
            db.commit()
            
            raise HTTPException(
                status_code=400, 
                detail=f"Fitbit token error: {response.status_code} - {error_detail}"
            )
        
        token_data = response.json()
        fitbit_user_id = token_data["user_id"]
        print(f"✅ Token exchange successful for Fitbit user: {fitbit_user_id}")
        
        # Update or create Fitbit connection
        fitbit_conn = db.query(FitbitConnection).filter(FitbitConnection.user_id == user.id).first()
        if not fitbit_conn:
            fitbit_conn = FitbitConnection(user_id=user.id)
        
        # Use proper datetime instead of timestamp
        current_time = datetime.now()
        expires_at = current_time + timedelta(seconds=token_data["expires_in"])
        
        fitbit_conn.fitbit_user_id = fitbit_user_id
        fitbit_conn.access_token = token_data["access_token"]
        fitbit_conn.refresh_token = token_data["refresh_token"]
        fitbit_conn.token_expires_at = expires_at
        fitbit_conn.connected_at = current_time
        fitbit_conn.last_sync_at = current_time
        
        db.add(fitbit_conn)
        
        # Clean up the auth session
        db.delete(auth_session)
        db.commit()
        
        print(f"✅ Fitbit connection saved to database for user {user.name}")
        
        # Return success page with the ACTUAL user's name
        html_content = f"""
        <html>
            <head><title>Fitbit Connected</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #4CAF50;">✅ Fitbit Connected Successfully!</h2>
                <p>Your Fitbit account has been connected to <strong>{user.name}</strong>'s CalmCast account.</p>
                <p>You can now close this window and return to the app.</p>
                <script>
                    // Notify the main window that connection was successful
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'fitbit_connected',
                            success: true,
                            message: 'Fitbit connected successfully',
                            user_id: '{user.id}',
                            user_name: '{user.name}'
                        }}, '*');
                    }}
                    
                    // Auto-close after 3 seconds
                    setTimeout(() => {{
                        window.close();
                    }}, 3000);
                </script>
            </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Fitbit connection error: {e}")
        
        # Clean up any auth session if it exists
        if 'auth_session' in locals():
            db.delete(auth_session)
            db.commit()
        
        # Return error page
        html_content = f"""
        <html>
            <head><title>Fitbit Connection Failed</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #f44336;">❌ Fitbit Connection Failed</h2>
                <p>There was an error connecting your Fitbit account: {str(e)}</p>
                <p>Please try again or contact support.</p>
                <script>
                    // Notify the main window that connection failed
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'fitbit_connected', 
                            success: false,
                            message: 'Fitbit connection failed: {str(e)}'
                        }}, '*');
                    }}
                    
                    // Auto-close after 5 seconds
                    setTimeout(() => {{
                        window.close();
                    }}, 5000);
                </script>
            </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)

@router.get("/fitbit/historical/{date}")
async def get_historical_data(
    date: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get historical data for a specific date (for demo users)
    """
    try:
        # Parse date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        
        # Get data for this date
        fitbit_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == target_date
        ).first()
        
        if fitbit_data:
            return {
                "status": "success",
                "data": {
                    "sleep_hours": float(fitbit_data.sleep_hours) if fitbit_data.sleep_hours else 0,
                    "steps": fitbit_data.steps,
                    "heart_rate": fitbit_data.heart_rate,
                    "calories_burned": fitbit_data.calories_burned if fitbit_data.calories_burned else 0,
                    "data_date": fitbit_data.data_date.isoformat(),
                    "source": "historical_database"
                }
            }
        else:
            # Return default based on user ID (for demo)
            return get_demo_data_for_user(current_user.id, target_date)
            
    except Exception as e:
        print(f"❌ Error getting historical data: {e}")
        return get_demo_data_for_user(current_user.id, datetime.now().date())

def get_demo_data_for_user(user_id: int, date: date):
    """Return demo data based on user ID pattern"""
    # User 18: High stress
    if user_id == 18:
        return {
            "status": "success",
            "data": {
                "sleep_hours": 4.5,
                "steps": 3200,
                "heart_rate": 95,
                "calories_burned": 1650,
                "data_date": date.isoformat(),
                "source": "demo_high_stress"
            }
        }
    # User 19: Low stress
    elif user_id == 19:
        return {
            "status": "success",
            "data": {
                "sleep_hours": 8.2,
                "steps": 11200,
                "heart_rate": 65,
                "calories_burned": 2100,
                "data_date": date.isoformat(),
                "source": "demo_low_stress"
            }
        }
    # User 20: Variable
    elif user_id == 20:
        return {
            "status": "success",
            "data": {
                "sleep_hours": 6.5,
                "steps": 5800,
                "heart_rate": 78,
                "calories_burned": 1850,
                "data_date": date.isoformat(),
                "source": "demo_variable"
            }
        }
    # User 21: Recovery
    elif user_id == 21:
        return {
            "status": "success",
            "data": {
                "sleep_hours": 7.8,
                "steps": 8200,
                "heart_rate": 72,
                "calories_burned": 2050,
                "data_date": date.isoformat(),
                "source": "demo_recovery"
            }
        }
    else:
        # Default
        return {
            "status": "success",
            "data": {
                "sleep_hours": 7.0,
                "steps": 7500,
                "heart_rate": 75,
                "calories_burned": 1900,
                "data_date": date.isoformat(),
                "source": "demo_default"
            }
        }
@router.get("/fitbit/data")
async def get_fitbit_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get Fitbit data - always returns manual data if it exists for today
    """
    try:
        print(f"📊 Getting health data for user: {current_user.name}")
        
        # FIRST: Check for manual data from today
        today = date.today()
        manual_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == today,
            FitbitData.is_manual_edit == True
        ).first()
        
        if manual_data:
            print(f"✅ Returning manual data for {current_user.name}")
            return {
                "steps": manual_data.steps,
                "sleep_hours": float(manual_data.sleep_hours) if manual_data.sleep_hours else 0,
                "heart_rate": manual_data.heart_rate,
                "calories_burned": manual_data.calories_burned if manual_data.calories_burned else 0,
                "last_sync": manual_data.recorded_at.isoformat() if manual_data.recorded_at else datetime.now().isoformat(),
                "is_simulated": False,
                "is_manual_edit": True,
                "source": "manual"
            }
        
        # SECOND: If no manual data, check Fitbit connection
        fitbit_conn = db.query(FitbitConnection).filter(FitbitConnection.user_id == current_user.id).first()
        
        if not fitbit_conn or not fitbit_conn.access_token:
            # If no Fitbit connection, return default/empty data
            print(f"ℹ️ No Fitbit connection for {current_user.name}, returning default data")
            return {
                "steps": 0,
                "sleep_hours": 0.0,
                "heart_rate": 0,
                "calories_burned": 0,
                "last_sync": datetime.now().isoformat(),
                "is_simulated": True,
                "is_manual_edit": False,
                "source": "none"
            }
        
        # THIRD: Fetch from Fitbit API
        print(f"📡 Fetching Fitbit data for {current_user.name}")
        today_str = today.isoformat()
        headers = {
            "Authorization": f"Bearer {fitbit_conn.access_token}",
            "Accept": "application/json"
        }
        
        # Get steps data
        steps = 0
        try:
            steps_response = requests.get(
                f"https://api.fitbit.com/1/user/{fitbit_conn.fitbit_user_id}/activities/steps/date/{today_str}/1d.json",
                headers=headers
            )
            if steps_response.status_code == 200:
                steps_data = steps_response.json()
                if steps_data["activities-steps"]:
                    steps = int(steps_data["activities-steps"][0]["value"])
        except Exception as e:
            print(f"❌ Error fetching steps: {e}")
        
        # Get sleep data
        sleep_hours = 0.0
        try:
            sleep_response = requests.get(
                f"https://api.fitbit.com/1.2/user/{fitbit_conn.fitbit_user_id}/sleep/date/{today_str}.json",
                headers=headers
            )
            if sleep_response.status_code == 200:
                sleep_data = sleep_response.json()
                if sleep_data["sleep"]:
                    total_minutes = sum(sleep["minutesAsleep"] for sleep in sleep_data["sleep"])
                    sleep_hours = round(total_minutes / 60, 1)
        except Exception as e:
            print(f"❌ Error fetching sleep: {e}")
        
        # Get heart rate data
        heart_rate = 0
        try:
            heart_response = requests.get(
                f"https://api.fitbit.com/1/user/{fitbit_conn.fitbit_user_id}/activities/heart/date/{today_str}/1d.json",
                headers=headers
            )
            if heart_response.status_code == 200:
                heart_data = heart_response.json()
                if heart_data["activities-heart"]:
                    resting_heart_rate = heart_data["activities-heart"][0]["value"].get("restingHeartRate")
                    if resting_heart_rate:
                        heart_rate = resting_heart_rate
        except Exception as e:
            print(f"❌ Error fetching heart rate: {e}")
        
        # Save Fitbit data to database
        existing_fitbit_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == today,
            FitbitData.is_manual_edit == False
        ).first()
        
        if existing_fitbit_data:
            existing_fitbit_data.heart_rate = heart_rate
            existing_fitbit_data.sleep_hours = sleep_hours
            existing_fitbit_data.steps = steps
            existing_fitbit_data.calories_burned = steps * 0.04
            existing_fitbit_data.recorded_at = datetime.now()
        else:
            fitbit_data = FitbitData(
                user_id=current_user.id,
                heart_rate=heart_rate,
                sleep_hours=sleep_hours,
                steps=steps,
                calories_burned=steps * 0.04,
                data_date=today,
                is_manual_edit=False
            )
            db.add(fitbit_data)
        
        # Update last sync time
        fitbit_conn.last_sync_at = datetime.now()
        db.commit()
        
        print(f"✅ Fitbit data fetched: {steps} steps, {sleep_hours} hrs sleep, {heart_rate} bpm")
        
        return {
            "steps": steps,
            "sleep_hours": sleep_hours,
            "heart_rate": heart_rate,
            "calories_burned": steps * 0.04,
            "last_sync": datetime.now().isoformat(),
            "is_simulated": False,
            "is_manual_edit": False,
            "source": "fitbit"
        }
        
    except Exception as e:
        print(f"❌ Error getting Fitbit data: {e}")
        # Return default data on error
        return {
            "steps": 0,
            "sleep_hours": 0.0,
            "heart_rate": 0,
            "calories_burned": 0,
            "last_sync": datetime.now().isoformat(),
            "is_simulated": True,
            "is_manual_edit": False,
            "source": "error"
        }
        
@router.post("/fitbit/manual-data")
async def save_manual_data(
    data: ManualDataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save manually edited health data
    """
    try:
        print(f"💾 Saving manual data for user {current_user.name}:")
        print(f"   Sleep: {data.sleep_hours}h, Steps: {data.steps}, HR: {data.heart_rate}bpm")
        
        # Validate data
        if data.sleep_hours < 0 or data.sleep_hours > 24:
            raise HTTPException(status_code=400, detail="Sleep hours must be between 0 and 24")
        
        if data.steps < 0 or data.steps > 50000:
            raise HTTPException(status_code=400, detail="Steps must be between 0 and 50,000")
        
        if data.heart_rate < 40 or data.heart_rate > 120:
            raise HTTPException(status_code=400, detail="Heart rate must be between 40 and 120 bpm")
        
        # Check if data already exists for today
        existing_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == date.today()
        ).first()

        if existing_data:
            # UPDATE existing record
            existing_data.heart_rate = data.heart_rate
            existing_data.sleep_hours = data.sleep_hours
            existing_data.steps = data.steps
            existing_data.calories_burned = data.steps * 0.04
            existing_data.recorded_at = datetime.now()
            existing_data.is_manual_edit = True
            action = "updated"
        else:
            # CREATE new record
            fitbit_data = FitbitData(
                user_id=current_user.id,
                heart_rate=data.heart_rate,
                sleep_hours=data.sleep_hours,
                steps=data.steps,
                calories_burned=data.steps * 0.04,
                data_date=date.today(),
                recorded_at=datetime.now(),
                is_manual_edit=True
            )
            db.add(fitbit_data)
            action = "created"

        db.commit()
        
        print(f"✅ Manual data {action} successfully for user {current_user.name}")
        
        return {
            "status": "success",
            "message": f"Manual data {action} successfully",
            "action": action,
            "data": {
                "sleep_hours": data.sleep_hours,
                "steps": data.steps,
                "heart_rate": data.heart_rate,
                "is_manual_edit": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to save manual data: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save manual data: {str(e)}"
        )

@router.get("/fitbit/manual-data/history")
async def get_manual_data_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get history of manual data edits
    """
    try:
        # Get manual data entries (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        manual_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.is_manual_edit == True,
            FitbitData.data_date >= thirty_days_ago.date()
        ).order_by(FitbitData.recorded_at.desc()).all()
        
        return {
            "manual_entries": [
                {
                    "sleep_hours": entry.sleep_hours,
                    "steps": entry.steps,
                    "heart_rate": entry.heart_rate,
                    "date": entry.data_date.isoformat(),
                    "recorded_at": entry.recorded_at.isoformat() if entry.recorded_at else None
                }
                for entry in manual_data
            ],
            "total_entries": len(manual_data)
        }
        
    except Exception as e:
        print(f"❌ Failed to get manual data history: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get manual data history: {str(e)}"
        )

@router.get("/fitbit/current-data")
async def get_current_fitbit_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the most recent Fitbit data (either from Fitbit or manual entry)
    """
    try:
        # Get the most recent data for today
        today_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == date.today()
        ).first()
        
        if today_data:
            return {
                "sleep_hours": float(today_data.sleep_hours) if today_data.sleep_hours else None,
                "steps": today_data.steps,
                "heart_rate": today_data.heart_rate,
                "is_manual_edit": today_data.is_manual_edit or False,
                "data_date": today_data.data_date.isoformat(),
                "source": "manual" if today_data.is_manual_edit else "fitbit"
            }
        else:
            # Return default values if no data exists
            return {
                "sleep_hours": None,
                "steps": None,
                "heart_rate": None,
                "is_manual_edit": False,
                "data_date": date.today().isoformat(),
                "source": "none"
            }
            
    except Exception as e:
        print(f"❌ Failed to get current data: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get current data: {str(e)}"
        )

@router.delete("/fitbit/manual-data/today")
async def delete_today_manual_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete today's manual data entry (allow re-entry)
    """
    try:
        # Find today's manual data
        today_manual_data = db.query(FitbitData).filter(
            FitbitData.user_id == current_user.id,
            FitbitData.data_date == date.today(),
            FitbitData.is_manual_edit == True
        ).first()
        
        if today_manual_data:
            db.delete(today_manual_data)
            db.commit()
            return {
                "status": "success",
                "message": "Today's manual data deleted successfully"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="No manual data found for today"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to delete manual data: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete manual data: {str(e)}"
        )
