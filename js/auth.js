/**
 * ============================================
 * AUTHENTICATION SYSTEM - Login & Register
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

// ============================================
// AGENT DATA STORE (Simulated Database)
// ============================================
const AgentDB = {
    // Pre-registered agents with their polling units
    agents: [
        {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123',
            phone: '08012345678',
            pollingUnitUID: 'BAU-001-001',
            lga: 'Bauchi',
            ward: 'Central',
            registeredVoters: 850,
            isVerified: true
        },
        {
            id: 2,
            firstName: 'Amina',
            lastName: 'Mohammed',
            email: 'amina@example.com',
            password: 'password123',
            phone: '08087654321',
            pollingUnitUID: 'BAU-002-015',
            lga: 'Toro',
            ward: 'North',
            registeredVoters: 620,
            isVerified: true
        },
        {
            id: 3,
            firstName: 'Musa',
            lastName: 'Sani',
            email: 'musa@example.com',
            password: 'password123',
            phone: '08044556677',
            pollingUnitUID: 'BAU-003-042',
            lga: 'Ningi',
            ward: 'East',
            registeredVoters: 740,
            isVerified: true
        }
    ],
    
    // Submissions history
    submissions: {}
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.parentElement.querySelector('.toggle-password i');
    
    if (field.type === 'password') {
        field.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        button.className = 'fas fa-eye';
    }
}

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Login Handler
 */
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Find agent
    const agent = AgentDB.agents.find(a => a.email === email);
    
    if (!agent) {
        showToast('Invalid email or password', 'error');
        return;
    }
    
    if (agent.password !== password) {
        showToast('Invalid email or password', 'error');
        return;
    }
    
    // Login successful
    if (remember) {
        localStorage.setItem('rememberedAgent', JSON.stringify({
            email: agent.email,
            id: agent.id
        }));
    }
    
    // Store session
    sessionStorage.setItem('currentAgent', JSON.stringify(agent));
    
    showToast(`Welcome back, ${agent.firstName}! 🎉`, 'success');
    
    // Redirect to agent dashboard
    setTimeout(() => {
        window.location.href = 'agent-dashboard.html';
    }, 800);
}

/**
 * Register Handler
 */
function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pollingUnit = document.getElementById('regPollingUnit').value.trim().toUpperCase();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (!firstName || !lastName || !email || !phone || !pollingUnit || !password) {
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
    
    // Check if email already registered
    if (AgentDB.agents.some(a => a.email === email)) {
        showToast('This email is already registered', 'error');
        return;
    }
    
    // Check if polling unit UID exists in our database
    // In production, this would check against INEC data
    const validUIDs = AgentDB.agents.map(a => a.pollingUnitUID);
    // For demo, allow any UID
    // In production, validate against official list
    
    // Create new agent
    const newAgent = {
        id: AgentDB.agents.length + 1,
        firstName,
        lastName,
        email,
        password,
        phone,
        pollingUnitUID: pollingUnit,
        lga: 'Pending Verification',
        ward: 'Pending Verification',
        registeredVoters: 0,
        isVerified: false
    };
    
    AgentDB.agents.push(newAgent);
    
    showToast('Registration successful! Please wait for verification. 📝', 'success');
    
    // Clear form
    document.getElementById('registerForm').reset();
    
    // Switch to login after 2 seconds
    setTimeout(() => {
        showLogin();
        document.getElementById('loginEmail').value = email;
        showToast('Please login after verification', 'info');
    }, 2000);
}

/**
 * Show Register Form
 */
function showRegister() {
    document.querySelector('.auth-card:not(.register-card)').style.display = 'none';
    document.getElementById('registerCard').style.display = 'block';
}

/**
 * Show Login Form
 */
function showLogin() {
    document.querySelector('.auth-card:not(.register-card)').style.display = 'block';
    document.getElementById('registerCard').style.display = 'none';
}

/**
 * Check Remembered Session
 */
function checkRememberedSession() {
    const remembered = localStorage.getItem('rememberedAgent');
    if (remembered) {
        try {
            const data = JSON.parse(remembered);
            const agent = AgentDB.agents.find(a => a.id === data.id);
            if (agent) {
                sessionStorage.setItem('currentAgent', JSON.stringify(agent));
            }
        } catch (e) {
            localStorage.removeItem('rememberedAgent');
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Check for remembered session
    checkRememberedSession();
    
    // If already logged in, redirect to dashboard
    const currentAgent = sessionStorage.getItem('currentAgent');
    if (currentAgent && window.location.pathname.includes('agent-login.html')) {
        window.location.href = 'agent-dashboard.html';
    }
    
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
    
    // Enter key to login
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const loginForm = document.getElementById('loginForm');
            if (loginForm && loginForm.style.display !== 'none') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        }
    });
});

// Expose functions globally
window.togglePassword = togglePassword;
window.showRegister = showRegister;
window.showLogin = showLogin;
