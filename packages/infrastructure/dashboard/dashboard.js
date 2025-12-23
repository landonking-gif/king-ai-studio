/**
 * Dashboard Frontend Logic
 */

async function fetchData() {
    try {
        const response = await fetch('/api/all-data');
        const data = await response.json();

        updateStats(data);
        renderBusinesses(data.businesses);
        renderApprovals(data.approvals);
        renderLogs(data.logs);

    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
    }
}

function updateStats(data) {
    document.getElementById('stat-roi').textContent = `$${data.totalProfit || 0}`;
    document.getElementById('stat-active').textContent = data.businesses?.filter(b => b.status === 'running' || b.status === 'initializing').length || 0;
    document.getElementById('stat-tasks').textContent = data.logs?.length || 0;
    document.getElementById('stat-pending').textContent = data.approvals?.length || 0;
}

function renderBusinesses(businesses) {
    const container = document.getElementById('business-container');
    if (!businesses || businesses.length === 0) return;

    container.innerHTML = businesses.map(b => `
        <div class="business-card">
            <div class="card-header">
                <div>
                    <div class="business-name">${b.name || 'Unnamed Venture'}</div>
                    <div class="business-industry">${b.industry || 'General Business'}</div>
                </div>
                <span class="status-badge status-${b.status === 'running' ? 'running' : 'pending'}">${b.status}</span>
            </div>
            <div class="card-body">
                <div class="progress-container">
                    <div class="progress-label">
                        <span>${b.current_phase || 'Active'}</span>
                        <span>${b.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${b.progress || 0}%;"></div>
                    </div>
                </div>
                <div style="margin-top: 20px; font-size: 0.85rem; color: var(--text-dim);">
                    ${b.last_action || 'Initialized and awaiting next cycle.'}
                </div>
            </div>
        </div>
    `).join('');
}

function renderApprovals(approvals) {
    const container = document.getElementById('approval-container');
    if (!approvals || approvals.length === 0) {
        container.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">✅ All clear. No pending items.</div>';
        return;
    }

    container.innerHTML = approvals.map(a => `
        <div class="approval-item">
            <div class="approval-title">${a.title}</div>
            <div class="approval-desc">${a.description}</div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="respond('${a.task_id}', true)">Approve</button>
                <button class="btn btn-secondary" onclick="respond('${a.task_id}', false)">Reject</button>
            </div>
        </div>
    `).join('');
}

async function respond(taskId, approved) {
    const notes = prompt(approved ? 'Add optional approval notes:' : 'Explain the reason for rejection:');
    if (notes === null && !approved) return;

    try {
        const response = await fetch(approved ? '/api/approve' : '/api/reject', {
            method: 'POST',
            body: JSON.stringify({ id: taskId, notes, reason: notes })
        });
        if (response.ok) fetchData();
    } catch (err) {
        console.error('Action failed:', err);
    }
}

function renderLogs(logs) {
    const container = document.getElementById('log-container');
    if (!logs) return;

    container.innerHTML = logs.slice(0, 50).map(l => `
        <div class="log-entry ${l.type === 'error' ? 'warning' : l.type === 'milestone' ? 'success' : 'info'}">
            <span class="log-time">${new Date(l.timestamp).toLocaleTimeString()}</span>
            ${l.message}
        </div>
    `).join('');
}

// Initial fetch and poll
fetchData();
setInterval(fetchData, 5000);
