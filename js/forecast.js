// forecast.js - COMPLETE FILE WITH MANUAL DATA PERSISTENCE (FULL RESTORED + PATCHED)

document.addEventListener('DOMContentLoaded', function() {
    if (!userManager.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    const user = userManager.getCurrentUser();
    
    // Update welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        if (user.fitbit_connected) {
            welcomeMessage.textContent = `Hello ${user.name}, here's your stress forecast based on your recent data.`;
            // First load manual data, then load forecast
            loadPersistentManualData().then(() => {
                loadForecastData();
            });
        } else {
            welcomeMessage.innerHTML = `Hello ${user.name} <br><strong>Connect Fitbit to see your personalized stress forecast</strong>`;
            showFitbitConnectionPrompt();
        }
    }
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh-forecast');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            if (userManager.getCurrentUser().fitbit_connected) {
                // Check if we have manual data first
                const hasManualData = await checkManualDataForToday();
                if (hasManualData) {
                    if (confirm('You have manually entered data. Refresh will keep your manual data. Continue?')) {
                        loadForecastData();
                    }
                } else {
                    loadForecastData();
                }
            } else {
                alert('Please connect your Fitbit account first to see forecasts.');
            }
        });
    }

    // Setup edit data modal
    setupEditDataModal();

    // Load manual data from session storage for immediate display
    loadManualDataFromSession();

    // Listen for Fitbit connection messages
    window.addEventListener('message', function(event) {
        if (event.data.type === 'fitbit_connected' && event.data.success) {
            console.log('✅ Fitbit connected message received on forecast page');
            // Refresh user data and reload forecast
            userManager.refreshUserData().then(() => {
                window.location.reload();
            });
        }
    });
    
    // Debug info
    setTimeout(debugForecastState, 1000);
});

// ==================== MANUAL DATA PERSISTENCE FUNCTIONS ====================

async function loadPersistentManualData() {
    try {
        console.log('🔄 Loading persistent manual data...');
        const user = userManager.getCurrentUser();
        
        // Check local storage first (for immediate UI update)
        if (user.manual_data) {
            console.log('📂 Found manual data in local storage:', user.manual_data);
            updateDataDisplay(user.manual_data);
            addEditIndicators();
            return true;
        }
        
        // Then check backend for confirmation
        const currentData = await userManager.apiCall('/fitbit/current-data');
        console.log('📊 Current data from backend:', currentData);
        
        if (currentData && currentData.source === 'manual' && currentData.sleep_hours != null && currentData.steps != null && currentData.heart_rate != null) {
            console.log('✅ Backend confirms manual data exists');
            const manualData = {
                sleep_hours: currentData.sleep_hours,
                steps: currentData.steps,
                heart_rate: currentData.heart_rate,
                is_manual_edit: true,
                timestamp: new Date().toISOString()
            };
            
            // Update local storage with backend data
            user.manual_data = manualData;
            userManager.saveLocalUserData();
            
            // Update UI
            updateDataDisplay(manualData);
            addEditIndicators();
            
            // Update last updated indicator
            const lastUpdated = document.getElementById('last-updated');
            if (lastUpdated && currentData.data_date) {
                const date = new Date(currentData.data_date).toLocaleDateString();
                lastUpdated.textContent = `Manual data from ${date}`;
            }
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error loading persistent manual data:', error);
        return false;
    }
}

function loadManualDataFromSession() {
    try {
        const manualDataStr = sessionStorage.getItem('manual_data');
        if (manualDataStr) {
            const manualData = JSON.parse(manualDataStr);
            console.log('📂 Loaded manual data from session:', manualData);
            
            // Only use session data if it's from today
            const today = new Date().toDateString();
            if (manualData.timestamp) {
                const dataDate = new Date(manualData.timestamp).toDateString();
                if (dataDate === today) {
                    updateDataDisplay(manualData);
                    return true;
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading from session storage:', error);
    }
    return false;
}

async function checkManualDataForToday() {
    try {
        const currentData = await userManager.apiCall('/fitbit/current-data');
        return currentData && currentData.source === 'manual';
    } catch (error) {
        console.error('❌ Error checking manual data:', error);
        return false;
    }
}

// ==================== EDIT DATA MODAL FUNCTIONS ====================

function setupEditDataModal() {
    const editButtons = document.querySelectorAll('.edit-data-btn');
    const modal = document.getElementById('edit-data-modal');
    const closeButton = document.getElementById('close-edit-modal');
    const cancelButton = document.getElementById('cancel-edit');
    const saveButton = document.getElementById('save-edited-data');
    
    // Open modal when edit buttons are clicked
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.data-card');
            openEditModal(card);
        });
    });
    
    // Close modal events
    if (closeButton) closeButton.addEventListener('click', closeEditModal);
    if (cancelButton) cancelButton.addEventListener('click', closeEditModal);
    
    // Save edited data
    if (saveButton) saveButton.addEventListener('click', saveEditedData);
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeEditModal();
            }
        });
    }
}

