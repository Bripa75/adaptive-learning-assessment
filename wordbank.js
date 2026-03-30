/* ═══════════════════════════════════════════
   RIPA ELEVATE — WORD BANK JS
   Search, filter, and render the word bank.
═══════════════════════════════════════════ */

const WordBank = {

  allWords: [],
  filtered: [],
  activeCategory: 'all',
  searchQuery: '',

  // ── Load word bank data ──────────────────
  async load() {
    try {
      const res  = await fetch('/data/wordbank.json');
      const json = await res.json();
      this.allWords = json.words || [];
      this.filtered = [...this.allWords];
      this.render();
    } catch (err) {
      console.error('Failed to load word bank:', err);
    }
  },

  // ── Filter by category ───────────────────
  setCategory(cat) {
    this.activeCategory = cat;
    this.applyFilters();

    document.querySelectorAll('.wb-cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
  },

  // ── Search handler ────────────────────────
  onSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.applyFilters();
  },

  // ── Apply both filters ────────────────────
  applyFilters() {
    let words = [...this.allWords];

    if (this.activeCategory !== 'all') {
      words = words.filter(w => w.category === this.activeCategory);
    }

    if (this.searchQuery) {
      words = words.filter(w =>
        w.word.toLowerCase().includes(this.searchQuery) ||
        w.definition.toLowerCase().includes(this.searchQuery) ||
        (w.example && w.example.toLowerCase().includes(this.searchQuery))
      );
    }

    this.filtered = words;
    this.render();
    this.updateCount();
  },

  // ── Render word cards ─────────────────────
  render() {
    const container = document.getElementById('wordbank-grid');
    if (!container) return;

    if (this.filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <h3>No words found</h3>
          <p>Try a different search term or category.</p>
        </div>
      `;
      return;
    }

    const catColors = {
      math: 'chip-amb',
      reading: 'chip-teal',
      money: 'chip-sage',
      social: 'chip-rose',
      safety: 'chip-dark',
      time: 'chip-amb',
      decision: 'chip-teal',
      general: 'chip-dark'
    };

    container.innerHTML = this.filtered.map(w => `
      <div class="wb-card">
        <div class="wb-card-top">
          <span class="wb-word">${w.word}</span>
          <span class="chip ${catColors[w.category] || 'chip-dark'}">${w.category}</span>
        </div>
        <p class="wb-def">${w.definition}</p>
        ${w.example ? `<p class="wb-ex"><em>"${w.example}"</em></p>` : ''}
        <button class="wb-listen" onclick="WordBankSpeech.speak('${w.word.replace(/'/g, "\\'")}. ${w.definition.replace(/'/g, "\\'")}')">
          🔊 Listen
        </button>
      </div>
    `).join('');
  },

  // ── Update count display ─────────────────
  updateCount() {
    const el = document.getElementById('wb-count');
    if (el) el.textContent = `${this.filtered.length} word${this.filtered.length !== 1 ? 's' : ''}`;
  }
};

// Simple speech helper for word bank
const WordBankSpeech = {
  synth: window.speechSynthesis,
  speak(text) {
    if (this.synth.speaking) this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate  = 0.85;
    const voices = this.synth.getVoices();
    const pref   = voices.find(v => v.lang === 'en-US' && !v.name.includes('Compact'));
    if (pref) u.voice = pref;
    this.synth.speak(u);
  }
};

window.WordBank      = WordBank;
window.WordBankSpeech = WordBankSpeech;
