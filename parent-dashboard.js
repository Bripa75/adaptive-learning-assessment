/* ═══════════════════════════════════════════
   RIPA ELEVATE — PARENT DASHBOARD JS
═══════════════════════════════════════════ */

const CATEGORIES = {
  math:     { label: 'Mathematics',        icon: '📐', color: 'var(--teal)' },
  reading:  { label: 'Reading',            icon: '📖', color: 'var(--sage)' },
  money:    { label: 'Financial Literacy', icon: '💰', color: 'var(--amb)'  },
  social:   { label: 'Social Reasoning',   icon: '🤝', color: 'var(--teal)' },
  safety:   { label: 'Safety Awareness',   icon: '⚠️', color: 'var(--rose)' },
  time:     { label: 'Time & Planning',    icon: '⏱️', color: 'var(--sage)' },
  decision: { label: 'Decision-Making',    icon: '🧠', color: 'var(--s700)' }
};

const LEVEL_LABELS = { 1: 'Supported', 2: 'Developing', 3: 'Independent', 4: 'Advanced' };
const LEVEL_COLORS = { 1: 'var(--amb)', 2: 'var(--teal)', 3: 'var(--sage)', 4: 'var(--s900)' };

const ParentDashboard = {

  user: null,
  children: [],
  resultsByChild: {},

  async init() {
    this.user = AuthManager.currentUser;

    // Update welcome message
    const name = AuthManager.getDisplayName();
    const welcomeEl = document.getElementById('welcome-msg');
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${name}`;

    // Update nav avatar
    const avatar = document.getElementById('nav-avatar');
    if (avatar && AuthManager.currentProfile) {
      const p = AuthManager.currentProfile;
      avatar.textContent = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || 'P';
    }

    await this.loadChildren();
  },

  async loadChildren() {
    const loading  = document.getElementById('loading-state');
    const grid     = document.getElementById('children-grid');
    const empty    = document.getElementById('empty-children');

    const { data: children, error } = await RE.Children.getByParent(this.user.id);

    loading.classList.add('hidden');

    if (error || !children || children.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    this.children = children;

    // Load results for each child
    for (const child of children) {
      const { data: results } = await RE.Results.getByChild(child.id);
      this.resultsByChild[child.id] = results || [];
    }

    grid.classList.remove('hidden');
    grid.innerHTML = children.map(c => this.renderChildCard(c)).join('');
  },

  renderChildCard(child) {
    const results = this.resultsByChild[child.id] || [];
    const lastResult = results[0];

    // Build category status grid
    const catHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
      const result = results.find(r => r.category === key);
      if (result) {
        return `<div class="cat-pill cat-done" title="${cat.label}: Level ${result.level_reached} — ${LEVEL_LABELS[result.level_reached]}">
          ${cat.icon} <span>L${result.level_reached}</span>
        </div>`;
      }
      return `<div class="cat-pill cat-todo" onclick="ParentDashboard.startAssessment('${child.id}', '${key}')" title="Start ${cat.label}">
        ${cat.icon}
      </div>`;
    }).join('');

    const iepBadge = child.has_iep
      ? `<span class="chip chip-teal">IEP</span>`
      : '';

    return `
    <div class="child-card" id="child-${child.id}">
      <div class="child-card-header">
        <div class="child-avatar">${child.first_name[0]}${child.last_name[0]}</div>
        <div class="child-info">
          <div class="child-name">${child.first_name} ${child.last_name}</div>
          <div class="child-meta">
            ${child.grade_level ? `<span>${child.grade_level}</span>` : ''}
            ${iepBadge}
            ${results.length > 0 ? `<span class="chip chip-dark">${results.length} assessment${results.length !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        <div class="child-card-actions">
          ${results.length > 0 ? `<a href="report.html?child=${child.id}" class="btn btn-outline btn-sm">View Reports</a>` : ''}
        </div>
      </div>

      <div class="child-cats">
        <div class="child-cats-label">Categories</div>
        <div class="cat-pills">${catHTML}</div>
      </div>

      ${results.length === 0 ? `
      <div class="child-start-cta">
        <div class="csc-text">
          <strong>Ready to start?</strong>
          <span>Choose a category and difficulty level to begin the first assessment.</span>
        </div>
        <button class="btn btn-dark btn-sm" onclick="ParentDashboard.openCategoryPicker('${child.id}')">Start Assessment →</button>
      </div>
      ` : `
      <div class="child-start-cta">
        <div class="csc-text">
          <strong>Add another category</strong>
          <span>Tap any unstarted category above, or choose below.</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="ParentDashboard.openCategoryPicker('${child.id}')">+ New Category</button>
      </div>
      `}
    </div>`;
  },

  openCategoryPicker(childId) {
    window.location.href = `exam-start.html?child=${childId}`;
  },

  async startAssessment(childId, category) {
    // Check retake eligibility
    const { canRetake, daysLeft } = await RE.Assessments.canRetake(childId, category);

    if (!canRetake) {
      showToast(`This category was completed recently. Reassessment available in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`, 'warning', 5000);
      return;
    }

    window.location.href = `exam-start.html?child=${childId}&category=${category}`;
  }
};

// ── Add Child Modal ──────────────────────────

function openAddChild() {
  document.getElementById('add-child-modal').classList.add('open');
}

function closeAddChild() {
  document.getElementById('add-child-modal').classList.remove('open');
  document.getElementById('mc-first').value = '';
  document.getElementById('mc-last').value  = '';
  document.getElementById('mc-grade').value = '';
  document.getElementById('mc-iep').checked = false;
  document.getElementById('mc-notes').value = '';
  document.getElementById('modal-error').classList.add('hidden');
}

async function submitAddChild() {
  const first = document.getElementById('mc-first').value.trim();
  const last  = document.getElementById('mc-last').value.trim();
  const grade = document.getElementById('mc-grade').value;
  const hasIep = document.getElementById('mc-iep').checked;
  const notes  = document.getElementById('mc-notes').value.trim();
  const btn    = document.getElementById('btn-add-child');
  const errEl  = document.getElementById('modal-error');

  if (!first || !last) {
    errEl.textContent = 'First and last name are required.';
    errEl.classList.remove('hidden');
    return;
  }

  setButtonLoading(btn, true, 'Creating…');

  const { data, error } = await RE.Children.create(AuthManager.currentUser.id, {
    firstName: first, lastName: last, gradeLevel: grade, hasIep, notes
  });

  if (error) {
    setButtonLoading(btn, false);
    errEl.textContent = 'Something went wrong. Please try again.';
    errEl.classList.remove('hidden');
    return;
  }

  closeAddChild();
  showToast(`${first}'s profile created!`, 'success');

  // Reload children
  const grid = document.getElementById('children-grid');
  const empty = document.getElementById('empty-children');
  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  ParentDashboard.children.push(data);
  ParentDashboard.resultsByChild[data.id] = [];

  const newCard = document.createElement('div');
  newCard.innerHTML = ParentDashboard.renderChildCard(data);
  grid.appendChild(newCard.firstElementChild);

  setButtonLoading(btn, false);
}

window.ParentDashboard = ParentDashboard;