function openEditModal(card) {
    const modal = document.getElementById('edit-data-modal');
    const currentData = getCurrentCardData(card);
    
    // Populate form with current data
    const sleepInput = document.getElementById('edit-sleep-hours');
    const stepsInput = document.getElementById('edit-steps');
    const hrInput = document.getElementById('edit-heart-rate');
    const notesInput = document.getElementById('edit-notes');

    if (sleepInput) sleepInput.value = currentData.sleep || '';
    if (stepsInput) stepsInput.value = currentData.steps || '';
    if (hrInput) hrInput.value = currentData.heartRate || '';
    if (notesInput) notesInput.value = '';
    
    // Store which card we're editing
    if (modal) modal.currentCard = card;
    
    // Show modal
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.opacity = '1';
            // Focus on first field
            if (sleepInput) sleepInput.focus();
        }, 10);
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-data-modal');
    if (!modal) return;
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.currentCard = null;
    }, 300);
}

function getCurrentCardData(card) {
    const data = {};
    const user = userManager.getCurrentUser();
    
    // First check local storage for manual data
    if (user && user.manual_data) {
        data.sleep = user.manual_data.sleep_hours;
        data.steps = user.manual_data.steps;
        data.heartRate = user.manual_data.heart_rate;
        return data;
    }
    
    // Then check the UI elements
    const sleepElement = document.getElementById('sleep-hours');
    const stepsElement = document.getElementById('exercise-frequency');
    const heartRateElement = document.getElementById('heart-rate-bpm');
    
    if (sleepElement && sleepElement.textContent !== '-- hrs/night') {
        // extract number from "X hrs/night"
        const m = sleepElement.textContent.match(/([\d.]+)/);
        data.sleep = m ? parseFloat(m[1]) : null;
    }
    if (stepsElement && stepsElement.textContent !== '-- steps/day') {
        data.steps = parseInt(stepsElement.textContent.replace(/,/g, '')) || null;
    }
    if (heartRateElement && heartRateElement.textContent !== '-- bpm') {
        data.heartRate = parseInt(heartRateElement.textContent) || null;
    }
    
    return data;
}




async function saveEditedData() {
    const modal = document.getElementById('edit-data-modal');
    const saveButton = document.getElementById('save-edited-data');
    const originalText = saveButton ? saveButton.textContent : 'Save';
    
    try {
        if (saveButton) {
            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;
        }
        
        // Get form values
        const sleepHours = parseFloat(document.getElementById('edit-sleep-hours').value);
        const steps = parseInt(document.getElementById('edit-steps').value);
        const heartRate = parseInt(document.getElementById('edit-heart-rate').value);
        const notes = document.getElementById('edit-notes').value;
        
        // Validate data
        if (isNaN(sleepHours) || isNaN(steps) || isNaN(heartRate)) {
            throw new Error('Please fill in all fields with valid numbers');
        }
        
        if (sleepHours < 0 || sleepHours > 24) {
            throw new Error('Sleep hours must be between 0 and 24');
        }
        
        if (steps < 0 || steps > 50000) {
            throw new Error('Steps must be between 0 and 50,000');
        }
        
        if (heartRate < 40 || heartRate > 120) {
            throw new Error('Heart rate must be between 40 and 120 bpm');
        }
        
        const editedData = {
            sleep_hours: sleepHours,
            steps: steps,
            heart_rate: heartRate,
            notes: notes,
            is_manual_edit: true,
            timestamp: new Date().toISOString()
        };
        
        console.log('💾 Saving edited data:', editedData);
        
        // Save to backend
        let backendResponse;
        try {
            backendResponse = await saveManualDataToBackend(editedData);
            console.log('✅ Backend save successful:', backendResponse);
        } catch (backendError) {
            console.log('🔄 Backend save failed, saving locally:', backendError);
            saveManualDataLocally(editedData);
            // Inform user but continue flow (we saved locally)
            alert('Unable to save to server. Your changes are saved locally and will persist on this device.');
            // Still proceed to update UI with local data
        }
        
        // Update local storage and session storage (use user.manual_data)
        const user = userManager.getCurrentUser();
        user.manual_data = editedData;
        userManager.saveLocalUserData();
        sessionStorage.setItem('manual_data', JSON.stringify(editedData));
        
        // Update UI
        updateDataDisplay(editedData);
        
        // Close modal
        closeEditModal();
        
        // Refresh forecast with new data
        await refreshForecastWithManualData(editedData);
        
        // Show success message
        const action = backendResponse?.action || 'saved';
        alert(`✅ Data ${action} successfully! Your changes will persist across page refreshes.`);
        
    } catch (error) {
        console.error('❌ Failed to save edited data:', error);
        alert(error.message || 'Failed to save data');
    } finally {
        if (saveButton) {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
    }
}

async function saveManualDataToBackend(editedData) {
    try {
        console.log('📤 Sending manual data to backend:', editedData);
        
        // NOTE: userManager.apiCall will use this.API_BASE (http://localhost:8000/api)
        // so endpoint below should be '/fitbit/manual-data' to produce '/api/fitbit/manual-data'
        const response = await userManager.apiCall('/fitbit/manual-data', {
            method: 'POST',
            body: {
                sleep_hours: editedData.sleep_hours,
                steps: editedData.steps,
                heart_rate: editedData.heart_rate,
                notes: editedData.notes
            }
        });
        
        console.log('✅ Backend response:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Backend save failed:', error);
        
        // Check if it's a connection error or server error
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('Cannot connect'))) {
            throw new Error('Cannot connect to server. Data saved locally.');
        } else {
            // Re-throw server-provided message if present
            throw new Error(error.message || 'Server error. Data saved locally.');
        }
    }
}

