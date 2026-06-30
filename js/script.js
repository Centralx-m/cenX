/**
 * ============================================
 * ELECTION DASHBOARD - Centralized JavaScript
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

// ============================================
// DATA STORE
// ============================================
const ElectionData = {
    // Static LGA Data
    lgas: [
        { id: 1, name: 'Bauchi', units: 493, status: 'complete', apc: 45, pdp: 38, lp: 10, nnpp: 5, others: 2, leading: 'APC' },
        { id: 2, name: 'Toro', units: 292, status: 'counting', apc: 35, pdp: 41, lp: 18, nnpp: 4, others: 2, leading: 'PDP' },
        { id: 3, name: 'Ningi', units: 282, status: 'pending', apc: 0, pdp: 0, lp: 0, nnpp: 0, others: 0, leading: 'Pending' },
        { id: 4, name: 'Katagum', units: 274, status: 'complete', apc: 32, pdp: 44, lp: 16, nnpp: 6, others: 2, leading: 'PDP' },
        { id: 5, name: 'Gamawa', units: 256, status: 'complete', apc: 47, pdp: 31, lp: 12, nnpp: 8, others: 2, leading: 'APC' },
        { id: 6, name: 'Shira', units: 238, status: 'counting', apc: 40, pdp: 35, lp: 15, nnpp: 7, others: 3, leading: 'APC' },
        { id: 7, name: 'Alkaleri', units: 237, status: 'complete', apc: 44, pdp: 33, lp: 13, nnpp: 8, others: 2, leading: 'APC' },
        { id: 8, name: 'Darazo', units: 233, status: 'complete', apc: 38, pdp: 42, lp: 12, nnpp: 6, others: 2, leading: 'PDP' },
        { id: 9, name: 'Ganjuwa', units: 208, status: 'complete', apc: 41, pdp: 36, lp: 14, nnpp: 7, others: 2, leading: 'APC' },
        { id: 10, name: 'Misau', units: 197, status: 'counting', apc: 33, pdp: 38, lp: 22, nnpp: 5, others: 2, leading: 'PDP' },
        { id: 11, name: 'Tafawa-Balewa', units: 196, status: 'complete', apc: 46, pdp: 30, lp: 14, nnpp: 8, others: 2, leading: 'APC' },
        { id: 12, name: 'Itas/Gadau', units: 193, status: 'pending', apc: 0, pdp: 0, lp: 0, nnpp: 0, others: 0, leading: 'Pending' },
        { id: 13, name: 'Kirfi', units: 132, status: 'complete', apc: 39, pdp: 40, lp: 13, nnpp: 6, others: 2, leading: 'PDP' },
        { id: 14, name: 'Dambam', units: 121, status: 'complete', apc: 43, pdp: 34, lp: 15, nnpp: 6, others: 2, leading: 'APC' },
        { id: 15, name: 'Giade', units: 121, status: 'complete', apc: 37, pdp: 43, lp: 12, nnpp: 6, others: 2, leading: 'PDP' },
        { id: 16, name: 'Warji', units: 116, status: 'pending', apc: 0, pdp: 0, lp: 0, nnpp: 0, others: 0, leading: 'Pending' },
        { id: 17, name: 'Jama\'are', units: 105, status: 'complete', apc: 42, pdp: 36, lp: 13, nnpp: 7, others: 2, leading: 'APC' },
        { id: 18, name: 'Dass', units: 79, status: 'complete', apc: 40, pdp: 38, lp: 14, nnpp: 6, others: 2, leading: 'APC' },
        { id: 19, name: 'Bogoro', units: 70, status: 'complete', apc: 35, pdp: 42, lp: 16, nnpp: 5, others: 2, leading: 'PDP' },
        { id: 20, name: 'Zaki', units: 231, status: 'complete', apc: 44, pdp: 32, lp: 15, nnpp: 7, others: 2, leading: 'APC' }
    ],
    
    // Aggregate totals
    get totals() {
        let totalUnits = 0;
        let totalAPC = 0;
        let totalPDP = 0;
        let totalLP = 0;
        let totalNNPP = 0;
        let totalOthers = 0;
        let reported = 0;
        let counting = 0;
        let pending = 0;
        
        this.lgas.forEach(lga => {
            totalUnits += lga.units;
            totalAPC += lga.apc;
            totalPDP += lga.pdp;
            totalLP += lga.lp;
            totalNNPP += lga.nnpp;
            totalOthers += lga.others;
            
            if (lga.status === 'complete') reported++;
            else if (lga.status === 'counting') counting++;
            else if (lga.status === 'pending') pending++;
        });
        
        return {
            totalUnits,
            totalAPC,
            totalPDP,
            totalLP,
            totalNNPP,
            totalOthers,
            reported,
            counting,
            pending
        };
    },
    
    // Get status counts
    get statusCounts() {
        let complete = 0, counting = 0, pending = 0;
        this.lgas.forEach(lga => {
            if (lga.status === 'complete') complete++;
            else if (lga.status === 'counting') counting++;
            else if (lga.status === 'pending') pending++;
        });
        return { complete, counting, pending };
    }
};

// ============================================
// ALERTS DATA
// ============================================
const AlertData = [
    { type: 'success', icon: '✅', title: 'Bauchi LGA Complete - All 493 polling units reported', time: '14:28 WAT' },
    { type: 'warning', icon: '⚠️', title: 'Toro LGA - 10 agents offline due to network issues', time: '14:15 WAT' },
    { type: 'info', icon: 'ℹ️', title: 'Ningi LGA - Results expected in 30 minutes', time: '14:05 WAT' },
    { type: 'success', icon: '✅', title: 'Katagum LGA - 274 units verified and approved', time: '13:50 WAT' },
    { type: 'danger', icon: '🚨', title: 'Itas/Gadau LGA - Delayed due to late voting', time: '13:30 WAT' },
    { type: 'info', icon: 'ℹ️', title: 'Total voter turnout now at 42.7%', time: '13:15 WAT' }
];

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Render LGA Table
 */
