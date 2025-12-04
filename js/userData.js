// userData.js - COMPLETE FILE (PATCHED WITH MANUAL DATA SUPPORT)
class UserDataManager {
    constructor() {
        this.API_BASE = 'http://localhost:8000/api';
        this.token = localStorage.getItem('calmcast_token');
        this.currentUser = JSON.parse(localStorage.getItem('calmcast_user') || 'null');
        
        // Initialize clean user data structure (NO FAKE DATA)
        if (this.currentUser) {
            // Ensure arrays exist but start empty
            if (!this.currentUser.mood_data) this.currentUser.mood_data = [];
            if (!this.currentUser.recent_activities) this.currentUser.recent_activities = [];

            // ⭐ NEW → Initialize manual editable fields
            if (!this.currentUser.manual_data) {
                this.currentUser.manual_data = {
                    sleep_hours: null,
                    steps: null,
                    heart_rate: null,
                    notes: null
                };
            }

            if (!this.currentUser.fitbit_connected) this.currentUser.fitbit_connected = false;
            if (!this.currentUser.fitbit_last_sync) this.currentUser.fitbit_last_sync = null;
            this.saveLocalUserData();
        }
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && !endpoint.includes('/token') && !endpoint.includes('/register')) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.logout();
                window.location.href = 'index.html';
                throw new Error('Session expired');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || data.error || `API request failed: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            console.log('👤 Attempting registration for:', userData.username);
            
            const result = await this.apiCall('/users/register', {
                method: 'POST',
                body: userData
            });
            
            console.log('✅ Registration successful, auto-logging in...');
            
            return this.login({
                username: userData.username,
                password: userData.password
            });
            
        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            console.log('🔐 Attempting login for:', credentials.username);
            
            const loginUrl = `${this.API_BASE}/token?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
            
