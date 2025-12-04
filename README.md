# CALMCAST: THE STRESS DETECTOR

CalmCast is a web-based application designed to forecast user stress levels based on physiological signals such as heart rate and behavioral inputs. The application provides users with real-time stress predictions, actionable insights, and visualizations to manage stress effectively.

## Required Applications:
- Visual Studio Code
- MAMP
  
## Authors
- Tina Abdalla
- Seth McKnight
- Oluwaseun Osho

## Introduction

Stress is a major factor affecting mental and physical health. The CalmCast Stress Forecaster leverages physiological and behavioral data to estimate and visualize stress levels. The application supports both single-user monitoring and demo scenarios to illustrate stress level variations.

## System Overview

The application architecture consists of:

Frontend: HTML, CSS, and JavaScript for interactive UI and visualization.
Backend: Node.js, storing user data and stress computation logic.
Data Sources: Heart rate sensors or manually entered data.
Stress levels are computed using a predefined algorithm based on heart rate variability and activity patterns. Users can track trends and identify high-stress periods.

## HOW TO RUN
- Download repository to device

### MAMP (Database Server)
- Open MAMP (Set Up if newly downloaded)
- Press "Start" in the corner of window. Button should turn green
- Click Webstart. It will take you to MAMP site
- In the left corner, click "Tools", then "phpMyAdmin"
- Click the "Import" tab
- In "File to Import", click "Import" and import the "Calmcast.sql" fil from this repository
- This should import the database and allow the site to run

### IN VSCODE
- Find "app.py" and right click
- Select "Run Python file in Terminal" (DO NOT CLOSE THIS TERMINAL)
- Open a new terminal (right click -> new terminal)
