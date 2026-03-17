/* ════════════════════════════════════════════════════════════
   StoryNebula — Homepage Script (script.js)
   ════════════════════════════════════════════════════════════ */

// ─── Theme ──────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('sn-theme') || 'dark';
if (savedTheme === 'light') document.body.classList.add('light');

themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('sn-theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// ─── Year ────────────────────────────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── Toast ───────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// ─── Favorites (localStorage) ────────────────────────────────
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('sn-favorites') || '[]'); } catch { return []; }
}
function toggleFavorite(slug, title) {
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.slug === slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
    showToast('Removed from favorites.');
  } else {
    favs.push({ slug, title, savedAt: Date.now() });
    showToast('✦ Added to favorites!');
  }
  localStorage.setItem('sn-favorites', JSON.stringify(favs));
  return idx < 0; // true = now favorited
}
function isFavorite(slug) {
  return getFavorites().some(f => f.slug === slug);
}

// ─── Genre Colors ────────────────────────────────────────────
const genreColor = {
  Horror: '#f87171',
  'Sci-Fi': '#38bdf8',
  Fantasy: '#a78bfa',
  Mystery: '#fbbf24',
  Romance: '#f472b6',
  Comedy: '#4ade80',
};

// ─── Story Card Builder ──────────────────────────────────────
function buildCard(story) {
  const fav = isFavorite(story.slug);
  const date = new Date(story.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const card = document.createElement('article');
  card.className = 'story-card fade-up';
  card.innerHTML = `
    <span class="card-genre genre-${story.genre.replace(/[^a-zA-Z]/g,'-')}">${story.genre}</span>
    <h3 class="card-title">${escHtml(story.title)}</h3>
    <p class="card-summary">${escHtml(story.summary)}</p>
    <div class="card-footer">
      <span>${date}</span>
      <a class="card-read-link" href="/story.html?slug=${story.slug}">Read → </a>
    </div>
  `;
  card.addEventListener('click', (e) => {
    if (!e.target.closest('a')) window.location.href = `/story.html?slug=${story.slug}`;
  });
  return card;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Story of the Day ────────────────────────────────────────
async function loadSOTD() {
  const container = document.getElementById('sotd-container');
  if (!container) return;
  try {
    const res = await fetch('/api/story-of-the-day');
    if (!res.ok) { container.innerHTML = ''; return; }
    const story = await res.json();
    const fav = isFavorite(story.slug);
    container.innerHTML = `
      <div class="sotd-card fade-up">
        <div class="sotd-badge">Story of the Day</div>
        <span class="card-genre genre-${story.genre.replace(/[^a-zA-Z]/g,'-')}" style="margin-bottom:0.75rem;">${story.genre}</span>
        <h2 class="sotd-title">${escHtml(story.title)}</h2>
        <p class="sotd-summary">${escHtml(story.summary)}</p>
        <div class="sotd-actions">
          <a href="/story.html?slug=${story.slug}" class="btn btn-primary">Read Story →</a>
          <button class="fav-btn ${fav ? 'active' : ''}" id="sotd-fav-btn" data-slug="${story.slug}" data-title="${escHtml(story.title)}">
            <span class="heart">${fav ? '♥' : '♡'}</span> ${fav ? 'Favorited' : 'Favorite'}
          </button>
        </div>
      </div>`;
    document.getElementById('sotd-fav-btn')?.addEventListener('click', function() {
      const now = toggleFavorite(this.dataset.slug, this.dataset.title);
      this.classList.toggle('active', now);
      this.innerHTML = `<span class="heart">${now ? '♥' : '♡'}</span> ${now ? 'Favorited' : 'Favorite'}`;
    });
  } catch {
    container.innerHTML = '';
  }
}

// ─── Seeds ───────────────────────────────────────────────────
async function loadSeeds() {
  const grid = document.getElementById('seeds-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/seeds');
    if (!res.ok) throw new Error();
    const seeds = await res.json();
    grid.innerHTML = seeds.map(s => `<div class="seed-card">${escHtml(s)}</div>`).join('');
  } catch {
    grid.innerHTML = '<p style="color:var(--text-dim)">Could not load story seeds.</p>';
  }
}

// ─── Stories (paginated + filtered) ─────────────────────────
let currentPage = 1;
let currentGenre = '';
const LIMIT = 12;

async function loadStories(page = 1, genre = '') {
  const grid = document.getElementById('stories-grid');
  const heading = document.getElementById('stories-heading');
  const countEl = document.getElementById('story-count');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (genre) params.set('genre', genre);
    const res = await fetch(`/api/stories?${params}`);
    if (!res.ok) throw new Error();
    const { stories, total } = await res.json();

    if (heading) heading.textContent = genre ? `${genre} Stories` : 'Latest Stories';
    if (countEl) countEl.textContent = `${total} total`;

    if (!stories.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div>
        <h3>No stories yet</h3>
        <p>Generate your first story to populate the nebula!</p>
        <button class="btn btn-primary" style="margin-top:1rem;" onclick="generateStory('${genre}')">⚡ Generate ${genre || 'a'} Story</button>
      </div>`;
      renderPagination(0, page);
      return;
    }

    grid.innerHTML = '';
    stories.forEach(s => grid.appendChild(buildCard(s)));
    renderPagination(total, page);
  } catch {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="icon">⚠️</div><h3>Could not load stories</h3><p>Make sure the server is running.</p></div>';
  }
}

function renderPagination(total, currentPg) {
  const container = document.getElementById('pagination');
  if (!container) return;
  const totalPages = Math.ceil(total / LIMIT);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${currentPg === 1 ? 'disabled' : ''} onclick="goPage(${currentPg - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPg) <= 2) {
      html += `<button class="${i === currentPg ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPg) === 3) {
      html += `<button disabled>…</button>`;
    }
  }
  html += `<button ${currentPg === totalPages ? 'disabled' : ''} onclick="goPage(${currentPg + 1})">›</button>`;
  container.innerHTML = html;
}

