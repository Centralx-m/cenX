/**
 * ============================================
 * AGENT DASHBOARD - Bauchi Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

// ============================================
// SESSION CHECK
// ============================================
function checkSession() {
    const agentData = sessionStorage.getItem('currentAgent');
    if (!agentData) {
        window.location.href = 'agent-login.html';
        return null;
    }
    return JSON.parse(agentData);
}

// ============================================
// LOAD AGENT DATA
// ============================================
function loadAgentData() {
    const agent = checkSession();
    if (!agent) return;
    
    // Update welcome banner
    document.getElementById('agentName').textContent = agent.firstName + ' ' + agent.lastName;
    document.getElementById('agentPollingUnit').textContent = agent.pollingUnitUID;
    document.getElementById('agentLGA').textContent = agent.lga || 'Not assigned';
    document.getElementById('agentWard').textContent = agent.ward || 'Not assigned';
    
    // Update form
    document.getElementById('formPollingUnit').textContent = agent.pollingUnitUID;
    document.getElementById('registeredVoters').value = agent.registeredVoters || 0;
    
    // Update status
    document.getElementById('agentStatusText').textContent = agent.isVerified ? 'Verified ✅' : 'Pending Verification ⏳';
    
    // Load submission history
    loadHistory(agent.id);
}

// ============================================
// LOAD SUBMISSION HISTORY
// ============================================
function loadHistory(agentId) {
    // In production, fetch from API
    const history = JSON.parse(localStorage.getItem(`history_${agentId}`) || '[]');
    
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;
    
    if (history.length === 0) {
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
    history.slice().reverse().forEach(item => {
        const statusClass = item.status === 'approved' ? 'approved' :
                           item.status === 'rejected' ? 'rejected' : 'pending';
        
        html += `
            <tr>
                <td>${item.date}</td>
                <td>${item.pollingUnit}</td>
                <td>${item.accredited}</td>
                <td>${item.valid}</td>
                <td>${item.rejected}</td>
                <td><span class="history-status ${statusClass}">${item.status}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================
// SUBMIT RESULT
// ============================================
function submitResult(e) {
    e.preventDefault();
    
    const agent = checkSession();
    if (!agent) return;
    
    // Get form values
    const accredited = parseInt(document.getElementById('accreditedVoters').value);
    const valid = parseInt(document.getElementById('validVotes').value);
    const rejected = parseInt(document.getElementById('rejectedVotes').value);
    const apc = parseInt(document.getElementById('partyAPC').value) || 0;
    const pdp = parseInt(document.getElementById('partyPDP').value) || 0;
    const lp = parseInt(document.getElementById('partyLP').value) || 0;
    const nnpp = parseInt(document.getElementById('partyNNPP').value) || 0;
    const others = parseInt(document.getElementById('partyOthers').value) || 0;
    
    const registered = parseInt(document.getElementById('registeredVoters').value);
    
    // Validation
    if (!accredited || accredited < 0) {
        showToast('Please enter accredited voters', 'error');
        return;
    }
    
    if (!valid || valid < 0) {
        showToast('Please enter valid votes', 'error');
        return;
    }
    
    if (!rejected || rejected < 0) {
        showToast('Please enter rejected votes', 'error');
        return;
    }
    
    if (accredited > registered) {
        showToast('Accredited voters cannot exceed registered voters', 'error');
        return;
    }
    
    const totalParty = apc + pdp + lp + nnpp + others;
    if (totalParty !== valid) {
        showToast(`Total party votes (${totalParty}) must equal valid votes (${valid})`, 'error');
        return;
    }
    
    if (valid + rejected !== accredited) {
        showToast(`Valid (${valid}) + Rejected (${rejected}) must equal Accredited (${accredited})`, 'error');
        return;
    }
    
    // Create submission
    const submission = {
        date: new Date().toLocaleString(),
        pollingUnit: agent.pollingUnitUID,
        accredited,
        valid,
        rejected,
        parties: { apc, pdp, lp, nnpp, others },
        status: 'pending'
    };
    
    // Save to history
    const history = JSON.parse(localStorage.getItem(`history_${agent.id}`) || '[]');
    history.push(submission);
    localStorage.setItem(`history_${agent.id}`, JSON.stringify(history));
    
    showToast('Result submitted successfully! 📤', 'success');
    
    // Reset form
    resetForm();
    
    // Reload history
    loadHistory(agent.id);
    
    // Update stats
    document.getElementById('accreditedToday').textContent = accredited;
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
// LOGOUT
// ============================================
function logoutAgent() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('currentAgent');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'agent-login.html';
        }, 500);
    }
}

// ============================================
// UPDATE TIME
// ============================================
function updateAgentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-NG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
    document.getElementById('agentTime').textContent = `Last Update: ${timeStr} WAT`;
}

// ============================================
// TOAST NOTIFICATIONS (Reused from auth.js)
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
// AUTO-REFRESH
// ============================================
setInterval(updateAgentTime, 30000);

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadAgentData();
    updateAgentTime();
    
    // Result form
    const resultForm = document.getElementById('resultForm');
    if (resultForm) {
        resultForm.addEventListener('submit', submitResult);
    }
});

// Expose functions globally
window.logoutAgent = logoutAgent;
window.resetForm = resetForm;
window.showToast = showToast;
