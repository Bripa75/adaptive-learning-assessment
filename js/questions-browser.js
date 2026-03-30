/* ═══════════════════════════════════════════
   RIPA ELEVATE — QUESTIONS BROWSER JS
   Powers the public question bank page.
   Loads questions.json, filters by category
   and level, renders preview cards.
═══════════════════════════════════════════ */

const QuestionsBrowser = {

  data: null,
  activeCategory: 'all',
  activeLevel: 'all',

  // ── Load questions data ──────────────────
  async load() {
    try {
      const res   = await fetch('/data/questions.json');
      this.data   = await res.json();
      this.buildCategoryButtons();
      this.render();
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  },

  // ── Build category filter buttons ────────
  buildCategoryButtons() {
    const container = document.getElementById('qb-categories');
    if (!container || !this.data) return;

    const cats = Object.keys(this.data.categories);
    const icons = { math:'📐', reading:'📖', money:'💰', social:'🤝', safety:'⚠️', time:'⏱️', decision:'🧠' };

    const allBtn = document.createElement('button');
    allBtn.className = 'qb-cat-btn active';
    allBtn.dataset.cat = 'all';
    allBtn.textContent = 'All Categories';
    allBtn.onclick = () => this.setCategory('all');
    container.appendChild(allBtn);

    cats.forEach(cat => {
      const meta = this.data.categories[cat];
      const btn  = document.createElement('button');
      btn.className    = 'qb-cat-btn';
      btn.dataset.cat  = cat;
      btn.textContent  = `${icons[cat] || ''} ${meta.label}`;
      btn.onclick = () => this.setCategory(cat);
      container.appendChild(btn);
    });
  },

  // ── Category filter ───────────────────────
  setCategory(cat) {
    this.activeCategory = cat;
    document.querySelectorAll('.qb-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    this.render();
  },

  // ── Level filter ──────────────────────────
  setLevel(level) {
    this.activeLevel = level;
    document.querySelectorAll('.qb-lvl-btn').forEach(b => b.classList.toggle('active', b.dataset.lvl === level));
    this.render();
  },

  // ── Render question preview cards ─────────
  render() {
    const container = document.getElementById('qb-grid');
    if (!container || !this.data) return;

    const levelLabels = { '1':'L1 · Supported', '2':'L2 · Developing', '3':'L3 · Independent', '4':'L4 · Advanced' };
    const catColors   = { math:'chip-amb', reading:'chip-teal', money:'chip-sage', social:'chip-rose', safety:'chip-dark', time:'chip-amb', decision:'chip-teal' };
    const icons       = { math:'📐', reading:'📖', money:'💰', social:'🤝', safety:'⚠️', time:'⏱️', decision:'🧠' };

    const cats = this.activeCategory === 'all'
      ? Object.keys(this.data.categories)
      : [this.activeCategory];

    const levels = this.activeLevel === 'all' ? ['1','2','3','4'] : [this.activeLevel];

    const cards = [];
    cats.forEach(cat => {
      const catData = this.data.categories[cat];
      levels.forEach(lvl => {
        const qs = catData?.levels?.[lvl] || [];
        // Show max 3 per category/level combo
        qs.slice(0, 3).forEach(q => {
          cards.push({ cat, catLabel: catData.label, lvl, q, icon: icons[cat] || '' });
        });
      });
    });

    if (cards.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📋</div><h3>No questions found</h3><p>Try a different filter.</p></div>`;
      return;
    }

    // Update count
    const countEl = document.getElementById('qb-count');
    if (countEl) {
      const totalFull = cats.reduce((sum, cat) => {
        return sum + levels.reduce((s, lvl) => s + (this.data.categories[cat]?.levels?.[lvl]?.length || 0), 0);
      }, 0);
      countEl.textContent = `Showing previews from ${totalFull} questions`;
    }

    container.innerHTML = cards.map(({ cat, catLabel, lvl, q, icon }) => `
      <div class="qb-card">
        <div class="qb-card-meta">
          <span class="chip ${catColors[cat] || 'chip-dark'}">${icon} ${catLabel}</span>
          <span class="chip chip-dark">${levelLabels[lvl]}</span>
        </div>
        <p class="qb-question">${q.q}</p>
        <div class="qb-opts">
          ${q.opts.map((opt, i) => `
            <div class="qb-opt ${i === q.ans ? 'correct' : ''}">
              <span class="qb-letter">${String.fromCharCode(65+i)}</span>
              ${opt}
              ${i === q.ans ? '<span class="qb-correct-mark">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
        ${q.hint ? `<div class="qb-hint"><span>💡</span> ${q.hint}</div>` : ''}
      </div>
    `).join('');
  }
};

window.QuestionsBrowser = QuestionsBrowser;
