/* ════════════════════════════════════════════════════════════
   StoryNebula — Story Page Script (story.js)
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

// ─── Helpers ─────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('sn-favorites') || '[]'); } catch { return []; }
}

function isFavorite(slug) {
  return getFavorites().some(f => f.slug === slug);
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
  return idx < 0;
}

// ─── Render Story ─────────────────────────────────────────────
function renderStory(story) {
  const container = document.getElementById('story-container');
  const fav = isFavorite(story.slug);
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  // Format story paragraphs
  const paragraphs = story.story
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escHtml(p)}</p>`)
    .join('\n');

  container.innerHTML = `
    <div class="story-page-header fade-up">
      <span class="story-page-genre card-genre genre-${story.genre.replace(/[^a-zA-Z]/g,'-')}">${story.genre}</span>
      <h1 class="story-page-title">${escHtml(story.title)}</h1>
      <blockquote class="story-page-summary">${escHtml(story.summary)}</blockquote>
      <div class="story-page-meta">
        <span>📅 ${date}</span>
        <span>·</span>
        <span>🌌 AI-Generated Fiction</span>
        <span>·</span>
        <span>~${Math.ceil(story.story.split(' ').length / 200)} min read</span>
      </div>
    </div>

    <div class="story-actions fade-up">
      <button class="fav-btn ${fav ? 'active' : ''}" id="fav-btn">
        <span class="heart">${fav ? '♥' : '♡'}</span>
        ${fav ? 'Favorited' : 'Add to Favorites'}
      </button>
      <button class="btn btn-ghost" id="random-btn">🎲 Random Story</button>
      <a href="/?genre=${story.genre}" class="btn btn-ghost">← More ${story.genre}</a>
      <a href="/" class="btn btn-ghost">Home</a>
    </div>

    <div class="story-body fade-up">
      ${paragraphs}
    </div>

    <div style="max-width:720px;margin:3rem auto 0;padding-top:2rem;border-top:1px solid var(--border);">
      <div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">
        <button class="fav-btn ${fav ? 'active' : ''}" id="fav-btn-bottom">
          <span class="heart">${fav ? '♥' : '♡'}</span>
          ${fav ? 'Favorited' : 'Add to Favorites'}
        </button>
        <button class="btn btn-primary" id="random-btn-bottom">🎲 Random Story</button>
        <a href="/" class="btn btn-outline">← All Stories</a>
      </div>
    </div>
  `;

  // Update page title & meta
  document.title = `${story.title} — StoryNebula`;
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content', story.summary.substring(0, 155)
  );

  // Favorite buttons
  const updateFavBtns = (now) => {
    ['fav-btn','fav-btn-bottom'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle('active', now);
      btn.innerHTML = `<span class="heart">${now ? '♥' : '♡'}</span> ${now ? 'Favorited' : 'Add to Favorites'}`;
    });
  };

  ['fav-btn','fav-btn-bottom'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      const now = toggleFavorite(story.slug, story.title);
      updateFavBtns(now);
    });
  });

  // Random story buttons
  const goRandom = async () => {
    try {
      const res = await fetch('/api/random');
      if (!res.ok) return showToast('No stories yet!');
      const s = await res.json();
      window.location.href = `/story.html?slug=${s.slug}`;
    } catch { showToast('Could not fetch a random story.'); }
  };
  document.getElementById('random-btn')?.addEventListener('click', goRandom);
  document.getElementById('random-btn-bottom')?.addEventListener('click', goRandom);
}

// ─── Load Story ───────────────────────────────────────────────
async function loadStory() {
  const slug = new URLSearchParams(window.location.search).get('slug');
  const container = document.getElementById('story-container');

  if (!slug) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">📭</div>
      <h3>No story specified</h3>
      <p>Go back to the <a href="/">homepage</a> and pick a story.</p>
    </div>`;
    return;
  }

  try {
    const res = await fetch(`/api/stories/${slug}`);
    if (res.status === 404) {
      container.innerHTML = `<div class="empty-state">
        <div class="icon">🔭</div>
        <h3>Story not found</h3>
        <p>This story may have drifted out of the nebula. <a href="/">Return home</a>.</p>
      </div>`;
      return;
    }
    if (!res.ok) throw new Error('Server error');
    const story = await res.json();
    renderStory(story);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">⚠️</div>
      <h3>Could not load story</h3>
      <p>Make sure the server is running. <a href="/">Return home</a>.</p>
    </div>`;
  }
}

loadStory();
