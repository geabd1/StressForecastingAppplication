// home.js - COMPLETE FIXED FILE WITH HISTORICAL DATA
document.addEventListener('DOMContentLoaded', function() {
    if (!userManager.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    const user = userManager.getCurrentUser();
    
    // Update welcome message with real user name
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        if (user.fitbit_connected) {
            welcomeMessage.textContent = `Hello, ${user.name}`;
        } else {
            welcomeMessage.innerHTML = `Hello, ${user.name} <br><small>Connect Fitbit for personalized insights</small>`;
        }
    }
    
    // Show connection prompt if not connected
    if (!user.fitbit_connected) {
        showFitbitConnectionPrompt();
    }
    
    // Load historical mood data from backend
    loadHistoricalMoodData();
    
    // Setup mood check-in
    setupMoodCheckIn();
    
    // Setup rating bar interactions
    setupRatingBars();
});

async function loadHistoricalMoodData() {
    try {
        console.log('📊 Loading historical mood data...');
        
        // Get mood data from backend
        const moodData = await userManager.apiCall('/mood');
        console.log('✅ Historical mood data loaded:', moodData.mood_data.length, 'entries');
        
        // Update local user data with historical data
        if (moodData.mood_data && moodData.mood_data.length > 0) {
            // Convert backend format to local format
            const historicalMoods = moodData.mood_data.map(entry => ({
                rating: entry.rating,
                notes: entry.notes,
                timestamp: entry.timestamp || entry.date,
                date: new Date(entry.timestamp || entry.date).toLocaleDateString()
            }));
            
            // Merge with existing local data (avoid duplicates)
            const existingTimestamps = new Set(userManager.currentUser.mood_data.map(m => m.timestamp));
            const newMoods = historicalMoods.filter(mood => !existingTimestamps.has(mood.timestamp));
            
            if (newMoods.length > 0) {
                userManager.currentUser.mood_data = [...userManager.currentUser.mood_data, ...newMoods];
                userManager.saveLocalUserData();
                console.log(`✅ Added ${newMoods.length} historical mood entries`);
            }
        }
        
        // Update the UI with the complete data
        updateMoodData();
        
    } catch (error) {
        console.error('❌ Failed to load historical mood data:', error);
        // Continue with local data only
        updateMoodData();
    }
}

function setupRatingBars() {
    const ratingBars = document.querySelectorAll('.rating-bar');
    const currentRating = document.getElementById('current-rating');
    
    const ratingDescriptions = {
        1: '1 – Very Rough Day: High stress, little energy, struggling to get through tasks',
        2: '2 – Rough Day: Significant stress, low energy, difficulty focusing',
        3: '3 – Difficult Day: Noticeable stress, reduced productivity',
        4: '4 – Challenging Day: Some stress, but manageable',
        5: '5 – Neutral Day: Balanced mood, normal stress levels',
        6: '6 – Okay Day: Generally positive with minor stressors',
        7: '7 – Good Day: Positive mood, good energy levels',
        8: '8 – Very Good Day: High energy, minimal stress',
        9: '9 – Great Day: Excellent mood, highly productive',
        10: '10 – Excellent Day: Peak performance, completely stress-free'
    };
    
    ratingBars.forEach(bar => {
        bar.addEventListener('click', () => {
            // Remove selected class from all bars
            ratingBars.forEach(b => b.classList.remove('selected'));
            // Add selected class to clicked bar
            bar.classList.add('selected');
            
            // Update rating description
            const rating = bar.getAttribute('data-rating');
            currentRating.textContent = ratingDescriptions[rating];
        });
    });
}

function updateMoodData() {
    const user = userManager.getCurrentUser();
    
    console.log('🔄 Updating mood display with', user.mood_data.length, 'total entries');
    
    // Update last week review
    const avgMood = userManager.getAverageMood();
    const reviewText = document.getElementById('weekly-summary');
    const avgMoodElement = document.getElementById('avg-mood');
    const checkinCountElement = document.getElementById('checkin-count');
    
    if (user.mood_data && user.mood_data.length > 0) {
        const totalCheckins = user.mood_data.length;
        
        // Calculate weekly check-ins (last 7 days)
        const weeklyCheckins = user.mood_data.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return entryDate > weekAgo;
        }).length;
        
        // Check if user already checked in today
        const today = new Date().toDateString();
        const checkedInToday = user.mood_data.some(entry => 
            new Date(entry.timestamp).toDateString() === today
        );
        
        // Update check-in button if already checked in today
        const checkInBtn = document.getElementById('check-in-btn');
        if (checkedInToday && checkInBtn) {
            const todayEntry = user.mood_data.find(entry => 
                new Date(entry.timestamp).toDateString() === today
            );
            checkInBtn.textContent = `Update Today's Check-in (${todayEntry.rating}/10)`;
            checkInBtn.style.backgroundColor = '#6b8cbc'; // Different color for update
        }
        
        reviewText.textContent = `Based on your ${totalCheckins} total check-ins, your average mood is ${avgMood.toFixed(1)}/10. ${getMoodTrend()}`;
        avgMoodElement.textContent = `${avgMood.toFixed(1)}/10`;
        checkinCountElement.textContent = `${weeklyCheckins} days`;
        
        // Update progress bar
        const progressBar = document.querySelector('.rating-bar-small .bar-fill');
        if (progressBar) {
            progressBar.style.width = `${avgMood * 10}%`;
        }
    } else {
        reviewText.textContent = 'Start tracking your mood to see insights here! Check in daily to build your stress forecast.';
        avgMoodElement.textContent = 'No data';
        checkinCountElement.textContent = '0 days';
        const progressBar = document.querySelector('.rating-bar-small .bar-fill');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }
    
    // Update chart with complete historical data
    updateMoodChart();
}

