/**
 * StoryNebula — Story Generation Script
 *
 * Usage:
 *   node scripts/generate.js            → random genre
 *   node scripts/generate.js Horror     → specific genre
 *   node scripts/generate.js Sci-Fi 3   → generate 3 stories
 *
 * Cron example (generate 1 story every 2 hours):
 *   0 *\/2 * * * cd /path/to/storynebula && node scripts/generate.js >> logs/cron.log 2>&1
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../data/stories.json");
const GENRES = ["Horror", "Sci-Fi", "Fantasy", "Mystery", "Romance", "Comedy"];

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

async function callGroq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 1800,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateStory(genre) {
  const genrePrompts = {
    Horror: "a terrifying tale with psychological dread and a shocking twist",
    "Sci-Fi": "a thought-provoking space or technology story with a big idea at its core",
    Fantasy: "an epic fantasy with vivid world-building, magic, and mythical creatures",
    Mystery: "a gripping whodunit with clever clues and a satisfying reveal",
    Romance: "a heartfelt love story with emotional depth and memorable characters",
    Comedy: "a hilarious comedic story full of absurd situations and witty dialogue",
  };

  const prompt = `You are StoryNebula, a master fiction writer. Write ${genrePrompts[genre]} in the ${genre} genre.

Return ONLY a valid JSON object with exactly these keys (no extra text, no markdown, no code fences):
{
  "title": "A compelling, creative title (5-10 words)",
  "summary": "A gripping one-paragraph summary (2-3 sentences, max 80 words)",
  "story": "The full short story (600-900 words, immersive, well-paced, with a clear beginning, middle, and end)"
}

Rules:
- All content must be safe, fictional, and appropriate for general audiences.
- No real people, real places (use fictional names), or real events.
- Make the story genuinely engaging and memorable.
- Return ONLY the JSON. No preamble. No explanation.`;

  const raw = await callGroq(prompt);
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse story JSON");
    parsed = JSON.parse(match[0]);
  }

  const { title, summary, story } = parsed;
  if (!title || !summary || !story) throw new Error("Missing required fields in response");

  const stories = loadStories();
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;
  while (stories.find((s) => s.slug === slug)) slug = `${baseSlug}-${counter++}`;

  const newStory = {
    id: Date.now(),
    slug,
    title,
    genre,
    summary,
    story,
    createdAt: new Date().toISOString(),
  };

  stories.unshift(newStory);
  saveStories(stories);
  return newStory;
}

(async () => {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    console.error("❌ GROQ_API_KEY is not set. Check your .env file.");
    process.exit(1);
  }

  const genre = process.argv[2] || GENRES[Math.floor(Math.random() * GENRES.length)];
  const count = parseInt(process.argv[3]) || 1;

  if (genre !== "random" && !GENRES.includes(genre)) {
    console.error(`❌ Invalid genre "${genre}". Choose from: ${GENRES.join(", ")}`);
    process.exit(1);
  }

  for (let i = 0; i < count; i++) {
    const chosenGenre = genre === "random" ? GENRES[Math.floor(Math.random() * GENRES.length)] : genre;
    console.log(`\n[${i + 1}/${count}] Generating ${chosenGenre} story...`);
    try {
      const story = await generateStory(chosenGenre);
      console.log(`✅ "${story.title}" → /story/${story.slug}`);
    } catch (err) {
      console.error(`❌ Failed: ${err.message}`);
    }
  }
  console.log("\n🌌 Done.");
})();