function saveManualDataLocally(editedData) {
    const user = userManager.getCurrentUser();
    
    // Store for immediate UI use
    user.manual_data = editedData;
    
    // Also store in edits history
    if (!user.manual_data_edits) {
        user.manual_data_edits = [];
    }
    
    // Check if we already have manual data for today
    const today = new Date().toDateString();
    const existingIndex = user.manual_data_edits.findIndex(edit => 
        edit.timestamp && new Date(edit.timestamp).toDateString() === today
    );
    
    if (existingIndex !== -1) {
        user.manual_data_edits[existingIndex] = editedData;
    } else {
        user.manual_data_edits.push(editedData);
    }
    
    userManager.saveLocalUserData();
    console.log('💾 Manual data saved locally:', editedData);
}

function updateDataDisplay(editedData) {
    console.log('🎨 Updating UI with manual data:', editedData);
    
    // Update the UI with edited data
    if (editedData.sleep_hours !== undefined) {
        const sleepElement = document.getElementById('sleep-hours');
        if (sleepElement) {
            sleepElement.textContent = `${editedData.sleep_hours} hrs/night`;
        }
    }
    
    if (editedData.steps !== undefined) {
        const stepsElement = document.getElementById('exercise-frequency');
        if (stepsElement) {
            stepsElement.textContent = `${editedData.steps.toLocaleString()} steps/day`;
        }
    }
    
    if (editedData.heart_rate !== undefined) {
        const heartRateElement = document.getElementById('heart-rate-bpm');
        if (heartRateElement) {
            heartRateElement.textContent = `${editedData.heart_rate} bpm`;
        }
    }
    
    // Add edit indicator
    addEditIndicators();
    
    // Update data source indicator
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString() + ' (Manual Data)';
    }
    
    // Add "Edited" class to data cards
    const dataCards = document.querySelectorAll('.data-card');
    dataCards.forEach(card => {
        card.classList.add('edited');
    });
}

