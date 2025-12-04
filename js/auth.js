// js/auth.js 
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    if (window.location.pathname.endsWith('index.html')) {
    const token = localStorage.getItem('calmcast_token');
    const user = localStorage.getItem('calmcast_user');

    if (token && user) {
        window.location.href = 'home.html';
    }

    } else if (!localStorage.getItem('calmcast_token') && 
           !localStorage.getItem('calmcast_user') && 
           !window.location.pathname.endsWith('index.html')) {
    window.location.href = 'index.html';
}


    // Setup sign out buttons - FIXED VERSION
    setupSignOutButtons();

    // Authentication form handling
    const signInForm = document.getElementById('sign-in');
    const signUpForm = document.getElementById('sign-up');

    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const submitBtn = signInForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = 'Signing In...';
                submitBtn.disabled = true;

                console.log('🔐 Attempting login for:', username);
                
                await userManager.login({
                    username: username,
                    password: password
                });
                
                console.log('✅ Login successful, redirecting...');
                window.location.href = 'home.html';
            } catch (error) {
                console.error('❌ Login error details:', error);
                let errorMessage = 'Login failed';
                
                if (error.message) {
                    errorMessage = error.message;
                } else if (error.detail) {
                    // Handle FastAPI error format
                    if (Array.isArray(error.detail)) {
                        errorMessage = error.detail.map(d => d.msg).join(', ');
                    } else if (typeof error.detail === 'string') {
                        errorMessage = error.detail;
                    }
                }
                
                alert('Login failed: ' + errorMessage);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                username: document.getElementById('new-username').value,
                email: document.getElementById('email').value,
                password: document.getElementById('new-password').value,
                name: document.getElementById('name').value
            };

            const submitBtn = signUpForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = 'Creating Account...';
                submitBtn.disabled = true;

                console.log('👤 Attempting registration for:', userData.username);
                
                await userManager.register(userData);
                
                console.log('✅ Registration successful, redirecting...');
                window.location.href = 'home.html';
            } catch (error) {
                console.error('❌ Registration error:', error);
                let errorMessage = 'Registration failed';
                
                if (error.message) {
                    errorMessage = error.message;
                } else if (error.detail) {
                    if (Array.isArray(error.detail)) {
                        errorMessage = error.detail.map(d => d.msg).join(', ');
                    } else if (typeof error.detail === 'string') {
                        errorMessage = error.detail;
                    }
                }
                
                alert('Registration failed: ' + errorMessage);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Separate function for sign-out buttons that can be called from any page
function setupSignOutButtons() {
    // Get ALL sign-out buttons (including those added dynamically)
    const signOutBtns = document.querySelectorAll('#sign-out-btn, [href="index.html"]');
    
    signOutBtns.forEach(btn => {
        // Remove any existing event listeners to avoid duplicates
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-select after cloning
    const freshBtns = document.querySelectorAll('#sign-out-btn, [href="index.html"]');
    
    freshBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm('Are you sure you want to sign out?')) {
                console.log('🚪 Signing out...');
                userManager.logout();
                // Force redirect
                window.location.href = 'index.html';
            }
        });
    });
}

// Also call this function when the page loads to ensure sign-out buttons work
if (typeof userManager !== 'undefined') {
    document.addEventListener('DOMContentLoaded', setupSignOutButtons);
}