function setupMoodCheckIn() {
    const checkInBtn = document.getElementById('check-in-btn');
    
    if (checkInBtn) {
        checkInBtn.addEventListener('click', async () => {
            const selectedBar = document.querySelector('.rating-bar.selected');
            if (selectedBar) {
                const rating = selectedBar.getAttribute('data-rating');
                const originalText = checkInBtn.textContent;
                
                try {
                    checkInBtn.textContent = 'Checking In...';
                    checkInBtn.disabled = true;

                    // Check if user already checked in today
                    const today = new Date().toDateString();
                    const existingEntryIndex = userManager.currentUser.mood_data.findIndex(entry => 
                        new Date(entry.timestamp).toDateString() === today
                    );
                    
                    if (existingEntryIndex !== -1) {
                        // Update existing entry
                        userManager.currentUser.mood_data[existingEntryIndex].rating = parseInt(rating);
                        userManager.currentUser.mood_data[existingEntryIndex].timestamp = new Date().toISOString();
                        console.log('✅ Updated existing check-in for today');
                    } else {
                        // Add new entry
                        await userManager.addMoodRating(rating);
                    }
                    
                    // Show success message
                    alert(`✅ Mood check-in ${existingEntryIndex !== -1 ? 'updated' : 'recorded'}: ${rating}/10`);
                    
                    // Refresh the display
                    updateMoodData();
                    
                    // Reset selection
                    document.querySelectorAll('.rating-bar').forEach(b => b.classList.remove('selected'));
                    document.getElementById('current-rating').textContent = 'Please select a rating';
                    
                } catch (error) {
                    alert('Failed to save mood rating: ' + error.message);
                } finally {
                    checkInBtn.textContent = originalText;
                    checkInBtn.disabled = false;
                }
            } else {
                alert('Please select a mood rating first');
            }
        });
    }
}

function getMoodTrend() {
    const user = userManager.getCurrentUser();
    if (!user.mood_data || user.mood_data.length < 2) {
        return 'Keep tracking to see trends!';
    }
    
    // Get last 7 days vs previous 7 days
    const now = new Date();
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 7);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const recentMoods = user.mood_data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= lastWeekStart && entryDate <= now;
    }).map(m => m.rating);
    
    const previousMoods = user.mood_data.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= twoWeeksAgo && entryDate < lastWeekStart;
    }).map(m => m.rating);
    
    if (previousMoods.length === 0 || recentMoods.length === 0) {
        return 'Track more days to see trends!';
    }
    
    const currentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    const previousAvg = previousMoods.reduce((a, b) => a + b, 0) / previousMoods.length;
    
    const difference = currentAvg - previousAvg;
    
    if (difference > 1) return 'Great improvement from last week! 📈';
    if (difference > 0.2) return 'Slight improvement from last week. ↗️';
    if (difference < -1) return 'Your mood has decreased recently. 📉';
    if (difference < -0.2) return 'Slight decrease from last week. ↘️';
    
    return 'Stable compared to last week. →';
}

