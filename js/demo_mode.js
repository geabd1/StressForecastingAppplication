// demo_mode.js - Enable demo mode for presentation
document.addEventListener('DOMContentLoaded', function() {
    // Check if we should enable demo mode
    const user = userManager.getCurrentUser();
    if (!user) return;
    
    const demoUsers = ['sarahdemo', 'mikedemo', 'emilydemo', 'alexdemo'];
    const isDemoUser = demoUsers.includes(user.username);
    
    if (isDemoUser) {
        enableDemoMode(user);
    }
});

function enableDemoMode(user) {
    console.log(`🎮 Enabling demo mode for ${user.username}`);
    
    // Override the getFitbitData function to return demo data
    const originalGetFitbitData = userManager.getFitbitData;
    
    userManager.getFitbitData = async function() {
        console.log('📊 Returning demo data instead of real Fitbit data');
        
        // Return demo data based on user
        let demoData = {};
        
        switch(user.username) {
            case 'sarahdemo':
                demoData = {
                    sleep_hours: 4.5,
                    steps: 3200,
                    heart_rate: 95,
                    calories_burned: 1650,
                    is_simulated: true,
                    is_manual_edit: false,
                    source: 'demo_high_stress',
                    last_sync: new Date().toISOString()
                };
                break;
                
            case 'mikedemo':
                demoData = {
                    sleep_hours: 8.2,
                    steps: 11200,
                    heart_rate: 65,
                    calories_burned: 2100,
                    is_simulated: true,
                    is_manual_edit: false,
                    source: 'demo_low_stress',
                    last_sync: new Date().toISOString()
                };
                break;
                
            case 'emilydemo':
                demoData = {
                    sleep_hours: 6.5,
                    steps: 5800,
                    heart_rate: 78,
                    calories_burned: 1850,
                    is_simulated: true,
                    is_manual_edit: false,
                    source: 'demo_variable',
                    last_sync: new Date().toISOString()
                };
                break;
                
            case 'alexdemo':
                demoData = {
                    sleep_hours: 7.8,
                    steps: 8200,
                    heart_rate: 72,
                    calories_burned: 2050,
                    is_simulated: true,
                    is_manual_edit: false,
                    source: 'demo_recovery',
                    last_sync: new Date().toISOString()
                };
                break;
                
            default:
                // Try original function
                return originalGetFitbitData.call(this);
        }
        
        // Update user's fitbit status
        if (this.currentUser) {
            this.currentUser.fitbit_connected = true;
            this.currentUser.fitbit_last_sync = new Date().toISOString();
            this.saveLocalUserData();
        }
        
        return demoData;
    };
    
    // Add demo badge to UI
    addDemoBadge();
}

function addDemoBadge() {
    // Add a demo indicator to the page
    const demoBadge = document.createElement('div');
    demoBadge.id = 'demo-badge';
    demoBadge.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    demoBadge.innerHTML = '🎮 DEMO MODE';
    
    document.body.appendChild(demoBadge);
    
    // Make it toggleable
    demoBadge.addEventListener('click', function() {
        alert('This is a demonstration account with simulated data.\n\n' +
              'Real Fitbit connection requires API credentials.\n\n' +
              'Demo accounts show different stress patterns for educational purposes.');
    });
}