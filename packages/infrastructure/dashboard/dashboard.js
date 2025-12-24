/**
 * 👑 King AI Dashboard - Core Intelligence
 */

const STATE = {
    businesses: [],
    approvals: [],
    logs: [],
    totalProfit: 0,
    currentTab: 'dashboard',
    lastSync: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initCommandCenter();
    startSync();
    setupCharts();
});

// --- Navigation & Routing ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
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
}

// --- Data Synchronization ---
async function startSync() {
    await fetchData();
    setInterval(fetchData, 5000);
}

async function fetchData() {
    try {
        const response = await fetch('/api/all-data');
        if (!response.ok) throw new Error('API unreachable');
        const data = await response.json();

        STATE.businesses = data.businesses || [];
        STATE.approvals = data.approvals || [];
        STATE.logs = data.logs || [];
        STATE.totalProfit = data.totalProfit || 0;
        STATE.lastSync = new Date();

        updateUI();
    } catch (error) {
        console.error('Core sync failed:', error);
        showToast('Connection unstable. Retrying...', 'warning');
    }
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

// --- Renderers ---
function renderBusinesses() {
    const container = document.getElementById('business-container');
    if (!container) return;

    if (STATE.businesses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ghost"></i>
                <p>No active ventures yet. Launch your first project!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = STATE.businesses.map(b => `
        <div class="business-card">
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

    container.innerHTML = STATE.logs.slice(0, 50).map(l => `
        <div class="log-entry ${l.type || 'info'}">
            <span class="log-time">${new Date(l.timestamp).toLocaleTimeString()}</span>
            <span class="log-msg">${l.message}</span>
        </div>
    `).join('');
}

function renderMiniApprovals() {
    // This could be a sidebar widget or part of the dashboard
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
                addChatMessage('ceo', data.reply || "Command received. Adjusting autonomous vectors.");
                document.getElementById('ceo-status').textContent = 'IDLE';
                if (data.thoughts) document.getElementById('ceo-thoughts').textContent = data.thoughts;
            }, 1000);

        } catch (e) {
            addChatMessage('ceo', "Error connecting to neural uplink. Re-attempting connection.");
        }
    };

    btn.addEventListener('click', sendCommand);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendCommand(); });
}

function addChatMessage(role, text) {
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.innerHTML = `
        <div class="msg-bubble">${text}</div>
        <div class="msg-time">${new Date().toLocaleTimeString()}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// --- Modals ---
function initModals() {
    const modal = document.getElementById('new-business-modal');
    const openBtn = document.getElementById('new-business-btn');
    const closeBtns = document.querySelectorAll('.close-modal');
    const confirmBtn = document.getElementById('confirm-launch-btn');

    openBtn.onclick = () => modal.classList.remove('hidden');
    closeBtns.forEach(b => b.onclick = () => modal.classList.add('hidden'));

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
}

// --- Visualization ---
function setupCharts() {
    const ctx = document.getElementById('roi-sparkline').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: [1, 2, 3, 4, 5, 6, 7],
            datasets: [{
                data: [12, 19, 3, 5, 2, 3, 9],
                borderColor: '#833ab4',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

// --- Helpers ---
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast visible ${type}`;
    setTimeout(() => toast.className = 'toast hidden', 3000);
}
