/**
 * ============================================
 * AUTHENTICATION SYSTEM - Firebase Integration
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

import {
    auth,
    registerAgent,
    loginAgent,
    logoutAgent,
    getCurrentUser,
    onAuthStateChange,
    getAgentData,
    COLLECTIONS,
    db,
    formatTimestamp,
    getPollingUnit,
    seedLGAs
} from './firebase-config.js';

// ============================================
// STATE
// ============================================
let currentUser = null;
let currentAgent = null;

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 380px;
        `;
        document.body.appendChild(div);
    }
    
    const container2 = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const colors = {
        success: '#00C853',
        error: '#FF1744',
        warning: '#FFB300',
        info: '#0066FF'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.style.cssText = `
        padding: 14px 20px;
        border-radius: 10px;
        background: ${colors[type] || '#0066FF'};
        color: white;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        animation: slideIn 0.4s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
    `;
    
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container2.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ============================================
// TOGGLE PASSWORD
// ============================================
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const button = field.parentElement.querySelector('.toggle-password i');
    if (field.type === 'password') {
        field.type = 'text';
        if (button) button.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        if (button) button.className = 'fas fa-eye';
    }
}

// ============================================
// LOGIN HANDLER
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe')?.checked || false;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const btn = e.target.querySelector('.btn-auth');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    const result = await loginAgent(email, password);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    
    if (result.success) {
        currentUser = result.user;
        currentAgent = result.agentData;
        
        if (remember) {
            localStorage.setItem('rememberedEmail', email);
        }
        
        showToast(`Welcome back, ${result.agentData?.firstName || 'Agent'}! 🎉`, 'success');
        
        // Redirect based on role
        if (result.agentData?.role === 'admin') {
            setTimeout(() => window.location.href = 'admin.html', 800);
        } else {
            setTimeout(() => window.location.href = 'agent-dashboard.html', 800);
        }
    } else {
        showToast(result.error || 'Login failed', 'error');
    }
}

// ============================================
// REGISTER HANDLER
// ============================================
async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pollingUnitUID = document.getElementById('regPollingUnit').value.trim().toUpperCase();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms')?.checked || false;
    
    // Validation
    if (!firstName || !lastName || !email || !phone || !pollingUnitUID || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showToast('Please agree to the Terms of Service', 'error');
        return;
    }
    
    // Check if polling unit exists
    const puResult = await getPollingUnit(pollingUnitUID);
    if (!puResult.success) {
        showToast('Invalid Polling Unit UID. Please check with your coordinator.', 'error');
        return;
    }
    
    const btn = e.target.querySelector('.btn-auth');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    
    const userData = {
        firstName,
        lastName,
        phone,
        pollingUnitUID,
        lga: puResult.data.lga,
        ward: puResult.data.ward || '',
        registeredVoters: puResult.data.registeredVoters || 0,
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
        }
    };
    
    const result = await registerAgent(email, password, userData);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    
    if (result.success) {
        showToast('Registration successful! Please check your email to verify your account. 📧', 'success');
        
        // Clear form
        document.getElementById('registerForm').reset();
        
        // Switch to login
        setTimeout(() => {
            showLogin();
            document.getElementById('loginEmail').value = email;
            showToast('Please login after verifying your email', 'info');
        }, 2000);
    } else {
        showToast(result.error || 'Registration failed', 'error');
    }
}

// ============================================
// LOGOUT HANDLER
// ============================================
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    const result = await logoutAgent();
    if (result.success) {
        showToast('Logged out successfully', 'info');
        setTimeout(() => window.location.href = 'agent-login.html', 500);
    } else {
        showToast('Logout failed', 'error');
    }
}

// ============================================
// UI FUNCTIONS
// ============================================
function showRegister() {
    const loginCard = document.querySelector('.auth-card:not(.register-card)');
    const registerCard = document.getElementById('registerCard');
    if (loginCard) loginCard.style.display = 'none';
    if (registerCard) registerCard.style.display = 'block';
}

function showLogin() {
    const loginCard = document.querySelector('.auth-card:not(.register-card)');
    const registerCard = document.getElementById('registerCard');
    if (loginCard) loginCard.style.display = 'block';
    if (registerCard) registerCard.style.display = 'none';
}

// ============================================
// CHECK AUTH STATE
// ============================================
function checkAuthState() {
    onAuthStateChange(async (user) => {
        if (user) {
            currentUser = user;
            
            // Get agent data
            const result = await getAgentData(user.uid);
            if (result.success) {
                currentAgent = result.data;
                
                // If on login page, redirect to dashboard
                if (window.location.pathname.includes('agent-login.html')) {
                    const role = result.data?.role || 'agent';
                    window.location.href = role === 'admin' ? 'admin.html' : 'agent-dashboard.html';
                }
            }
        } else {
            currentUser = null;
            currentAgent = null;
            
            // If on protected page, redirect to login
            const protectedPages = ['agent-dashboard.html', 'admin.html'];
            if (protectedPages.some(page => window.location.pathname.includes(page))) {
                window.location.href = 'agent-login.html';
            }
        }
    });
}

// ============================================
// SEED DATA (Development Only)
// ============================================
async function seedData() {
    if (confirm('Seed LGAs into Firestore?')) {
        await seedLGAs();
        showToast('LGAs seeded successfully!', 'success');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Check auth state
    checkAuthState();
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Check remembered email
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) emailInput.value = remembered;
    }
    
    // Seed data (for development)
    // Uncomment to seed LGAs
    // setTimeout(seedData, 2000);
});

// ============================================
// EXPOSE GLOBALLY
// ============================================
window.togglePassword = togglePassword;
window.showRegister = showRegister;
window.showLogin = showLogin;
window.handleLogout = handleLogout;
window.showToast = showToast;
