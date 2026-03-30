/* ═══════════════════════════════════════════
   RIPA ELEVATE — ADMIN JS
═══════════════════════════════════════════ */

const CAT_LABELS_A = {
  math:'Mathematics', reading:'Reading', money:'Financial Literacy',
  social:'Social Reasoning', safety:'Safety Awareness',
  time:'Time & Planning', decision:'Decision-Making'
};
const LEVEL_LABELS_A = {1:'Supported',2:'Developing',3:'Independent',4:'Advanced'};

const AdminDashboard = {

  async init() {
    const dateEl = document.getElementById('admin-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', {weekday:'long',year:'numeric',month:'long',day:'numeric'});

    const avatar = document.getElementById('nav-avatar');
    if (avatar && AuthManager.currentProfile) {
      const p = AuthManager.currentProfile;
      avatar.textContent = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || 'A';
    }

    await Promise.all([this.loadKPIs(), this.loadRecentActivity(), this.loadWeeklyChart(), this.loadLeadsPreview()]);
  },

  async loadKPIs() {
    const stats = await RE.Admin.getStats();
    const grid  = document.getElementById('kpi-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">Total Students</div><div class="kpi-value">${stats.totalStudents}</div><div class="kpi-sub">registered profiles</div></div>
      <div class="kpi-card"><div class="kpi-label">Assessments Done</div><div class="kpi-value">${stats.totalAssessments}</div><div class="kpi-sub">completed sessions</div></div>
      <div class="kpi-card"><div class="kpi-label">Leads / Inquiries</div><div class="kpi-value">${stats.totalLeads}</div><div class="kpi-sub">form submissions</div></div>
      <div class="kpi-card"><div class="kpi-label">Active Subscriptions</div><div class="kpi-value kpi-up">${stats.activeSubscriptions}</div><div class="kpi-sub">paying subscribers</div></div>`;
  },

  async loadRecentActivity() {
    const { data } = await RE.Admin.getRecentActivity(10);
    const el = document.getElementById('activity-table');
    if (!el) return;
    if (!data || data.length === 0) { el.innerHTML = '<div class="sm" style="color:var(--s400);padding:24px 0">No assessments yet.</div>'; return; }
    el.innerHTML = `<table class="mini-table"><thead><tr><th>Student</th><th>Category</th><th>Level</th><th>Score</th><th>Date</th></tr></thead><tbody>${data.map(a => {
      const child = a.children;
      const result = Array.isArray(a.results) ? a.results[0] : a.results;
      const name = child ? `${child.first_name} ${child.last_name}` : '—';
      return `<tr><td><strong>${name}</strong></td><td>${CAT_LABELS_A[a.category]||a.category}</td><td>${result ? `L${result.level_reached}` : '—'}</td><td>${result ? result.score_percent+'%' : '—'}</td><td>${a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td></tr>`;
    }).join('')}</tbody></table>`;
  },

  async loadWeeklyChart() {
    const { data } = await RE.Admin.getWeeklyData(8);
    const el = document.getElementById('weekly-chart');
    if (!el) return;
    if (!data || data.length === 0) { el.innerHTML = '<div class="sm" style="color:var(--s400);padding:20px 0">No data yet.</div>'; return; }
    const weeks = {};
    data.forEach(a => {
      const d = new Date(a.completed_at);
      const wk = `Wk ${Math.ceil(d.getDate()/7)}`;
      weeks[wk] = (weeks[wk]||0) + 1;
    });
    const entries = Object.entries(weeks).slice(-8);
    const max = Math.max(...entries.map(e => e[1]), 1);
    el.innerHTML = `<div class="bar-chart">${entries.map(([wk,count]) => `<div class="bar-col"><div class="bar-val">${count}</div><div class="bar" style="height:${Math.round((count/max)*80)}px"></div><div class="bar-label">${wk}</div></div>`).join('')}</div>`;
  },

  async loadLeadsPreview() {
    try {
      const { data } = await RE.Leads.getAll({ limit: 5 });
      const el = document.getElementById('leads-preview');
      if (!el) return;
      if (!data || data.length === 0) { el.innerHTML = '<div class="sm" style="color:var(--s400);padding:20px 0">No leads yet.</div>'; return; }
      el.innerHTML = data.map(lead => `<div class="lead-row"><div><div style="font-size:.86rem;font-weight:500;color:var(--s800)">${lead.name}</div><div style="font-size:.74rem;color:var(--s400)">${lead.email}</div></div><div class="chip chip-${lead.status==='new'?'amb':'sage'}">${lead.status}</div></div>`).join('');
    } catch(e) { console.log('Leads load skipped', e); }
  }
};

window.AdminDashboard = AdminDashboard;