function renderLGATable() {
    const tbody = document.getElementById('lgaTableBody');
    if (!tbody) return;
    
    let html = '';
    ElectionData.lgas.forEach(lga => {
        const statusClass = lga.status === 'complete' ? 'status-complete' :
                           lga.status === 'counting' ? 'status-counting' : 'status-pending';
        const statusLabel = lga.status.charAt(0).toUpperCase() + lga.status.slice(1);
        
        const leadingClass = lga.leading === 'APC' ? 'leading-apc' :
                            lga.leading === 'PDP' ? 'leading-pdp' :
                            lga.leading === 'LP' ? 'leading-lp' :
                            lga.leading === 'NNPP' ? 'leading-nnpp' : 'leading-others';
        
        html += `
            <tr>
                <td><strong>${lga.name}</strong></td>
                <td>${lga.units}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${lga.apc > 0 ? lga.apc + '%' : '-'}</td>
                <td>${lga.pdp > 0 ? lga.pdp + '%' : '-'}</td>
                <td>${lga.lp > 0 ? lga.lp + '%' : '-'}</td>
                <td><span class="leading-badge ${leadingClass}">${lga.leading}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Render Alerts
 */
function renderAlerts() {
    const alertList = document.getElementById('alertList');
    if (!alertList) return;
    
    let html = '';
    AlertData.forEach(alert => {
        const alertClass = alert.type === 'success' ? 'alert-success' :
                          alert.type === 'warning' ? 'alert-warning' :
                          alert.type === 'danger' ? 'alert-danger' : 'alert-info';
        
        html += `
            <div class="alert-item ${alertClass}">
                <span class="alert-icon">${alert.icon}</span>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-time">${alert.time}</div>
                </div>
            </div>
        `;
    });
    
    alertList.innerHTML = html;
}

/**
 * Update Dashboard Stats
 */
function updateStats() {
    const totals = ElectionData.totals;
    const status = ElectionData.statusCounts;
    
    // Total polling units
    const totalUnits = 5423; // Official INEC figure
    
    // Calculate percentages
    const reportedPercent = Math.round((totals.reported / 20) * 100);
    const accredited = 1174000;
    const valid = 1021000;
    const rejected = 153000;
    const turnout = 42.7;
    
    // Update DOM elements
    document.getElementById('turnout').textContent = turnout + '%';
    document.getElementById('accredited').textContent = accredited.toLocaleString();
    document.getElementById('validVotes').textContent = valid.toLocaleString();
    document.getElementById('rejectedVotes').textContent = rejected.toLocaleString();
    
    document.getElementById('reportedLgas').textContent = totals.reported;
    document.getElementById('countingLgas').textContent = totals.counting;
    document.getElementById('pendingLgas').textContent = totals.pending;
    document.getElementById('mapStatus').textContent = `${totals.reported}/20 LGAs Reported`;
    
    document.getElementById('tableReported').textContent = totals.reported;
    document.getElementById('tablePending').textContent = totals.pending;
    
    // Update party votes
    document.getElementById('apcVotes').textContent = '342,000';
    document.getElementById('pdpVotes').textContent = '289,000';
    document.getElementById('lpVotes').textContent = '98,000';
    document.getElementById('nnppVotes').textContent = '51,000';
    document.getElementById('othersVotes').textContent = '41,000';
    
    document.getElementById('apcPercent').textContent = '42%';
    document.getElementById('pdpPercent').textContent = '35%';
    document.getElementById('lpPercent').textContent = '12%';
    document.getElementById('nnppPercent').textContent = '6%';
    document.getElementById('othersPercent').textContent = '5%';
    
    document.getElementById('apcBar').style.width = '42%';
    document.getElementById('pdpBar').style.width = '35%';
    document.getElementById('lpBar').style.width = '12%';
    document.getElementById('nnppBar').style.width = '6%';
    document.getElementById('othersBar').style.width = '5%';
    
    document.getElementById('totalValid').textContent = valid.toLocaleString();
    
    // Agent stats (simulated)
    document.getElementById('agentsOnline').textContent = '1,234';
    document.getElementById('agentsOffline').textContent = '56';
    document.getElementById('agentsReported').textContent = '4,892';
    document.getElementById('agentsVerified').textContent = '3,201';
}

/**
 * Update Header Time
 */
function updateHeaderTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-NG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
    document.getElementById('headerTime').textContent = `Last Update: ${timeStr} WAT`;
}

/**
 * Refresh Data (Simulated)
 */
function refreshData() {
    const btn = document.querySelector('.btn-primary');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    setTimeout(() => {
        updateHeaderTime();
        updateStats();
        renderLGATable();
        renderAlerts();
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        btn.disabled = false;
        showToast('Data refreshed successfully!');
    }, 1200);
}

/**
 * Toast Notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #001F3F;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        border-left: 4px solid #0066FF;
        z-index: 9999;
        animation: slideIn 0.4s ease;
        max-width: 400px;
    `;
    toast.textContent = '✓ ' + message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ============================================
// AUTO-REFRESH
// ============================================
let refreshInterval;

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        updateHeaderTime();
        // Simulate data changes (for demo)
        // In production, fetch from API
    }, 30000); // Every 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Render everything
    renderLGATable();
    renderAlerts();
    updateStats();
    updateHeaderTime();
    startAutoRefresh();
    
    console.log('🚀 Bauchi Election Dashboard loaded successfully!');
    console.log('📊 Powered by WebHotel.Cloud');
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', function(e) {
    // Ctrl+R or Cmd+R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
});

// ============================================
// EXPOSE FOR CONSOLE DEBUGGING
// ============================================
window.__election = {
    data: ElectionData,
    refresh: refreshData,
    alerts: AlertData
};

console.log('💡 Type __election in console for debugging');
