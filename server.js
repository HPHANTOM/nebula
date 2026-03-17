require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "stories.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadStories() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStories(stories) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(stories, null, 2), "utf8");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 80);
}

const GENRES = ["Horror", "Sci-Fi", "Fantasy", "Mystery", "Romance", "Comedy"];

// ─── Groq API Call ──────────────────────────────────────────────────────────

async function callGroq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} — ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Story Generation ────────────────────────────────────────────────────────

async function generateStory(genre) {
  const genrePrompts = {
    Horror: "a terrifying tale with psychological dread and a shocking twist",
    "Sci-Fi": "a thought-provoking space or technology story with a big idea at its core",
    Fantasy: "an epic fantasy with vivid world-building, magic, and mythical creatures",
    Mystery: "a gripping whodunit with clever clues and a satisfying reveal",
    Romance: "a heartfelt love story with emotional depth and memorable characters",
    Comedy: "a hilarious comedic story full of absurd situations and witty dialogue",
  };

  const prompt = `You are StoryNebula, a master fiction writer. Write ${genrePrompts[genre] || "an original short story"} in the ${genre} genre.

Return ONLY a valid JSON object with exactly these keys (no extra text, no markdown, no code fences):
{
  "title": "A compelling, creative title (5-10 words)",
  "summary": "A gripping one-paragraph summary (2-3 sentences, max 80 words)",
  "story": "The full short story (1000-1800 words, immersive, well-paced, with a clear beginning, middle, and end)"
}

Rules:
- All content must be fictional, and appropriate for young adult and adult audiences.
- No real people, real places (use fictional names), or real events.
- Make the story genuinely engaging and memorable.
- Return ONLY the JSON. No preamble. No explanation.`;
const raw = await callGroq(prompt);

  // Aggressively strip anything that isn't the JSON object
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^[^{]*/s, "")   // strip anything before the first {
    .replace(/[^}]*$/s, "")   // strip anything after the last }
    .trim();

  // If the above nuked everything, fall back to regex extraction
  if (!cleaned.startsWith("{")) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Groq returned no JSON object at all");
    cleaned = match[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last resort: find the largest {...} block
    const blocks = [...raw.matchAll(/\{[\s\S]*?\}/g)];
    const biggest = blocks.sort((a, b) => b[0].length - a[0].length)[0];
    if (!biggest) throw new Error("Could not parse story JSON from Groq response");
    try {
      parsed = JSON.parse(biggest[0]);
    } catch {
      throw new Error("Could not parse story JSON from Groq response");
    }
  }

  const { title, summary, story } = parsed;
  if (!title || !summary || !story) throw new Error("Groq response missing required fields");

  return { title, summary, story };
}

// ─── Auto-Generate Entry Point ───────────────────────────────────────────────