function goPage(page) {
  currentPage = page;
  loadStories(page, currentGenre);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Genre Filters ───────────────────────────────────────────
document.getElementById('genre-filters')?.addEventListener('click', (e) => {
  const pill = e.target.closest('.genre-pill');
  if (!pill) return;
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  currentGenre = pill.dataset.genre;
  currentPage = 1;
  loadStories(1, currentGenre);
});

// ─── Generate Story ──────────────────────────────────────────
let generating = false;
async function generateStory(genre) {
  if (generating) return;
  generating = true;

  const statusEls = ['gen-status', 'banner-gen-status'].map(id => document.getElementById(id)).filter(Boolean);
  statusEls.forEach(el => { el.textContent = '⚡ Generating...'; el.classList.remove('error'); });

  try {
    const res = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: genre || currentGenre || '' }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
    statusEls.forEach(el => { el.textContent = `✅ "${data.story.title}" added!`; });
    showToast(`✅ New story: "${data.story.title}"`);
    setTimeout(() => {
      loadStories(1, currentGenre);
      loadSOTD();
    }, 600);
  } catch (err) {
    statusEls.forEach(el => { el.textContent = `❌ ${err.message}`; el.classList.add('error'); });
  } finally {
    generating = false;
    setTimeout(() => statusEls.forEach(el => { el.textContent = ''; }), 5000);
  }
}

document.getElementById('generate-btn')?.addEventListener('click', () => generateStory());
document.getElementById('gen-banner-btn')?.addEventListener('click', () => generateStory());

// ─── Random Story ────────────────────────────────────────────
document.getElementById('random-btn')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/random');
    if (!res.ok) return showToast('No stories yet. Generate one first!');
    const story = await res.json();
    window.location.href = `/story.html?slug=${story.slug}`;
  } catch { showToast('Could not fetch a random story.'); }
});

// ─── Surprise Me (random genre + story) ──────────────────────
document.getElementById('surprise-btn')?.addEventListener('click', async () => {
  const genres = ['Horror','Sci-Fi','Fantasy','Mystery','Romance','Comedy'];
  const genre = genres[Math.floor(Math.random() * genres.length)];
  showToast(`✨ Surprising you with a ${genre} story...`);
  try {
    const params = new URLSearchParams({ genre, page: 1, limit: 20 });
    const res = await fetch(`/api/stories?${params}`);
    const { stories } = await res.json();
    if (!stories.length) return showToast(`No ${genre} stories yet. Generating one...`);
    const story = stories[Math.floor(Math.random() * stories.length)];
    window.location.href = `/story.html?slug=${story.slug}`;
  } catch { showToast('Something went wrong. Try again!'); }
});

// ─── Refresh Seeds ───────────────────────────────────────────
document.getElementById('refresh-seeds-btn')?.addEventListener('click', loadSeeds);

// ─── URL Genre Filter ─────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const urlGenre = urlParams.get('genre') || '';
if (urlGenre) {
  currentGenre = urlGenre;
  document.querySelectorAll('.genre-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.genre === urlGenre);
  });
}

// ─── Nav Active State ────────────────────────────────────────
if (urlGenre) {
  document.querySelectorAll('#main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    const hGenre = new URLSearchParams(href.split('?')[1] || '').get('genre') || '';
    a.classList.toggle('active', hGenre === urlGenre);
  });
}

// ─── Init ─────────────────────────────────────────────────────
loadSOTD();
loadSeeds();
loadStories(1, currentGenre);
