# CALMCAST: THE STRESS Forecaster

Stress has become a pervasive issue in modern society, affecting both physical and mental health. Traditional stress management approaches rely on subjective self-assessment, making early detection and intervention challenging. There is a need for an objective, data-driven system that can predict stress levels based on physiological indicators.

CalmCast is a full-stack web application that leverages machine learning to forecast individual stress levels using biometric data (heart rate, sleep duration, and physical activity). The system provides personalized stress predictions with confidence scores, enabling proactive stress management through data-driven insights.
  
## Authors
- Tina Abdalla
- Seth McKnight
- Oluwaseun Osho
  

## System Overview

Frontend: HTML5, CSS3, JavaScript (ES6+), Chart.js

Backend: Python 3.9+, FastAPI, SQLAlchemy, Pydantic

Database: MySQL 8.0+ with SQLAlchemy ORM

Machine Learning: Scikit-learn (Random Forest Classifier)

Authentication: JWT (JSON Web Tokens)

External APIs: Fitbit API (OAuth 2.0)

Development: Virtual environment, Git version control

## Data Flow
Data Collection: Biometric data from Fitbit API or manual entry

Preprocessing: Data normalization and feature extraction

Prediction: ML model generates stress level (High/Low) with confidence score

Visualization: Results displayed through interactive charts and metrics

Storage: Predictions and historical data stored in MySQL database

## Prerequisites
Python 3.8+ with pip package manager

MySQL 8.0+ database server (MAMP/XAMPP recommended)

Web browser with JavaScript enabled

Git (optional, for version control)

## Required Applications:
- Visual Studio Code
- MAMP

## HOW TO RUN
Step 1: Download and Extract Project
- Download the project ZIP file

- Extract to a folder (e.g., C:\CalmCast or ~/CalmCast)

Step 2: Set Up Virtual Environment

Windows:
```
cd C:\CalmCast
python -m venv venv
venv\Scripts\activate
```
macOS
```
cd ~/CalmCast
python3 -m venv venv
source venv/bin/activate
```
You should see (venv) in your terminal prompt


Step 3: Install Python Dependencies
```
pip install fastapi uvicorn sqlalchemy pymysql pydantic python-dotenv scikit-learn pandas numpy requests python-jose passlib bcrypt joblib
```

Step 4: Start MySQL Database
Using MAMP (Recommended):
- Download and install MAMP from https://www.mamp.info
- Start MAMP
- Click "Start "
- Open phpMyAdmin (WebStart, Tools, phpMyAdmin)

Step 5: Create Database
- In phpMyAdmin:
- Click "New" in left sidebar
- Enter database name: CalmCast
- Click "Create"
- Go to "Import" tab
- Click "Choose File" and select CalmCast.sql
- Click "Go" at bottom

Step 6: Configure Environment
Create a .env file in the project folder with:
```
# Fitbit API 
FITBIT_CLIENT_ID=demo_client_id
FITBIT_CLIENT_SECRET=demo_client_secret
FITBIT_REDIRECT_URL=demo_redirect_url
DATABASE_URL=mysql+pymysql://root:root@localhost:8889/CalmCast
```
Retrive fitbit information from https://dev.fitbit.com/login (requires sign up)

Step 7: In VEN, Initialize Database
```
python setup_database.py
```

Step 8: Train Machine Learning Model
```
python data_preparation.py
python train_model.py
```
Step 9: Start Backend Server
```
python app.py
```
Server starts at: http://localhost:8000

Step 10: Start Frontend
```
python -m http.server 3000
```
Access Frontend: http://localhost:3000/