async function autoGenerate(genre) {
  const stories = loadStories();
  const chosenGenre = genre || GENRES[Math.floor(Math.random() * GENRES.length)];

  const { title, summary, story } = await generateStory(chosenGenre);

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;
  while (stories.find((s) => s.slug === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const newStory = {
    id: Date.now(),
    slug,
    title,
    genre: chosenGenre,
    summary,
    story,
    createdAt: new Date().toISOString(),
  };

  stories.unshift(newStory); // newest first
  saveStories(stories);
  return newStory;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET all stories (with optional genre filter & pagination)
app.get("/api/stories", (req, res) => {
  let stories = loadStories();
  const { genre, page = 1, limit = 12 } = req.query;
  if (genre) stories = stories.filter((s) => s.genre.toLowerCase() === genre.toLowerCase());
  const total = stories.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = stories.slice(start, start + parseInt(limit));
  res.json({ stories: paginated, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET story of the day (deterministic daily pick)
app.get("/api/story-of-the-day", (req, res) => {
  const stories = loadStories();
  if (!stories.length) return res.status(404).json({ error: "No stories yet" });
  const dayIndex = Math.floor(Date.now() / 86400000) % stories.length;
  res.json(stories[dayIndex]);
});

// GET random story
app.get("/api/random", (req, res) => {
  const stories = loadStories();
  if (!stories.length) return res.status(404).json({ error: "No stories yet" });
  res.json(stories[Math.floor(Math.random() * stories.length)]);
});

// GET genre stats for Universe Map
app.get("/api/stats", (req, res) => {
  const stories = loadStories();
  const stats = {};
  GENRES.forEach((g) => (stats[g] = 0));
  stories.forEach((s) => {
    if (stats[s.genre] !== undefined) stats[s.genre]++;
  });
  res.json({ total: stories.length, genres: stats });
});

// GET story seeds (random prompts)
app.get("/api/seeds", (req, res) => {
  const seeds = [
    "A lighthouse keeper discovers the sea has been replaced with something else overnight.",
    "An astronaut returns home to find everyone has forgotten she ever existed.",
    "A love letter arrives—addressed to someone who died 200 years ago.",
    "The last library on Earth keeps books that haven't been written yet.",
    "A detective investigates a murder where the victim left their own confession.",
    "A dragon applies for a job at a corporate office.",
    "Two strangers realize they've been dreaming about each other for years.",
    "A comedian discovers their jokes are accidentally predicting the future.",
    "The town clock strikes 13, and the hour between is dangerous.",
    "A chef creates a dish that causes everyone who eats it to tell the truth.",
    "An AI therapist falls in love with a patient it can never meet.",
    "A haunted house is put on Airbnb by the ghost who lives there.",
    "The last human and the last robot argue about who should carry on.",
    "A map is discovered that leads to a city that shouldn't exist.",
    "A woman realizes her shadow has been living a completely different life.",
  ];
  const shuffled = seeds.sort(() => Math.random() - 0.5).slice(0, 5);
  res.json(shuffled);
});

// GET single story by slug
app.get("/api/stories/:slug", (req, res) => {
  const stories = loadStories();
  const story = stories.find((s) => s.slug === req.params.slug);
  if (!story) return res.status(404).json({ error: "Story not found" });
  res.json(story);
});

// POST generate a new story
app.post("/api/generate-story", async (req, res) => {
  try {
    const { genre } = req.body;
    const story = await autoGenerate(genre);
    res.json({ success: true, story });
  } catch (err) {
    console.error("Generation error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Built-in Auto-Generation Loop ──────────────────────────────────────────
// Generates a new story automatically every AUTO_INTERVAL_MS milliseconds.
// Default: every 10 minutes. Set AUTO_INTERVAL_MINUTES in .env to change.
// Set AUTO_GENERATE=false in .env to disable entirely.
// This means ZERO external cron tools needed — the server expands itself.

const AUTO_GENERATE = process.env.AUTO_GENERATE !== "false";
const AUTO_INTERVAL_MINUTES = parseFloat(process.env.AUTO_INTERVAL_MINUTES || "10");
const AUTO_INTERVAL_MS = AUTO_INTERVAL_MINUTES * 60 * 1000;

function startAutoLoop() {
  if (!AUTO_GENERATE) {
    console.log("⏸  Auto-generation disabled (AUTO_GENERATE=false)");
    return;
  }
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    console.log("⚠️  GROQ_API_KEY not set — auto-generation skipped. Add it to .env to enable.");
    return;
  }

  console.log(`🔄 Auto-generation: every ${AUTO_INTERVAL_MINUTES} minutes`);

  // Generate one story immediately on startup, then on interval
  const run = async () => {
    try {
      const story = await autoGenerate();
      console.log(`✅ [AUTO] "${story.title}" (${story.genre}) → /story/${story.slug}`);
    } catch (err) {
      console.error(`❌ [AUTO] Failed: ${err.message}`);
    }
  };

  // Wait 30 seconds after startup before first auto-generation
  // so the server is fully ready and any startup logs are clean
  setTimeout(() => {
    run();
    setInterval(run, AUTO_INTERVAL_MS);
  }, 30000);
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🌌 StoryNebula running at http://localhost:${PORT}\n`);

  // Ensure data file exists
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
    console.log("📁 Created data/stories.json");
  }

  startAutoLoop();
});