function updateMoodChart() {
    const moodData = userManager.getWeeklyMoodData();
    const ctx = document.getElementById("moodChart");
    
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    // Get user's name for personalized chart title
    const user = userManager.getCurrentUser();
    const userName = user.name.split(' ')[0]; // Use first name only

    // Check if we have any actual mood data
    const hasMoodData = moodData.some(entry => entry.rating !== null);
    
    if (!hasMoodData) {
        // Show empty state chart
        ctx.chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: moodData.map(entry => entry.date),
                datasets: [
                    {
                        label: "No Data Yet",
                        data: moodData.map(() => null),
                        borderColor: "#cccccc",
                        backgroundColor: "rgba(204, 204, 204, 0.1)",
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 10,
                        title: {
                            display: true,
                            text: "Mood Level"
                        },
                        ticks: {
                            stepSize: 2,
                            callback: function(value) {
                                return value;
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Day of Week"
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `${userName}'s Mood Trends - Start Tracking!`
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
        return;
    }

    // Create chart with actual user data
    ctx.chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: moodData.map(entry => entry.date),
            datasets: [
                {
                    label: "Mood Rating",
                    data: moodData.map(entry => entry.rating),
                    borderColor: getMoodLineColor(moodData),
                    backgroundColor: getMoodFillColor(moodData),
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: getPointRadius(moodData),
                    pointBackgroundColor: getPointColors(moodData),
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 10,
                    title: {
                        display: true,
                        text: "Mood Level",
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            const moodLabels = {
                                1: '😢 1', 2: '😔 2', 3: '😐 3', 4: '😕 4', 5: '😊 5',
                                6: '😊 6', 7: '😄 7', 8: '😄 8', 9: '🌟 9', 10: '🎉 10'
                            };
                            return moodLabels[value] || value;
                        },
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Day of Week",
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: `${userName}'s Mood Trends This Week`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: getMoodLineColor(moodData),
                    borderWidth: 2,
                    callbacks: {
                        label: function(context) {
                            const rating = context.parsed.y;
                            if (rating === null) return 'No data';
                            
                            const moodDescriptions = {
                                1: 'Very Rough', 2: 'Rough', 3: 'Difficult', 4: 'Challenging',
                                5: 'Neutral', 6: 'Okay', 7: 'Good', 8: 'Very Good', 9: 'Great', 10: 'Excellent'
                            };
                            return `Mood: ${rating}/10 - ${moodDescriptions[rating]}`;
                        },
                        afterLabel: function(context) {
                            const rating = context.parsed.y;
                            if (rating === null) return '';
                            
                            if (rating >= 8) return '🌟 Great day!';
                            if (rating >= 6) return '😊 Good mood!';
                            if (rating >= 4) return '😐 Managing well';
                            return '💪 You got through it';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            }
        }
    });
}

// Helper functions for dynamic chart styling
function getMoodLineColor(moodData) {
    const ratings = moodData.map(entry => entry.rating).filter(r => r !== null);
    if (ratings.length === 0) return "#4a6fa5";
    
    const avgMood = ratings.reduce((a, b) => a + b) / ratings.length;
    
    if (avgMood >= 8) return "#4caf50";
    if (avgMood >= 6) return "#8bc34a";
    if (avgMood >= 4) return "#ff9800";
    return "#f44336";
}

function getMoodFillColor(moodData) {
    const ratings = moodData.map(entry => entry.rating).filter(r => r !== null);
    if (ratings.length === 0) return "rgba(74, 111, 165, 0.1)";
    
    const avgMood = ratings.reduce((a, b) => a + b) / ratings.length;
    
    if (avgMood >= 8) return "rgba(76, 175, 80, 0.2)";
    if (avgMood >= 6) return "rgba(139, 195, 74, 0.2)";
    if (avgMood >= 4) return "rgba(255, 152, 0, 0.2)";
    return "rgba(244, 67, 54, 0.2)";
}

function getPointRadius(moodData) {
    return moodData.map(entry => entry.rating !== null ? 5 : 0);
}

function getPointColors(moodData) {
    return moodData.map(entry => {
        if (entry.rating === null) return 'transparent';
        
        if (entry.rating >= 8) return "#4caf50";
        if (entry.rating >= 6) return "#8bc34a";
        if (entry.rating >= 4) return "#ff9800";
        return "#f44336";
    });
}

function showFitbitConnectionPrompt() {
    const welcomeSection = document.querySelector('.welcome-section');
    if (!welcomeSection) return;
    
    const connectionPrompt = document.createElement('div');
    connectionPrompt.className = 'connection-prompt';
    connectionPrompt.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 10px;
        margin: 1rem 0;
        text-align: center;
    `;
    
    connectionPrompt.innerHTML = `
        <h3>🔗 Connect Your Fitbit</h3>
        <p>Get accurate stress forecasts based on your real health data</p>
        <button class="cta-button" onclick="window.location.href='profile.html'" 
                style="background: white; color: #667eea; border: none;">
            Connect Now
        </button>
    `;
    
    welcomeSection.insertBefore(connectionPrompt, welcomeSection.querySelector('.check-in-card'));
}

// Add event listener for page visibility to refresh data when returning to page
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && userManager.isAuthenticated()) {
        // Refresh mood data when user returns to the page
        updateMoodData();
    }
});