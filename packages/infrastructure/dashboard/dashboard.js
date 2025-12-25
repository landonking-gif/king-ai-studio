/**
 * 👑 King AI Dashboard - Core Intelligence
 */

const STATE = {
    businesses: [],
    approvals: [],
    logs: [],
    totalProfit: 0,
    currentTab: 'dashboard',
    lastSync: null,
    connectionStatus: 'online', // online, offline, connecting
    searchQuery: '',
    filteredBusinesses: [],
    filteredLogs: [],
    notifications: []
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initCommandCenter();
    initFullCommandCenter();
    initSearch();
    initSearch();
    // initThemeToggle(); // Removed - Dark mode enforced
    initNotifications();
    initNotifications();
    initHelpModal();
    initKeyboardShortcuts();
    initGuidedTour();
    startSync();
    setupCharts();
    monitorConnection();
});

// --- Navigation & Routing ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });

        // Add keyboard navigation
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Navigate to ${item.querySelector('span').textContent}`);

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }

            // Arrow key navigation
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextItem = navItems[index + 1] || navItems[0];
                nextItem.focus();
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevItem = navItems[index - 1] || navItems[navItems.length - 1];
                prevItem.focus();
            }
        });
    });

    // Handle hash routing
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (['dashboard', 'empire', 'approvals', 'ceo', 'analytics', 'settings'].includes(hash)) {
            switchTab(hash);
        }
    }
}

function switchTab(tabId) {
    STATE.currentTab = tabId;
    window.location.hash = tabId;

    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    // Update View UI
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('visible');
    });

    const targetView = document.getElementById(`${tabId}-view`);
    if (targetView) {
        targetView.classList.remove('hidden');
        setTimeout(() => targetView.classList.add('visible'), 10);
    }

    // Refresh data for the specific view
    if (tabId === 'approvals') renderFullApprovals();
    if (tabId === 'empire') renderEmpire();
    if (tabId === 'analytics') {
        // Lazy load analytics charts
        setTimeout(() => renderAnalytics(), 100);
    }
    if (tabId === 'settings') renderSettings();
}

// --- Data Synchronization ---
async function startSync() {
    await fetchData();
    // Use longer interval for better performance
    setInterval(fetchData, 10000); // Changed from 5000 to 10000ms
}

async function fetchData() {
    const statusElement = document.getElementById('connection-status');
    const wasOffline = STATE.connectionStatus === 'offline';

    try {
        STATE.connectionStatus = 'connecting';
        updateConnectionStatus();

        const response = await fetch('/api/all-data');
        if (!response.ok) throw new Error('API unreachable');

        const data = await response.json();

        STATE.businesses = data.businesses || [];
        STATE.approvals = data.approvals || [];
        STATE.logs = data.logs || [];
        STATE.totalProfit = data.totalProfit || 0;

        // Add ceoStatus to STATE if returned
        STATE.ceoStatus = data.ceoStatus || {};

        STATE.lastSync = new Date();
        STATE.connectionStatus = 'online';

        // If we were offline and now we're back online
        if (wasOffline) {
            showToast('🔗 Connection restored', 'success');
        }

        updateUI();
        applySearchFilter();

        // Update Live Status
        if (data.ceoStatus) {
            updateLiveStatus(data.ceoStatus);
        }

    } catch (error) {
        console.error('Core sync failed:', error);
        STATE.connectionStatus = 'offline';

        if (STATE.connectionStatus !== 'offline') {
            showToast('📡 Connection lost. Retrying...', 'warning');
        }

        // Show cached data if available
        if (STATE.businesses.length > 0) {
            updateUI();
            applySearchFilter();
        }
    }

    updateConnectionStatus();
}

function updateUI() {
    // Stats
    document.getElementById('stat-roi').textContent = `$${STATE.totalProfit.toLocaleString()}`;
    document.getElementById('stat-active').textContent = STATE.businesses.filter(b => b.status === 'running').length;
    document.getElementById('stat-tasks').textContent = STATE.logs.length.toLocaleString();
    document.getElementById('stat-pending').textContent = STATE.approvals.length;
    document.getElementById('pending-count').textContent = STATE.approvals.length;
    document.getElementById('entity-count').textContent = STATE.businesses.length;

    // Components
    renderBusinesses();
    renderLogs();
    renderMiniApprovals();
}

function updateLiveStatus(status) {
    const projectEl = document.getElementById('sidebar-project');
    const stepEl = document.getElementById('sidebar-step');
    const activityEl = document.getElementById('sidebar-activity');

    if (projectEl) projectEl.textContent = status.activeBusiness?.idea || status.activeBusiness?.name || "Idle / Scouting";
    if (stepEl) {
        // Show current step or default to status text
        const stepText = status.currentStep || status.status || "Waiting...";
        stepEl.textContent = stepText.substring(0, 30) + (stepText.length > 30 ? '...' : '');
    }
    if (activityEl) {
        // Show latest thought or log
        const activity = status.recentThoughts || (status.recentProgress && status.recentProgress[0]?.message) || "...";
        activityEl.textContent = activity;
        activityEl.title = activity; // Tooltip
    }
}

// --- Renderers ---
function renderBusinesses() {
    const container = document.getElementById('business-container');
    if (!container) return;

    const businessesToShow = STATE.searchQuery ? STATE.filteredBusinesses : STATE.businesses;

    if (STATE.connectionStatus === 'connecting' && STATE.businesses.length === 0) {
        // Show loading skeletons
        container.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-body"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-body"></div>
            </div>
        `;
        return;
    }

    if (businessesToShow.length === 0) {
        const message = STATE.searchQuery ?
            `No businesses match "${STATE.searchQuery}"` :
            'No active ventures yet. Launch your first project!';
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <p>${message}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = businessesToShow.map((b, index) => `
        <div class="business-card" onclick="showBusinessDetails(${index})" style="cursor: pointer;">
            <div class="card-top">
                <div>
                    <div class="biz-name">${b.name || 'Incognito Venture'}</div>
                    <div class="biz-type">${b.industry || 'R&D'}</div>
                </div>
                <div class="status-badge status-${b.status}">${b.status}</div>
            </div>
            <div class="progress-container">
                <div class="progress-label">
                    <span>${b.current_phase || 'Phase 1'}</span>
                    <span>${b.progress || 0}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${b.progress || 0}%"></div>
                </div>
            </div>
            <div class="mt-20">
                <p style="font-size: 0.8rem; color: var(--text-secondary)">${b.last_action || 'System initializing...'}</p>
            </div>
        </div>
    `).join('');
}

