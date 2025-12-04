# test_fitbit_auth.py
import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

def test_fitbit_auth():
    client_id = os.getenv("FITBIT_CLIENT_ID")
    client_secret = os.getenv("FITBIT_CLIENT_SECRET")
    
    print(f"Client ID: {client_id}")
    print(f"Client Secret: {client_secret}")
    
    if not client_id or not client_secret:
        print("❌ Fitbit credentials not found in .env file")
        return
    
    # Test basic authentication
    auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    print(f"Auth string: {auth_str}")
    
    print("✅ Fitbit credentials loaded successfully")

if __name__ == "__main__":
    test_fitbit_auth()