            console.log('📤 Login URL:', loginUrl);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });

            console.log('📥 Login response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Login error response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    throw new Error(errorText || 'Login failed');
                }
                throw new Error(errorData.detail || 'Login failed');
            }

            const result = await response.json();
            console.log('✅ Login successful, user data:', result.user);
            
            this.token = result.access_token;
            this.currentUser = result.user;
            
            // Initialize clean data structure
            if (!this.currentUser.mood_data) this.currentUser.mood_data = [];
            if (!this.currentUser.recent_activities) this.currentUser.recent_activities = [];
            if (!this.currentUser.fitbit_connected) this.currentUser.fitbit_connected = false;
            if (!this.currentUser.fitbit_last_sync) this.currentUser.fitbit_last_sync = null;

            // ⭐ NEW → Initialize manual data on login
            if (!this.currentUser.manual_data) {
                this.currentUser.manual_data = {
                    sleep_hours: null,
                    steps: null,
                    heart_rate: null,
                    notes: null
                };
            }
            
            localStorage.setItem('calmcast_token', this.token);
            localStorage.setItem('calmcast_user', JSON.stringify(this.currentUser));
            
            return result;
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    // ⭐ NEW → Save manual edited data (sleep, steps, heart rate, notes)
    saveManualData(data) {
        if (!this.currentUser) return;

        this.currentUser.manual_data = {
            ...this.currentUser.manual_data,
            ...data
        };

        this.saveLocalUserData();
    }

    async addMoodRating(rating) {
        if (!this.currentUser) throw new Error('No user logged in');
        
        const moodEntry = {
            rating: parseInt(rating),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };
        
        this.currentUser.mood_data.push(moodEntry);
        
        this.currentUser.recent_activities.unshift({
            type: 'Mood Check-in',
            description: `Rated mood as ${rating}/10`,
            timestamp: new Date().toISOString()
        });
        
        this.saveLocalUserData();
        
        try {
            await this.apiCall('/mood', {
                method: 'POST',
                body: {
                    rating: parseInt(rating),
                    notes: `Mood check-in: ${rating}/10`
                }
            });
        } catch (error) {
            console.error('Failed to sync mood with backend:', error);
        }
        
        return moodEntry;
    }

    async getFitbitData() {
        try {
            const fitbitData = await this.apiCall('/fitbit/data');
            
            if (this.currentUser) {
                this.currentUser.fitbit_connected = true;
                this.currentUser.fitbit_last_sync = new Date().toISOString();
                this.saveLocalUserData();
            }

            return fitbitData;

        } catch (error) {
            console.error('Failed to get Fitbit data:', error);
            throw new Error('Fitbit not connected. Please connect your Fitbit account first.');
        }
    }

    async refreshUserData() {
        try {
            const userData = await this.apiCall('/users/me');
            
            console.log('🔄 Refreshing user data:', {
                fitbit_connected: userData.fitbit_connected,
                name: userData.name,
                fitbit_last_sync: userData.fitbit_last_sync
            });
            
            // ⭐ NEW → Manual data preserved on refresh
            const manual = this.currentUser?.manual_data || null;

            this.currentUser = { 
                ...this.currentUser,
                ...userData,
                manual_data: {
                    ...manual
                }
            };
            
            this.saveLocalUserData();
            console.log('✅ User data refreshed from backend');
            return this.currentUser;
        } catch (error) {
            console.error('❌ Failed to refresh user data:', error);
            throw error;
        }
    }

    async checkFitbitStatus() {
        try {
            const status = await this.apiCall('/users/me/fitbit-status');
            console.log('🔍 Fitbit status check:', status);
            return status;
        } catch (error) {
            console.error('❌ Failed to check Fitbit status:', error);
            return { fitbit_connected: false };
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('calmcast_token');
        localStorage.removeItem('calmcast_user');
    }

    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    saveLocalUserData() {
        if (this.currentUser) {
            localStorage.setItem('calmcast_user', JSON.stringify(this.currentUser));
        }
    }

    // Mood data methods
    getAverageMood(days = 7) {
        if (!this.currentUser.mood_data || this.currentUser.mood_data.length === 0) {
            return null;
        }
        
        const recentMoods = this.currentUser.mood_data
            .slice(-days)
            .map(entry => entry.rating)
            .filter(rating => rating !== null);
            
        if (recentMoods.length === 0) return null;
        
        return recentMoods.reduce((sum, rating) => sum + rating, 0) / recentMoods.length;
    }

    getWeeklyMoodData() {
        if (!this.currentUser.mood_data || this.currentUser.mood_data.length === 0) {
            return this.getEmptyWeeklyData();
        }
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayEntry = this.currentUser.mood_data.find(entry => {
                const entryDate = new Date(entry.timestamp).toDateString();
                return entryDate === dateStr;
            });
                
            last7Days.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                rating: dayEntry ? dayEntry.rating : null
            });
        }
        
        return last7Days;
    }

    getEmptyWeeklyData() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();
        const orderedDays = days.slice(today + 1).concat(days.slice(0, today + 1));
        return orderedDays.map(day => ({ date: day, rating: null }));
    }

    async connectFitbit() {
        try {
            console.log('🔗 Starting Fitbit connection...');
            
            const response = await this.apiCall('/fitbit/login');
            console.log('📤 Fitbit login response:', response);
            
            if (response.auth_url) {
                const fitbitTab = window.open(
                    response.auth_url, 
                    'fitbit_auth',
                    'width=600,height=700,scrollbars=yes,resizable=yes'
                );
                
                if (!fitbitTab) {
                    throw new Error('Popup blocked! Please allow popups for this site.');
                }
                
                return response;
            } else {
                throw new Error('No auth URL received from server');
            }
        } catch (error) {
            console.error('❌ Fitbit connection failed:', error);
            throw error;
        }
    }

    async syncFitbitData() {
        try {
            const fitbitData = await this.apiCall('/fitbit/data');
            
            if (this.currentUser) {
                this.currentUser.fitbit_connected = true;
                this.currentUser.fitbit_last_sync = new Date().toISOString();
                this.saveLocalUserData();
            }

            return fitbitData;
        } catch (error) {
            console.error('Failed to sync Fitbit data:', error);
            throw error;
        }
    }

    async disconnectFitbit() {
        try {
            await this.apiCall('/users/me/fitbit-connection', {
                method: 'DELETE'
            });
            
            if (this.currentUser) {
                this.currentUser.fitbit_connected = false;
                this.currentUser.fitbit_last_sync = null;
                this.saveLocalUserData();
            }
            
            return { success: true, message: 'Fitbit disconnected successfully' };
        } catch (error) {
            console.error('Failed to disconnect Fitbit:', error);
            throw error;
        }
    }

    debugState() {
        console.log('🔍 UserDataManager Debug State:', {
            isAuthenticated: this.isAuthenticated(),
            currentUser: this.currentUser ? {
                id: this.currentUser.id,
                name: this.currentUser.name,
                fitbit_connected: this.currentUser.fitbit_connected,
                fitbit_last_sync: this.currentUser.fitbit_last_sync,
                mood_entries: this.currentUser.mood_data ? this.currentUser.mood_data.length : 0,
                recent_activities: this.currentUser.recent_activities ? this.currentUser.recent_activities.length : 0,
                manual_data: this.currentUser.manual_data
            } : null
        });
    }
}

const userManager = new UserDataManager();