function renderLogs() {
    const container = document.getElementById('log-container');
    if (!container) return;

    const logsToShow = STATE.searchQuery ? STATE.filteredLogs : STATE.logs;

    if (logsToShow.length === 0) {
        const message = STATE.searchQuery ?
            `No logs match "${STATE.searchQuery}"` :
            'No activity logs yet.';
        container.innerHTML = `<div class="empty-state" style="padding: 40px 0;"><p>${message}</p></div>`;
        return;
    }

    container.innerHTML = logsToShow.slice(0, 50).map(l => `
        <div class="log-entry ${l.type || 'info'}">
            <span class="log-time">${new Date(l.timestamp).toLocaleTimeString()}</span>
            <span class="log-msg">${l.message}</span>
        </div>
    `).join('');
}

function renderMiniApprovals() {
    // This is already being handled partially by updateUI calling stat-pending
}

function renderEmpire() {
    const container = document.getElementById('empire-business-container');
    if (!container) return;

    if (STATE.businesses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-city"></i>
                <p>The empire is currently dormant. Launch a venture to expand.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = STATE.businesses.map(b => `
        <div class="business-card">
            <div class="card-top">
                <div>
                    <div class="biz-name">${b.name}</div>
                    <div class="biz-type">${b.industry}</div>
                </div>
                <div class="status-badge status-${b.status}">${b.status}</div>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${b.progress}%"></div>
                </div>
            </div>
            <div class="mt-20">
                <p style="font-size: 0.85rem; color: var(--text-secondary)"><strong>Last Action:</strong> ${b.last_action || 'Awaiting autonomous pulse...'}</p>
                <div class="btn-group mt-10">
                    <button class="btn-text" onclick="showVentureDetails('${b.id}')">Details</button>
                    <button class="btn-text" onclick="rebalanceVenture('${b.id}')">Optimize</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAnalytics() {
    const revenueCtx = document.getElementById('revenue-growth-chart');
    if (!revenueCtx) return;

    // Destroy existing chart if it exists to prevent memory leaks
    if (window.revenueChart) window.revenueChart.destroy();

    // Generate more realistic data based on actual business data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = months.map((month, index) => {
        const baseRevenue = STATE.businesses.length * 1000;
        const growth = Math.sin(index / 3) * 2000 + Math.random() * 1000;
        return Math.max(0, baseRevenue + growth);
    });

    window.revenueChart = new Chart(revenueCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Revenue ($)',
                data: revenueData,
                borderColor: '#833ab4',
                backgroundColor: 'rgba(131, 58, 180, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#833ab4',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function (context) {
                            return `Revenue: $${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    border: { display: false },
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    border: { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    const automationCtx = document.getElementById('automation-chart');
    if (automationCtx) {
        if (window.automationChart) window.automationChart.destroy();
        // Calculate automation levels based on actual data
        const totalLogs = STATE.logs.length;
        const errorLogs = STATE.logs.filter(l => l.type === 'error').length;
        const successLogs = STATE.logs.filter(l => l.type === 'success' || l.type === 'milestone').length;
        const pendingApprovals = STATE.approvals.length;

        const fullyAutomated = Math.max(0, totalLogs - errorLogs - pendingApprovals);
        const semiAutomated = pendingApprovals;
        const manualRequired = errorLogs;

        window.automationChart = new Chart(automationCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Fully Automated', 'Semi-Autonomous', 'Manual Required'],
                datasets: [{
                    data: [fullyAutomated, semiAutomated, manualRequired],
                    backgroundColor: ['#00ff88', '#5851db', '#ff4d4d'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0a0b8',
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                    }
                },
                cutout: '70%'
            }
        });
    }
}

function renderBusinessPerformanceChart() {
    const perfContainer = document.querySelector('.grid-layout');
    if (!perfContainer) return;

    // Create new chart container if it doesn't exist
    let perfChartContainer = document.getElementById('performance-chart-container');
    if (!perfChartContainer) {
        perfChartContainer = document.createElement('div');
        perfChartContainer.id = 'performance-chart-container';
        perfChartContainer.className = 'grid-span-6';
        perfChartContainer.innerHTML = `
            <div class="content-panel">
                <h3>Business Performance</h3>
                <canvas id="business-performance-chart" height="300"></canvas>
            </div>
        `;
        perfContainer.appendChild(perfChartContainer);
    }

    const perfCtx = document.getElementById('business-performance-chart');
    if (!perfCtx) return;

    if (window.performanceChart) window.performanceChart.destroy();

    // Prepare data for business performance
    const businessData = STATE.businesses.map(b => ({
        name: b.name || 'Unknown',
        progress: b.progress || 0,
        status: b.status || 'unknown'
    }));

    window.performanceChart = new Chart(perfCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: businessData.map(b => b.name.substring(0, 15) + (b.name.length > 15 ? '...' : '')),
            datasets: [{
                label: 'Progress (%)',
                data: businessData.map(b => b.progress),
                backgroundColor: businessData.map(b => {
                    switch (b.status) {
                        case 'running': return '#00ff88';
                        case 'paused': return '#ffcc00';
                        case 'stopped': return '#ff4d4d';
                        default: return '#5851db';
                    }
                }),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        title: function (context) {
                            return businessData[context[0].dataIndex].name;
                        },
                        label: function (context) {
                            const business = businessData[context.dataIndex];
                            return [
                                `Progress: ${business.progress}%`,
                                `Status: ${business.status}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    border: { display: false },
                    ticks: { color: '#a0a0b8' }
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        color: '#a0a0b8',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function renderSettings() {
    // Placeholder to satisfy the refresh logic
    console.log("Settings view activated");
}

async function handleApproval(id, decision) {
    const notes = prompt(decision ? "Additional authorization notes?" : "Reason for rejection?");
    if (notes === null) return; // Cancelled

    showToast(decision ? "Authorizing action..." : "Rejecting action...", 'info');

    try {
        const endpoint = decision ? '/api/approve' : '/api/reject';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, notes, reason: notes })
        });

        if (res.ok) {
            showToast(decision ? "✅ Action Authorized" : "❌ Action Rejected", 'success');
            fetchData();
        }
    } catch (e) {
        showToast("Communication link failed", 'error');
    }
}

function renderFullApprovals() {
    const container = document.getElementById('full-approval-container');
    if (!container) return;

    if (STATE.approvals.length === 0) {
        container.innerHTML = '<div class="empty-state">All systems GO. No approvals pending.</div>';
        return;
    }

    container.innerHTML = STATE.approvals.map(a => `
        <div class="approval-card panel">
            <div class="approval-info">
                <h3>${a.title}</h3>
                <p>${a.description}</p>
                <div class="risk-badge risk-${a.risk || 'medium'}">${a.risk || 'MEDIUM'} RISK</div>
            </div>
            <div class="approval-actions">
                <button class="btn btn-secondary" onclick="handleApproval('${a.id}', false)">Reject</button>
                <button class="btn btn-primary" onclick="handleApproval('${a.id}', true)">Authorize</button>
            </div>
        </div>
    `).join('');
}

// --- CEO Command Center ---
function initCommandCenter() {
    const input = document.getElementById('ceo-command');
    const btn = document.getElementById('send-command-btn');

    const sendCommand = async () => {
        const cmd = input.value.trim();
        if (!cmd) return;

        addChatMessage('user', cmd);
        input.value = '';

        try {
            document.getElementById('ceo-status').textContent = 'THINKING...';
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            const data = await res.json();

            setTimeout(() => {
                const replyText = data.reply || "Command received. Adjusting autonomous vectors.";
                addChatMessage('ceo', replyText, false, data.thoughts);
                document.getElementById('ceo-status').textContent = 'IDLE';
                // Thoughts are now inside chat, so we can clear the static box if we prefer, or keep it as "Latest Focus"
                if (data.thoughts) document.getElementById('ceo-thoughts').textContent = "Refining execution parameters...";
            }, 1000);

        } catch (e) {
            addChatMessage('ceo', "Error connecting to neural uplink. Re-attempting connection.");
        }
    };

    btn.addEventListener('click', sendCommand);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendCommand(); });
}

function initFullCommandCenter() {
    const input = document.getElementById('ceo-full-command');
    const btn = document.getElementById('send-full-command-btn');
    if (!input || !btn) return;

    const sendCommand = async () => {
        const cmd = input.value.trim();
        if (!cmd) return;

        addChatMessage('user', cmd, true);
        input.value = '';

        try {
            document.getElementById('ceo-full-status').textContent = 'THINKING...';
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            const data = await res.json();

            setTimeout(() => {
                addChatMessage('ceo', data.reply || "Strategy recalibrated.", true);
                document.getElementById('ceo-full-status').textContent = 'CONNECTED';
                if (data.activeObjective) document.getElementById('ceo-active-objective').textContent = data.activeObjective;
            }, 800);

        } catch (e) {
            addChatMessage('ceo', "Uplink unstable. Check firewall settings.", true);
        }
    };

    btn.addEventListener('click', sendCommand);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendCommand(); });
}

// function initThemeToggle() ... Removed
// function toggleTheme() ... Removed

function addChatMessage(role, text, isFull = false, thoughts = null) {
    const containerId = isFull ? 'full-chat-container' : 'chat-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;

    let contentHtml = `<div class="msg-bubble">${text}</div>`;

    // Add Thinking Toggle if thoughts exist
    if (thoughts && role === 'ceo') {
        const thoughtId = `thought-${Date.now()}`;
        contentHtml += `
            <button class="btn-text" style="font-size: 0.75rem; color: var(--primary); margin-top: 5px; opacity: 0.8;" onclick="const t=document.getElementById('${thoughtId}'); t.style.display = t.style.display === 'none' ? 'block' : 'none';">
                💭 See Thinking
            </button>
            <div id="${thoughtId}" style="display: none; margin-top: 8px; padding: 10px; background: rgba(0,0,0,0.3); border-left: 2px solid var(--primary); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #a0a0b8; border-radius: 4px;">
                ${thoughts}
            </div>
        `;
    }

    contentHtml += `<div class="msg-time">${new Date().toLocaleTimeString()}</div>`;
    msg.innerHTML = contentHtml;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// --- Modals ---
function initModals() {
    const modal = document.getElementById('new-business-modal');
    const businessDetailModal = document.getElementById('business-detail-modal');
    const openBtn = document.getElementById('new-business-btn');
    const closeBtns = document.querySelectorAll('.close-modal');
    const confirmBtn = document.getElementById('confirm-launch-btn');
    const optimizeBtn = document.getElementById('optimize-business-btn');

    openBtn.onclick = () => modal.classList.remove('hidden');
    closeBtns.forEach(b => b.onclick = () => {
        modal.classList.add('hidden');
        businessDetailModal.classList.add('hidden');
    });

    confirmBtn.onclick = async () => {
        const idea = document.getElementById('new-business-idea').value;
        if (!idea) return;

        showToast('🚀 Launching new venture...', 'info');
        modal.classList.add('hidden');

        try {
            const res = await fetch('/api/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea })
            });
            if (res.ok) {
                showToast('✅ Venture initialized successfully!', 'success');
                fetchData();
            }
        } catch (e) {
            showToast('❌ Launch sequence failed.', 'error');
        }
    };

    optimizeBtn.onclick = () => {
        showToast('🎯 Optimization commands sent to CEO', 'info');
        businessDetailModal.classList.add('hidden');
    };
}

// --- Business Details ---
function showBusinessDetails(index) {
    const businesses = STATE.searchQuery ? STATE.filteredBusinesses : STATE.businesses;
    const business = businesses[index];
    if (!business) return;

    const modal = document.getElementById('business-detail-modal');

    // Populate basic info
    document.getElementById('business-detail-title').textContent = business.name || 'Business Details';
    document.getElementById('detail-name').textContent = business.name || 'Unknown';
    document.getElementById('detail-industry').textContent = business.industry || 'Unknown';
    document.getElementById('detail-status').textContent = business.status || 'Unknown';
    document.getElementById('detail-status').className = `status-badge status-${business.status}`;
    document.getElementById('detail-progress').textContent = `${business.progress || 0}%`;
    document.getElementById('detail-phase').textContent = business.current_phase || 'Phase 1';
    document.getElementById('detail-progress-bar').style.width = `${business.progress || 0}%`;
    document.getElementById('detail-description').textContent = business.last_action || 'No recent activity';

    // Mock financial data (in a real app, this would come from the business object)
    document.getElementById('detail-revenue').textContent = `$${(business.progress * 1000) || 0}`;
    document.getElementById('detail-profit').textContent = `$${(business.progress * 500) || 0}`;
    document.getElementById('detail-customers').textContent = Math.floor((business.progress / 10) || 0);

    // Generate activity timeline
    const activityContainer = document.getElementById('detail-activity');
    const activities = generateBusinessActivity(business);
    activityContainer.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${activity.time}</div>
                <div class="activity-description">${activity.description}</div>
            </div>
        </div>
    `).join('');

    modal.classList.remove('hidden');
}

function generateBusinessActivity(business) {
    // Mock activity data based on business progress
    const activities = [
        {
            icon: 'fa-rocket',
            title: 'Business Launched',
            time: '2 weeks ago',
            description: 'Initial setup and market research completed'
        },
        {
            icon: 'fa-users',
            title: 'First Customers Acquired',
            time: '1 week ago',
            description: 'Customer acquisition campaigns showing positive results'
        },
        {
            icon: 'fa-chart-line',
            title: 'Revenue Milestone',
            time: '3 days ago',
            description: 'First revenue generated from operations'
        },
        {
            icon: 'fa-cogs',
            title: 'System Optimization',
            time: '1 day ago',
            description: 'Automated processes refined for better efficiency'
        }
    ];

    // Return activities based on progress
    const progress = business.progress || 0;
    return activities.slice(0, Math.ceil(progress / 25));
}

// --- Search Functionality ---
function initSearch() {
    const searchInput = document.querySelector('.search-wrapper input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        STATE.searchQuery = e.target.value.toLowerCase();
        applySearchFilter();
    });
}

function applySearchFilter() {
    if (!STATE.searchQuery) {
        STATE.filteredBusinesses = STATE.businesses;
        STATE.filteredLogs = STATE.logs;
    } else {
        STATE.filteredBusinesses = STATE.businesses.filter(b =>
            b.name?.toLowerCase().includes(STATE.searchQuery) ||
            b.industry?.toLowerCase().includes(STATE.searchQuery) ||
            b.status?.toLowerCase().includes(STATE.searchQuery)
        );

        STATE.filteredLogs = STATE.logs.filter(l =>
            l.message?.toLowerCase().includes(STATE.searchQuery) ||
            l.type?.toLowerCase().includes(STATE.searchQuery)
        );
    }

    // Re-render current view with filtered data
    renderBusinesses();
    renderLogs();
}

// --- Connection Monitoring ---
function monitorConnection() {
    // Monitor online/offline events
    window.addEventListener('online', () => {
        STATE.connectionStatus = 'connecting';
        updateConnectionStatus();
        fetchData(); // Immediate retry
    });

    window.addEventListener('offline', () => {
        STATE.connectionStatus = 'offline';
        updateConnectionStatus();
        showToast('📴 You are offline', 'error');
    });

    // Periodic connectivity check
    setInterval(async () => {
        if (navigator.onLine && STATE.connectionStatus === 'offline') {
            // Try to reconnect
            await fetchData();
        }
    }, 30000); // Check every 30 seconds
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    statusElement.className = `connection-status ${STATE.connectionStatus}`;
    const statusText = statusElement.querySelector('span');

    switch (STATE.connectionStatus) {
        case 'online':
            statusText.textContent = 'Connected';
            break;
        case 'connecting':
            statusText.textContent = 'Connecting...';
            break;
        case 'offline':
            statusText.textContent = 'Offline';
            break;
    }
}

// --- Theme Toggle ---
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Load saved theme preference
    const savedTheme = localStorage.getItem('king-ai-theme') || 'dark';
    document.body.className = `${savedTheme}-theme`;
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.body.className = `${newTheme}-theme`;
        localStorage.setItem('king-ai-theme', newTheme);
        updateThemeIcon(newTheme);

        showToast(`Switched to ${newTheme} theme`, 'info');
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// --- Notifications ---
function initNotifications() {
    const notificationBtn = document.getElementById('notification-btn');
    const dropdown = document.getElementById('notification-dropdown');

    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');

        // Close dropdown when clicking outside
        const closeDropdown = (event) => {
            if (!dropdown.contains(event.target) && !notificationBtn.contains(event.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
            }
        };

        if (!dropdown.classList.contains('hidden')) {
            document.addEventListener('click', closeDropdown);
        }
    });

    // Generate some initial notifications
    generateInitialNotifications();
    updateNotificationBadge();
}

function generateInitialNotifications() {
    const notifications = [
        {
            id: 'welcome',
            type: 'info',
            title: 'Welcome to King AI Studio',
            message: 'Your autonomous business empire is now active and growing.',
            time: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            read: false,
            icon: 'fa-crown'
        },
        {
            id: 'first-business',
            type: 'success',
            title: 'First Business Milestone',
            message: 'Your first automated business has reached 25% completion.',
            time: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
            read: false,
            icon: 'fa-rocket'
        }
    ];

    STATE.notifications = notifications;
}

function addNotification(type, title, message, icon = 'fa-info-circle') {
    const notification = {
        id: Date.now().toString(),
        type,
        title,
        message,
        time: new Date(),
        read: false,
        icon
    };

    STATE.notifications.unshift(notification);
    updateNotificationBadge();
    renderNotifications();

    // Auto-hide dropdown after 5 seconds if it's visible
    setTimeout(() => {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown.classList.contains('hidden')) {
            setTimeout(() => dropdown.classList.add('hidden'), 2000);
        }
    }, 3000);
}

function updateNotificationBadge() {
    const unreadCount = STATE.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) return;

    container.innerHTML = STATE.notifications.slice(0, 10).map(notification => `
        <div class="notification-item ${!notification.read ? 'unread' : ''}" onclick="markNotificationRead('${notification.id}')">
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${notification.icon}"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${formatTimeAgo(notification.time)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function markNotificationRead(id) {
    const notification = STATE.notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
    }
}

function markAllNotificationsRead() {
    STATE.notifications.forEach(n => n.read = true);
    updateNotificationBadge();
    renderNotifications();
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// --- Help Modal ---
function initHelpModal() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeBtn = helpModal?.querySelector('.close-modal');
    const tourBtn = document.getElementById('start-tour-btn');

    if (!helpBtn || !helpModal) return;

    helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            helpModal.classList.add('hidden');
        });
    }

    if (tourBtn) {
        tourBtn.addEventListener('click', () => {
            helpModal.classList.add('hidden');
            if (window.startGuidedTour) {
                window.startGuidedTour();
            }
        });
    }

    // Close on outside click
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    });
}

// --- Keyboard Shortcuts ---
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;

        // Tab switching shortcuts (1-5)
        if (!ctrl && !e.altKey && !e.shiftKey && key >= '1' && key <= '5') {
            e.preventDefault();
            const tabs = ['dashboard', 'empire', 'approvals', 'ceo', 'analytics'];
            const tabIndex = parseInt(key) - 1;
            if (tabs[tabIndex]) {
                switchTab(tabs[tabIndex]);
                showToast(`Switched to ${tabs[tabIndex]} tab`, 'info');
            }
        }

        // Ctrl+K: Focus search
        if (ctrl && key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-wrapper input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
                showToast('Search focused', 'info');
            }
        }

        // Ctrl+/: Show help
        if (ctrl && key === '/') {
            e.preventDefault();
            const helpModal = document.getElementById('help-modal');
            if (helpModal) {
                helpModal.classList.remove('hidden');
            }
        }

        // Ctrl+N: New business
        if (ctrl && key === 'n') {
            e.preventDefault();
            const newBusinessModal = document.getElementById('new-business-modal');
            if (newBusinessModal) {
                newBusinessModal.classList.remove('hidden');
                const input = document.getElementById('new-business-idea');
                if (input) {
                    input.focus();
                }
                showToast('New business modal opened', 'info');
            }
        }

        // Ctrl+E: Export data
        if (ctrl && key === 'e') {
            e.preventDefault();
            exportToCSV(`king-ai-export-${new Date().toISOString().split('T')[0]}`);
        }

        // Escape: Close modals
        if (key === 'escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            modals.forEach(modal => modal.classList.add('hidden'));
        }

        // Ctrl+T: Toggle theme
        if (ctrl && key === 't') {
            e.preventDefault();
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.click();
            }
        }

        // Ctrl+R: Refresh data
        if (ctrl && key === 'r') {
            e.preventDefault();
            fetchData();
            showToast('Refreshing data...', 'info');
        }
    });
}

// --- Guided Tour ---
function initGuidedTour() {
    const tourSteps = [
        {
            title: 'Welcome to King AI Studio',
            description: 'Your autonomous business empire dashboard. Let\'s take a quick tour.',
            target: '.nav-item[data-tab="dashboard"]',
            position: 'bottom'
        },
        {
            title: 'Business Empire Overview',
            description: 'Monitor all your automated businesses from this central hub.',
            target: '.business-grid',
            position: 'top'
        },
        {
            title: 'Real-time Analytics',
            description: 'Track performance metrics and growth trends across your empire.',
            target: '.analytics-section',
            position: 'left'
        },
        {
            title: 'CEO Command Center',
            description: 'Direct your AI CEO to optimize and expand your businesses.',
            target: '.nav-item[data-tab="ceo"]',
            position: 'bottom'
        },
        {
            title: 'Ready to Scale',
            description: 'Your AI empire is growing. Use the tools above to accelerate expansion.',
            target: '.command-center',
            position: 'top'
        }
    ];

    let currentStep = 0;
    let tourActive = false;

    // Check if user has seen tour before
    const tourSeen = localStorage.getItem('king-ai-tour-seen');
    if (!tourSeen) {
        // Auto-start tour for new users after a delay
        setTimeout(() => startTour(), 2000);
    }

    function startTour() {
        if (tourActive) return;
        tourActive = true;
        currentStep = 0;
        showTourStep();
    }

    function showTourStep() {
        const step = tourSteps[currentStep];
        const overlay = document.getElementById('tour-overlay');
        const tooltip = document.getElementById('tour-tooltip');
        const title = document.getElementById('tour-title');
        const description = document.getElementById('tour-description');
        const stepIndicator = document.getElementById('tour-step');
        const arrow = document.getElementById('tour-arrow');

        title.textContent = step.title;
        description.textContent = step.description;
        stepIndicator.textContent = `${currentStep + 1} / ${tourSteps.length}`;

        // Position tooltip
        const target = document.querySelector(step.target);
        if (target) {
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let top, left;

            switch (step.position) {
                case 'top':
                    top = rect.top - tooltipRect.height - 10;
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    arrow.style.transform = 'rotate(180deg)';
                    break;
                case 'bottom':
                    top = rect.bottom + 10;
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    arrow.style.transform = 'rotate(0deg)';
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    left = rect.left - tooltipRect.width - 10;
                    arrow.style.transform = 'rotate(90deg)';
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    left = rect.right + 10;
                    arrow.style.transform = 'rotate(-90deg)';
                    break;
            }

            tooltip.style.top = `${Math.max(10, Math.min(window.innerHeight - tooltipRect.height - 10, top))}px`;
            tooltip.style.left = `${Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, left))}px`;
        }

        overlay.classList.remove('hidden');
    }

    function nextStep() {
        currentStep++;
        if (currentStep >= tourSteps.length) {
            endTour();
        } else {
            showTourStep();
        }
    }

    function prevStep() {
        currentStep--;
        if (currentStep < 0) {
            currentStep = 0;
        }
        showTourStep();
    }

    function endTour() {
        tourActive = false;
        document.getElementById('tour-overlay').classList.add('hidden');
        localStorage.setItem('king-ai-tour-seen', 'true');
        showToast('Tour completed! Welcome to your AI empire.', 'success');
    }

    // Tour navigation
    document.getElementById('tour-next').addEventListener('click', nextStep);
    document.getElementById('tour-prev').addEventListener('click', prevStep);
    document.getElementById('tour-skip').addEventListener('click', endTour);

    // Make tour available via help menu
    window.startGuidedTour = startTour;
}

function exportToCSV(filename) {
    // Prepare CSV data
    let csvContent = 'Business Name,Industry,Status,Progress,Last Action\n';

    STATE.businesses.forEach(business => {
        const row = [
            `"${business.name || 'Unknown'}"`,
            `"${business.industry || 'Unknown'}"`,
            `"${business.status || 'Unknown'}"`,
            `"${business.progress || 0}%"`,
            `"${business.last_action || 'No activity'}"`
        ].join(',');
        csvContent += row + '\n';
    });

    // Add logs section
    csvContent += '\n\nLog Entries\n';
    csvContent += 'Timestamp,Type,Message\n';

    STATE.logs.slice(0, 100).forEach(log => {
        const row = [
            `"${log.timestamp || new Date().toISOString()}"`,
            `"${log.type || 'info'}"`,
            `"${log.message || ''}"`
        ].join(',');
        csvContent += row + '\n';
    });

    // Download CSV
    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

function exportToJSON(filename) {
    const exportData = {
        exportDate: new Date().toISOString(),
        summary: {
            totalBusinesses: STATE.businesses.length,
            activeBusinesses: STATE.businesses.filter(b => b.status === 'running').length,
            totalProfit: STATE.totalProfit,
            pendingApprovals: STATE.approvals.length,
            totalLogs: STATE.logs.length
        },
        businesses: STATE.businesses,
        approvals: STATE.approvals,
        logs: STATE.logs.slice(0, 500) // Limit logs for file size
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    showToast(`📁 Exported data to ${filename}`, 'success');
}

// --- Helpers ---
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast visible ${type}`;
    setTimeout(() => toast.className = 'toast hidden', 3000);

    // Add notification for important events
    if (type === 'error' || type === 'warning' || (type === 'success' && msg.includes('successfully'))) {
        let icon = 'fa-info-circle';
        let title = 'System Notification';
        if (type === 'success') {
            icon = 'fa-check-circle';
            title = 'Success';
        }
        if (type === 'error') {
            icon = 'fa-exclamation-triangle';
            title = 'Error';
        }
        if (type === 'warning') {
            icon = 'fa-exclamation-circle';
            title = 'Warning';
        }

        addNotification(type, title, msg, icon);
    }
}
