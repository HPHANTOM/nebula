/* ════════════════════════════════════════════════════════════
   StoryNebula — Universe Map Script (universe.js)
   ════════════════════════════════════════════════════════════ */

// ─── Theme ──────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('sn-theme') || 'dark';
if (savedTheme === 'light') document.body.classList.add('light');
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('sn-theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// ─── Genre Config ─────────────────────────────────────────────
const genreConfig = {
  Horror:   { color: '#f87171', emoji: '👁️', desc: 'Psychological dread, twists, and the dark unknown.' },
  'Sci-Fi': { color: '#38bdf8', emoji: '🚀', desc: 'Space, technology, and ideas that reshape the future.' },
  Fantasy:  { color: '#a78bfa', emoji: '🧙', desc: 'Magic, mythical creatures, and epic world-building.' },
  Mystery:  { color: '#fbbf24', emoji: '🔍', desc: 'Whodunits, clues, and satisfying reveals.' },
  Romance:  { color: '#f472b6', emoji: '💌', desc: 'Heartfelt love stories with emotional depth.' },
  Comedy:   { color: '#4ade80', emoji: '😂', desc: 'Absurd situations, wit, and comic timing.' },
};

// ─── Load Stats ───────────────────────────────────────────────
async function loadStats() {
  const grid = document.getElementById('universe-grid');
  const totalEl = document.getElementById('total-count');

  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    if (totalEl) totalEl.textContent = data.total;

    const maxCount = Math.max(...Object.values(data.genres), 1);

    grid.innerHTML = '';

    Object.entries(data.genres).forEach(([genre, count], i) => {
      const cfg = genreConfig[genre] || { color: '#a78bfa', emoji: '📖', desc: '' };
      const pct = Math.round((count / maxCount) * 100);

      const card = document.createElement('div');
      card.className = 'universe-card fade-up';
      card.style.setProperty('--card-color', cfg.color);
      card.style.animationDelay = `${i * 0.08}s`;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
          <span style="font-size:1.75rem;">${cfg.emoji}</span>
          <h3 class="universe-genre-name">${genre}</h3>
        </div>
        <div class="universe-count" style="color:${cfg.color}">${count}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background:${cfg.color}" data-pct="${pct}"></div>
        </div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem;">${cfg.desc}</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          <a class="universe-link" href="/?genre=${encodeURIComponent(genre)}">Read ${genre} →</a>
          <button class="universe-link" style="background:none;border:none;cursor:pointer;" onclick="generateStory('${genre}')">⚡ Generate</button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Animate bars after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('.bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
      }, 100);
    });

  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">⚠️</div>
      <h3>Could not load universe data</h3>
      <p>Make sure the server is running.</p>
    </div>`;
  }
}

// ─── Generate ─────────────────────────────────────────────────
let generating = false;
async function generateStory(genre) {
  if (generating) return;
  generating = true;
  const statusEl = document.getElementById('gen-status');
  if (statusEl) { statusEl.textContent = '⚡ Generating...'; statusEl.classList.remove('error'); }

  try {
    const res = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
    if (statusEl) statusEl.textContent = `✅ "${data.story.title}" added!`;
    showToast(`✅ New story: "${data.story.title}"`);
    setTimeout(loadStats, 800);
  } catch (err) {
    if (statusEl) { statusEl.textContent = `❌ ${err.message}`; statusEl.classList.add('error'); }
  } finally {
    generating = false;
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 5000);
  }
}

document.getElementById('gen-btn')?.addEventListener('click', () => generateStory(''));

loadStats();
