// js/script.js
// DOM Elements for Auth Page
const signInBtn = document.getElementById('sign-in-btn');
const signUpBtn = document.getElementById('sign-up-btn');
const signInForm = document.getElementById('sign-in-form');
const signUpForm = document.getElementById('sign-up-form');
const signInLink = document.getElementById('sign-in-link');
const signUpLink = document.getElementById('sign-up-link');
const hero = document.querySelector('.hero');

// Show Sign In Form
if (signInBtn) {
    signInBtn.addEventListener('click', () => {
        hero.classList.add('hidden');
        signUpForm.classList.add('hidden');
        signInForm.classList.remove('hidden');
    });
}

// Show Sign Up Form
if (signUpBtn) {
    signUpBtn.addEventListener('click', () => {
        hero.classList.add('hidden');
        signInForm.classList.add('hidden');
        signUpForm.classList.remove('hidden');
    });
}

// Switch to Sign In Form
if (signInLink) {
    signInLink.addEventListener('click', (e) => {
        e.preventDefault();
        signUpForm.classList.add('hidden');
        signInForm.classList.remove('hidden');
    });
}

// Switch to Sign Up Form
if (signUpLink) {
    signUpLink.addEventListener('click', (e) => {
        e.preventDefault();
        signInForm.classList.add('hidden');
        signUpForm.classList.remove('hidden');
    });
}

// Utility function to format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Utility function to format time ago
function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDate(timestamp);
}

// Global helper function for API calls
async function makeApiCall(endpoint, options = {}) {
    return userManager.apiCall(endpoint, options);
}