function addEditIndicators() {
    const cards = document.querySelectorAll('.data-card');
    cards.forEach(card => {
        // Remove existing indicators
        const existingIndicators = card.querySelectorAll('.edit-indicator');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Add new indicator
        const indicator = document.createElement('div');
        indicator.className = 'edit-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            background: #4CAF50;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: bold;
            z-index: 10;
        `;
        indicator.textContent = 'EDITED';
        card.style.position = 'relative';
        card.appendChild(indicator);
    });
}

// ==================== FORECAST DATA FUNCTIONS ====================

async function loadForecastData() {
    const refreshBtn = document.getElementById('refresh-forecast');
    const originalText = refreshBtn ? refreshBtn.textContent : '';
    
    try {
        if (refreshBtn) {
            refreshBtn.textContent = '🔄 Loading...';
            refreshBtn.disabled = true;
        }

        console.log('📡 Loading forecast data...');
        
        // Check if we have manual data for today
        const hasManualData = await checkManualDataForToday();
        const user = userManager.getCurrentUser();
        
        if (hasManualData && user.manual_data) {
            console.log('✅ Using manual data for forecast');
            const forecast = await generateForecastFromManualData(user.manual_data, user);
            updateForecastUI(forecast, user.manual_data);
            
            const lastUpdated = document.getElementById('last-updated');
            if (lastUpdated) {
                lastUpdated.textContent = new Date().toLocaleString() + ' (Manual Data)';
            }
        } else {
            // Fetch fresh data from backend
            const fitbitData = await userManager.getFitbitData();
            
            console.log('✅ Data received:', {
                steps: fitbitData.steps,
                sleep_hours: fitbitData.sleep_hours,
                heart_rate: fitbitData.heart_rate,
                is_manual_edit: fitbitData.is_manual_edit,
                source: fitbitData.source
            });
            
            // If this is manual data, store it
            if (fitbitData.is_manual_edit) {
                user.manual_data = {
                    sleep_hours: fitbitData.sleep_hours,
                    steps: fitbitData.steps,
                    heart_rate: fitbitData.heart_rate,
                    is_manual_edit: true,
                    timestamp: new Date().toISOString()
                };
                userManager.saveLocalUserData();
                sessionStorage.setItem('manual_data', JSON.stringify(user.manual_data));
            }
            
            // Get ML model prediction
            const mlPrediction = await getMLPrediction(fitbitData);
            
            // Generate forecast
            const forecast = generateForecast(fitbitData, user, mlPrediction);
            
            // Update the UI
            updateForecastUI(forecast, fitbitData);
            
            // Update last updated timestamp
            const lastUpdated = document.getElementById('last-updated');
            if (lastUpdated) {
                const sourceText = fitbitData.is_manual_edit ? ' (Manual Data)' : ' (Fitbit Data)';
                lastUpdated.textContent = new Date().toLocaleString() + sourceText;
            }
        }
        
    } catch (error) {
        console.error('Failed to load forecast:', error);
        
        // Show user-friendly message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `Hello ${userManager.getCurrentUser().name}, <br><strong>Connect Fitbit to see your stress forecast</strong>`;
        }
        
        // Show connection prompt in the forecast sections
        showFitbitConnectionPrompt();
        
    } finally {
        if (refreshBtn) {
            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
        }
    }
}

async function refreshForecastWithManualData(manualData) {
    try {
        console.log('🔄 Refreshing forecast with manual data:', manualData);
        
        const forecastData = {
            ...manualData,
            is_simulated: false,
            is_manual_edit: true,
            last_sync: new Date().toISOString()
        };
        
        const user = userManager.getCurrentUser();
        
        // Generate new forecast with manual data
        const mlPrediction = await getMLPrediction(forecastData);
        const forecast = generateForecast(forecastData, user, mlPrediction);
        
        // Update the UI
        updateForecastUI(forecast, forecastData);
        
    } catch (error) {
        console.error('❌ Failed to refresh forecast with manual data:', error);
    }
}

async function generateForecastFromManualData(manualData, user) {
    const mlPrediction = await getMLPrediction(manualData);
    return generateForecast(manualData, user, mlPrediction);
}

// ==================== ML PREDICTION FUNCTIONS ====================

async function getMLPrediction(fitbitData) {
    try {
        const prediction = await userManager.apiCall('/stress/predict', {
            method: 'POST',
            body: {
                heart_rate: fitbitData.heart_rate,
                sleep_hours: fitbitData.sleep_hours,
                steps: fitbitData.steps
            }
        });
        
        console.log('🎯 ML Prediction Result:', prediction);
        return prediction;
        
    } catch (error) {
        console.error('❌ ML prediction failed:', error);
        // Fallback to local calculation
        return {
            status: 'success',
            prediction: calculateFallbackPrediction(fitbitData),
            confidence: 0.7,
            method: 'fallback'
        };
    }
}

function calculateFallbackPrediction(fitbitData) {
    const stressScore = (fitbitData.heart_rate - 60) / 20 + (8 - fitbitData.sleep_hours) + (10000 - fitbitData.steps) / 5000;
    return stressScore > 2 ? 'High' : 'Low';
}

// ==================== FORECAST GENERATION FUNCTIONS ====================

function generateForecast(fitbitData, user, mlPrediction) {
    const avgMood = userManager.getAverageMood();
    const weeklyMoodData = userManager.getWeeklyMoodData();
    
    console.log('📊 Generating forecast with:', {
        fitbitData: {
            steps: fitbitData.steps,
            sleep: fitbitData.sleep_hours,
            heart_rate: fitbitData.heart_rate,
            is_manual_edit: fitbitData.is_manual_edit
        },
        mlPrediction: mlPrediction,
        avgMood: avgMood,
        moodDataPoints: weeklyMoodData.filter(day => day.rating !== null).length
    });
    
    // Use ML prediction if available, otherwise calculate locally
    let stressLevel, stressDescription, stressColor, stressScore, confidence;
    
    if (mlPrediction && mlPrediction.status === 'success') {
    stressLevel = mlPrediction.prediction;

    // Use fallback numeric calculation for full 1–10 scale
    const numericScore = calculateStressScore(fitbitData, avgMood, weeklyMoodData);

    // Adjust numericScore to match ML category
    if (stressLevel === 'High' && numericScore < 6) {
        stressScore = 6; // minimum for High
    } else if (stressLevel === 'Low' && numericScore > 5) {
        stressScore = 5; // maximum for Low
    } else {
        stressScore = numericScore; // otherwise keep numeric value
    }

    confidence = mlPrediction.confidence || 0.8;
    stressDescription = getMLStressDescription(stressLevel, confidence, mlPrediction.method);
    stressColor = stressLevel === 'High' ? 'mood-low' : 'mood-high';
}

    
    // Generate insights
    const dailyInsights = generateDailyInsights(fitbitData, avgMood, mlPrediction);
    const weeklyInsights = generateWeeklyInsights(weeklyMoodData, fitbitData);
    
    return {
        stressScore: stressScore || (stressLevel === 'High' ? 8 : 3),
        stressLevel,
        stressDescription,
        stressColor,
        confidence: confidence,
        predictionMethod: mlPrediction?.method || 'heuristic',
        dailyInsights,
        weeklyInsights,
        factors: identifyStressFactors(fitbitData, weeklyMoodData)
    };
}

function getMLStressDescription(stressLevel, confidence, method) {
    const methodText = method === 'ml_model' ? 'AI analysis' : 'system analysis';
    const confidenceText = confidence >= 0.8 ? 'high confidence' : confidence >= 0.6 ? 'moderate confidence' : 'preliminary assessment';
    
    if (stressLevel === 'High') {
        return `Our ${methodText} indicates elevated stress levels with ${confidenceText}. Consider taking proactive steps to manage stress.`;
    } else {
        return `Our ${methodText} shows healthy stress management with ${confidenceText}. Keep up your positive habits!`;
    }
}

function getFallbackStressDescription(stressLevel, stressScore) {
    if (stressLevel === 'High') {
        return 'You may be experiencing significant stress. Consider taking proactive steps to manage it.';
    } else if (stressLevel === 'Moderate') {
        return 'You\'re managing well, but there might be some underlying stress factors.';
    } else {
        return 'Great job maintaining low stress levels! Keep up your healthy habits.';
    }
}

function calculateStressScore(fitbitData, avgMood, weeklyMoodData) {
    let score = 5; // Base score

    // Mood impact (40% weight -> more sensitive)
    const moodImpact = avgMood ? (10 - avgMood) * 0.8 : 0; // was 0.4

    // Sleep impact (25% weight -> more sensitive)
    const sleepImpact = fitbitData.sleep_hours < 7 ? (7 - fitbitData.sleep_hours) * 1 : 0; // was 0.5

    // Activity impact (20% weight -> more sensitive)
    const activityImpact = fitbitData.steps < 5000 ? (5000 - fitbitData.steps) / 5000 * 4 : 0; // was 2

    // Heart rate impact (15% weight -> more sensitive)
    let heartRateImpact = 0;
    if (fitbitData.heart_rate && fitbitData.heart_rate > 0) {
        heartRateImpact = fitbitData.heart_rate > 75 ? (fitbitData.heart_rate - 75) * 0.2 : 0; // was 0.1
    }

    // If heart_rate = 0, assume neutral, no impact

    // Calculate final score (1-10 scale)
    score += moodImpact + sleepImpact + activityImpact + heartRateImpact;

    console.log('🧮 Stress score calculation:', {
        base: 5,
        moodImpact,
        sleepImpact,
        activityImpact,
        heartRateImpact,
        finalScore: score
    });

    // Ensure score stays within 1-10 range
    return Math.min(Math.max(Math.round(score), 1), 10);
}


function generateDailyInsights(fitbitData, avgMood, mlPrediction) {
    const insights = [];
    const tips = [];
    const factors = [];
    
    // Add ML prediction insight if available
    if (mlPrediction && mlPrediction.method === 'ml_model') {
        insights.push(`AI analysis predicts ${mlPrediction.prediction.toLowerCase()} stress with ${Math.round((mlPrediction.confidence || 0.8) * 100)}% confidence.`);
    }
    
    // Add manual data indicator
    if (fitbitData.is_manual_edit) {
        insights.push('📝 Using manually entered health data.');
    }
    
    // Analyze sleep
    if (fitbitData.sleep_hours < 6) {
        insights.push(`You had ${fitbitData.sleep_hours} hours of sleep last night (less than recommended).`);
        tips.push('Aim for 7-9 hours of quality sleep tonight');
        factors.push('Sleep Deprivation');
    } else if (fitbitData.sleep_hours >= 8) {
        insights.push(`Great job getting ${fitbitData.sleep_hours} hours of sleep!`);
        tips.push('Maintain your consistent sleep schedule');
    } else {
        insights.push(`You slept ${fitbitData.sleep_hours} hours last night.`);
    }
    
    // Analyze activity
    if (fitbitData.steps < 3000) {
        insights.push(`Low activity level detected (${fitbitData.steps.toLocaleString()} steps).`);
        tips.push('Try to incorporate a 15-minute walk today');
        factors.push('Sedentary Lifestyle');
    } else if (fitbitData.steps > 10000) {
        insights.push(`Excellent activity level! (${fitbitData.steps.toLocaleString()} steps)`);
        tips.push('Your active lifestyle is helping manage stress');
    } else {
        insights.push(`You took ${fitbitData.steps.toLocaleString()} steps yesterday.`);
    }
    
    // Analyze heart rate
    if (fitbitData.heart_rate === 0) {
    insights.push("No data available for 0 bpm.");
} else if (fitbitData.heart_rate > 80) {
    insights.push(`Elevated resting heart rate observed (${fitbitData.heart_rate} bpm).`);
    tips.push('Practice deep breathing exercises for 5 minutes');
    factors.push('Elevated Heart Rate');
} else if (fitbitData.heart_rate > 75) {
    insights.push(`Your heart rate is ${fitbitData.heart_rate} bpm.`);
    tips.push('Monitor for stress-related changes');
} else {
    insights.push(`Healthy resting heart rate (${fitbitData.heart_rate} bpm).`);
}
    
    // Analyze mood
    if (avgMood && avgMood < 4) {
        insights.push('Your recent mood ratings have been low.');
        tips.push('Consider talking to a friend or trying mindfulness');
        factors.push('Low Mood');
    } else if (avgMood && avgMood > 7) {
        insights.push('Your mood has been consistently positive!');
        tips.push('Keep doing what makes you happy');
    }
    
    // Default tips if no specific issues
    if (tips.length === 0) {
        tips.push('Maintain your current healthy habits');
        tips.push('Stay hydrated throughout the day');
        tips.push('Take short breaks during work');
    }
    
    return {
        insights: insights.length > 0 ? insights : ['Your daily metrics look balanced overall.'],
        tips,
        factors: factors.length > 0 ? factors : ['No major stress factors identified']
    };
}

function generateWeeklyInsights(weeklyMoodData, fitbitData) {
    const moodTrends = analyzeMoodTrends(weeklyMoodData);
    const insights = [];
    const tips = [];
    const patterns = [];
    
    // Mood trend analysis
    if (moodTrends.volatility > 2) {
        insights.push('Your mood has been fluctuating significantly this week.');
        tips.push('Try establishing a more consistent daily routine');
        patterns.push('Mood Volatility');
    }
    
    if (moodTrends.trend === 'declining') {
        insights.push('Your mood shows a declining trend this week.');
        tips.push('Identify and address potential stress sources');
        patterns.push('Declining Mood Trend');
    } else if (moodTrends.trend === 'improving') {
        insights.push('Your mood is improving - great progress!');
        tips.push('Continue with your current stress management strategies');
    }
    
    // Activity consistency
    if (fitbitData.steps < 4000) {
        insights.push('Consider increasing your daily activity for better stress management.');
        tips.push('Aim for at least 30 minutes of moderate activity daily');
        patterns.push('Low Activity Pattern');
    }
    
    // Default weekly insights
    if (insights.length === 0) {
        insights.push('Your weekly patterns show good stability.');
        tips.push('Continue monitoring your metrics for early stress detection');
        patterns.push('Stable Patterns');
    }
    
    return {
        insights,
        tips,
        patterns: patterns.length > 0 ? patterns : ['Consistent Weekly Patterns']
    };
}

function analyzeMoodTrends(weeklyMoodData) {
    const validRatings = weeklyMoodData.filter(day => day.rating !== null).map(day => day.rating);
    
    if (validRatings.length < 2) {
        return { trend: 'stable', volatility: 0 };
    }
    
    // Calculate trend
    const firstHalf = validRatings.slice(0, Math.floor(validRatings.length / 2));
    const secondHalf = validRatings.slice(Math.floor(validRatings.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    let trend = 'stable';
    if (avgSecond > avgFirst + 0.5) trend = 'improving';
    else if (avgSecond < avgFirst - 0.5) trend = 'declining';
    
    // Calculate volatility (standard deviation)
    const mean = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
    const volatility = Math.sqrt(validRatings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validRatings.length);
    
    return { trend, volatility };
}

function identifyStressFactors(fitbitData, weeklyMoodData) {
    const factors = [];
    
    // Sleep factors
    if (fitbitData.sleep_hours < 6) factors.push('Insufficient Sleep');
    else if (fitbitData.sleep_hours > 9) factors.push('Oversleeping');
    
    // Activity factors
    if (fitbitData.steps < 3000) factors.push('Low Physical Activity');
    
    // Heart rate factors
    if (fitbitData.heart_rate > 80) factors.push('Elevated Resting Heart Rate');
    
    // Mood factors
    const recentMoods = weeklyMoodData.filter(day => day.rating !== null).map(day => day.rating);
    if (recentMoods.length > 0) {
        const avgRecentMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
        if (avgRecentMood < 4) factors.push('Low Mood Levels');
    }
    
    return factors.length > 0 ? factors : ['No specific stress factors identified'];
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateForecastUI(forecast, fitbitData) {
    const user = userManager.getCurrentUser();
    
    console.log('🎨 Updating forecast UI with:', {
        stressScore: forecast.stressScore,
        stressLevel: forecast.stressLevel,
        confidence: forecast.confidence,
        method: forecast.predictionMethod,
        fitbitData: {
            steps: fitbitData.steps,
            sleep: fitbitData.sleep_hours,
            heart_rate: fitbitData.heart_rate
        }
    });
    
    // Update Daily Report
    updateDailyReport(forecast, user);
    
    // Update Weekly Report
    updateWeeklyReport(forecast, user);
    
    // Update Data Grid
    updateDataGrid(forecast, fitbitData, user);
}

function updateDailyReport(forecast, user) {
    const dailyMood = document.getElementById('daily-mood');
    const dailyDescription = document.getElementById('daily-description');
    const dailyTips = document.getElementById('daily-tips');
    const dailyFactors = document.getElementById('daily-factors');
    
    const manualData = user.manual_data || {};
    const heartRate = manualData.heart_rate !== undefined ? manualData.heart_rate : 0;

    if (dailyMood) {
        dailyMood.className = `mood-indicator ${forecast.stressColor}`;
        
        let confidenceBadge = '';
        
        let methodBadge = '';
        if (forecast.predictionMethod === 'ml_model') {
            methodBadge = ' <span style="font-size: 0.7em; background: #4CAF50; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">AI</span>';
        }

        // If heart rate = 0, show 'No data available' instead of numeric stress score
        const displayedScore = heartRate === 0 ? 'No data available' : `${forecast.stressScore}/10`;
        dailyMood.innerHTML = `📊 Today's Stress Level: ${forecast.stressLevel} (${displayedScore})${methodBadge}`;

    }
    
    if (dailyDescription) {
        dailyDescription.textContent = forecast.stressDescription;
    }
    
    if (dailyTips) {
        dailyTips.innerHTML = forecast.dailyInsights.tips.map(tip => `<li>${tip}</li>`).join('');
    }
    
    if (dailyFactors) {
        dailyFactors.innerHTML = `<strong>Primary Stress Factors:</strong> ${forecast.dailyInsights.factors.map(factor => `<span class="stress-factor">${factor}</span>`).join('')}`;
    }
}




function updateWeeklyReport(forecast, user) {
    const weeklyMood = document.getElementById('weekly-mood');
    const weeklyDescription = document.getElementById('weekly-description');
    const weeklyTips = document.getElementById('weekly-tips');
    const weeklyFactors = document.getElementById('weekly-factors');
    
    // Update mood indicator
    const avgMood = userManager.getAverageMood();
    let weeklyColor = 'mood-high';
    if (avgMood && avgMood < 4) weeklyColor = 'mood-low';
    else if (avgMood && avgMood < 7) weeklyColor = 'mood-medium';
    
    if (weeklyMood) {
        weeklyMood.className = `mood-indicator ${weeklyColor}`;
        if (avgMood) {
            weeklyMood.innerHTML = `📈 Weekly Average Mood: ${avgMood.toFixed(1)}/10`;
        } else {
            weeklyMood.innerHTML = `📈 Weekly Average Mood: No data yet`;
        }
    }
    
    if (weeklyDescription) {
        weeklyDescription.textContent = forecast.weeklyInsights.insights.join(' ');
    }
    
    if (weeklyTips) {
        weeklyTips.innerHTML = forecast.weeklyInsights.tips.map(tip => `<li>${tip}</li>`).join('');
    }
    
    if (weeklyFactors) {
        weeklyFactors.innerHTML = `<strong>Common Stress Patterns:</strong> ${forecast.weeklyInsights.patterns.map(pattern => `<span class="stress-factor">${pattern}</span>`).join('')}`;
    }
}

function updateDataGrid(forecast, fitbitData, user) {
    console.log('📊 Updating data grid with Fitbit data:', fitbitData);
    
    // Sleep Quality
    const sleepCard = document.querySelector('.data-card:nth-child(1)');
    const sleepHours = document.getElementById('sleep-hours');
    const sleepDescription = document.getElementById('sleep-description');
    
    if (sleepHours) sleepHours.textContent = `${fitbitData.sleep_hours} hrs/night`;
    if (sleepCard && sleepDescription) {
        if (fitbitData.sleep_hours < 6) {
            sleepCard.className = 'data-card needs-improvement';
            sleepDescription.textContent = 'Consider improving sleep duration for better stress management';
        } else if (fitbitData.sleep_hours > 9) {
            sleepCard.className = 'data-card average';
            sleepDescription.textContent = 'Good sleep duration, maintain consistency';
        } else {
            sleepCard.className = 'data-card good';
            sleepDescription.textContent = 'Excellent sleep duration for stress recovery';
        }
    }
    
    // Activity Level
    const activityCard = document.querySelector('.data-card:nth-child(2)');
    const exerciseFrequency = document.getElementById('exercise-frequency');
    const exerciseDescription = document.getElementById('exercise-description');
    
    if (exerciseFrequency) exerciseFrequency.textContent = `${fitbitData.steps.toLocaleString()} steps/day`;
    if (activityCard && exerciseDescription) {
        if (fitbitData.steps < 3000) {
            activityCard.className = 'data-card needs-improvement';
            exerciseDescription.textContent = 'Low activity can contribute to stress buildup';
        } else if (fitbitData.steps < 7000) {
            activityCard.className = 'data-card average';
            exerciseDescription.textContent = 'Moderate activity helps manage daily stress';
        } else {
            activityCard.className = 'data-card good';
            exerciseDescription.textContent = 'High activity level supports stress resilience';
        }
    }
    
    // Heart Health
    const heartCard = document.querySelector('.data-card:nth-child(3)');
    const heartRateBpm = document.getElementById('heart-rate-bpm');
    const heartRateStatus = document.getElementById('heart-rate-status-card');
    const heartRateDescription = document.getElementById('heart-rate-description-card');
    
    if (heartRateBpm) heartRateBpm.textContent = `${fitbitData.heart_rate} bpm`;
    
    let heartStatus = 'Normal';
    let heartClass = 'heart-good';
    if (fitbitData.heart_rate > 80) {
        heartStatus = 'Elevated';
        heartClass = 'heart-high';
        if (heartRateDescription) heartRateDescription.textContent = 'Elevated heart rate may indicate stress';
    } else if (fitbitData.heart_rate > 75) {
        heartStatus = 'Slightly High';
        heartClass = 'heart-average';
        if (heartRateDescription) heartRateDescription.textContent = 'Monitor for stress-related changes';
    } else {
        if (heartRateDescription) heartRateDescription.textContent = 'Healthy resting heart rate';
    }
    
    if (heartCard) heartCard.className = `data-card ${heartClass}`;
    if (heartRateStatus) heartRateStatus.textContent = `${heartStatus} resting heart rate`;
    
    // Stress Level
    const stressCard = document.querySelector('.data-card:nth-child(4)');
    const stressScore = document.getElementById('stress-score');
    const stressDescription = document.getElementById('stress-description');
    
    if (stressScore) stressScore.textContent = `${forecast.stressScore}/10`;
    if (stressCard && stressDescription) {
        stressCard.className = `data-card ${forecast.stressScore >= 8 ? 'needs-improvement' : forecast.stressScore >= 5 ? 'average' : 'good'}`;
        stressDescription.textContent = forecast.stressDescription;
    
    }
}

function showFitbitConnectionPrompt() {
    console.log('🔄 Showing Fitbit connection prompt');
    
    // Update all sections to show connection prompt
    const sections = ['daily-content', 'weekly-content', 'data-grid'];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⌚</div>
                    <h3>Connect Fitbit for Personalized Insights</h3>
                    <p>Connect your Fitbit account to see your stress forecast based on your real health data.</p>
                    <button class="cta-button" onclick="window.location.href='profile.html'" style="margin-top: 1rem;">
                        Connect Fitbit Now
                    </button>
                </div>
            `;
        }
    });
}

// Add debug function to check current state
function debugForecastState() {
    const user = userManager.getCurrentUser();
    console.log('🔍 Forecast Debug State:', {
        user: {
            name: user.name,
            fitbit_connected: user.fitbit_connected,
            fitbit_last_sync: user.fitbit_last_sync,
            has_manual_data: !!user.manual_data
        },
        hasMoodData: user.mood_data && user.mood_data.length > 0,
        moodCount: user.mood_data ? user.mood_data.length : 0
    });
}

// Call debug on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(debugForecastState, 1000);
});
