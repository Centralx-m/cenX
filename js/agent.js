/**
 * ============================================
 * AGENT DASHBOARD - Firebase Integration
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

import {
    auth,
    getCurrentUser,
    getAgentData,
    submitResult,
    getAgentResults,
    subscribeToAgentResults,
    updateAgentData,
    uploadProfileImage,
    getPollingUnit,
    COLLECTIONS,
    db,
    formatTimestamp,
    getCurrentTimestamp,
    sendNotification,
    getAgentNotifications
} from './firebase-config.js';

// ============================================
// STATE
// ============================================
let currentAgent = null;
let currentUser = null;
let resultsSubscription = null;
let notificationSubscription = null;

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
// LOAD AGENT DATA
// ============================================
async function loadAgentData() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'agent-login.html';
        return;
    }
    
    const result = await getAgentData(currentUser.uid);
    if (!result.success) {
        showToast('Failed to load agent data', 'error');
        return;
    }
    
    currentAgent = result.data;
    
    // Update UI
    document.getElementById('agentName').textContent = 
        `${currentAgent.firstName} ${currentAgent.lastName}`;
    document.getElementById('agentPollingUnit').textContent = 
        currentAgent.pollingUnitUID || 'N/A';
    document.getElementById('agentLGA').textContent = 
        currentAgent.lga || 'Not assigned';
    document.getElementById('agentWard').textContent = 
        currentAgent.ward || 'Not assigned';
    
    document.getElementById('formPollingUnit').textContent = 
        currentAgent.pollingUnitUID || 'N/A';
    document.getElementById('registeredVoters').value = 
        currentAgent.registeredVoters || 0;
    
    document.getElementById('agentStatusText').textContent = 
        currentAgent.isVerified ? 'Verified ✅' : 'Pending Verification ⏳';
    
    // Load polling unit data
    if (currentAgent.pollingUnitUID) {
        const puResult = await getPollingUnit(currentAgent.pollingUnitUID);
        if (puResult.success) {
            document.getElementById('puVoters').textContent = 
                puResult.data.registeredVoters || 0;
        }
    }
    
    // Load history
    loadAgentHistory();
    
    // Load notifications
    loadNotifications();
}

// ============================================
// LOAD AGENT HISTORY (Real-time)
// ============================================
function loadAgentHistory() {
    if (!currentUser) return;
    
    // Unsubscribe from previous subscription
    if (resultsSubscription) {
        resultsSubscription();
        resultsSubscription = null;
    }
    
    resultsSubscription = subscribeToAgentResults(
        currentUser.uid,
        (results) => {
            renderHistory(results);
            
            // Update stats
            const total = results.length;
            const pending = results.filter(r => r.status === 'pending').length;
            const approved = results.filter(r => r.status === 'approved').length;
            const rejected = results.filter(r => r.status === 'rejected').length;
            
            document.getElementById('accreditedToday').textContent = 
                results.reduce((sum, r) => sum + (r.accreditedVoters || 0), 0);
            
            // Update status badge
            if (pending > 0) {
                document.getElementById('agentStatusText').textContent = 
                    `${pending} pending submission(s) ⏳`;
            } else if (approved > 0) {
                document.getElementById('agentStatusText').textContent = 
                    `${approved} approved ✅`;
            }
        }
    );
}

// ============================================
// RENDER HISTORY
// ============================================
function renderHistory(results) {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;
    
    if (!results || results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No submissions yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    results.slice(0, 20).forEach(item => {
        const statusClass = item.status === 'approved' ? 'approved' :
                           item.status === 'rejected' ? 'rejected' : 'pending';
        const statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);
        
        html += `
            <tr>
                <td>${formatTimestamp(item.submittedAt)}</td>
                <td>${item.pollingUnitUID || 'N/A'}</td>
                <td>${item.accreditedVoters || 0}</td>
                <td>${item.validVotes || 0}</td>
                <td>${item.rejectedVotes || 0}</td>
                <td><span class="history-status ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================
// LOAD NOTIFICATIONS
// ============================================
async function loadNotifications() {
    if (!currentUser) return;
    
    const result = await getAgentNotifications(currentUser.uid);
    if (result.success && result.data.length > 0) {
        // Show latest notification as toast
        const latest = result.data[0];
        if (!latest.isRead) {
            showToast(`${latest.title}: ${latest.message}`, 
                latest.type === 'warning' ? 'warning' : 'info');
        }
    }
}

// ============================================
// SUBMIT RESULT
// ============================================
async function handleSubmitResult(e) {
    e.preventDefault();
    
    if (!currentUser || !currentAgent) {
        showToast('Please login first', 'error');
        return;
    }
    
    // Get form values
    const accreditedVoters = parseInt(document.getElementById('accreditedVoters').value);
    const validVotes = parseInt(document.getElementById('validVotes').value);
    const rejectedVotes = parseInt(document.getElementById('rejectedVotes').value);
    const apc = parseInt(document.getElementById('partyAPC').value) || 0;
    const pdp = parseInt(document.getElementById('partyPDP').value) || 0;
    const lp = parseInt(document.getElementById('partyLP').value) || 0;
    const nnpp = parseInt(document.getElementById('partyNNPP').value) || 0;
    const others = parseInt(document.getElementById('partyOthers').value) || 0;
    const registeredVoters = parseInt(document.getElementById('registeredVoters').value);
    
    // Validation
    if (!accreditedVoters || accreditedVoters < 0) {
        showToast('Please enter accredited voters', 'error');
        return;
    }
    
    if (!validVotes || validVotes < 0) {
        showToast('Please enter valid votes', 'error');
        return;
    }
    
    if (!rejectedVotes || rejectedVotes < 0) {
        showToast('Please enter rejected votes', 'error');
        return;
    }
    
    if (accreditedVoters > registeredVoters) {
        showToast('Accredited voters cannot exceed registered voters', 'error');
        return;
    }
    
    const totalParty = apc + pdp + lp + nnpp + others;
    if (totalParty !== validVotes) {
        showToast(`Total party votes (${totalParty}) must equal valid votes (${validVotes})`, 'error');
        return;
    }
    
    if (validVotes + rejectedVotes !== accreditedVoters) {
        showToast(`Valid (${validVotes}) + Rejected (${rejectedVotes}) must equal Accredited (${accreditedVoters})`, 'error');
        return;
    }
    
    const partyVotes = { apc, pdp, lp, nnpp, others };
    
    const resultData = {
        pollingUnitUID: currentAgent.pollingUnitUID,
        lga: currentAgent.lga,
        ward: currentAgent.ward,
        registeredVoters: registeredVoters,
        accreditedVoters: accreditedVoters,
        validVotes: validVotes,
        rejectedVotes: rejectedVotes,
        partyVotes: partyVotes,
        deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
        }
    };
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    const result = await submitResult(currentUser.uid, resultData);
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Result';
    
    if (result.success) {
        showToast('Result submitted successfully! 📤', 'success');
        resetForm();
    } else {
        showToast(result.error || 'Submission failed', 'error');
    }
}

// ============================================
// RESET FORM
// ============================================
function resetForm() {
    document.getElementById('accreditedVoters').value = '';
    document.getElementById('validVotes').value = '';
    document.getElementById('rejectedVotes').value = '';
    document.getElementById('partyAPC').value = '';
    document.getElementById('partyPDP').value = '';
    document.getElementById('partyLP').value = '';
    document.getElementById('partyNNPP').value = '';
    document.getElementById('partyOthers').value = '';
}

// ============================================
// UPDATE TIME
// ============================================
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-NG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
    const timeEl = document.getElementById('agentTime');
    if (timeEl) {
        timeEl.textContent = `Last Update: ${timeStr} WAT`;
    }
}

// ============================================
// LOGOUT
// ============================================
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    // Unsubscribe from real-time updates
    if (resultsSubscription) {
        resultsSubscription();
        resultsSubscription = null;
    }
    
    // Import and call logout
    const { logoutAgent } = await import('./firebase-config.js');
    const result = await logoutAgent();
    
    if (result.success) {
        showToast('Logged out successfully', 'info');
        setTimeout(() => window.location.href = 'agent-login.html', 500);
    } else {
        showToast('Logout failed', 'error');
    }
}

// ============================================
// PROFILE IMAGE UPLOAD
// ============================================
async function uploadProfileImage(file) {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }
    
    const result = await uploadProfileImage(currentUser.uid, file);
    if (result.success) {
        showToast('Profile image updated successfully!', 'success');
        // Update UI
        const img = document.getElementById('profileImage');
        if (img) img.src = result.url + '?t=' + Date.now();
    } else {
        showToast(result.error || 'Upload failed', 'error');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadAgentData();
    updateTime();
    setInterval(updateTime, 30000);
    
    // Result form
    const resultForm = document.getElementById('resultForm');
    if (resultForm) {
        resultForm.addEventListener('submit', handleSubmitResult);
    }
    
    // Logout button
    const logoutBtn = document.querySelector('.btn-danger');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Profile image upload
    const fileInput = document.getElementById('profileImageInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadProfileImage(e.target.files[0]);
            }
        });
    }
});

// ============================================
// EXPOSE GLOBALLY
// ============================================
window.resetForm = resetForm;
window.handleLogout = handleLogout;
window.showToast = showToast;
