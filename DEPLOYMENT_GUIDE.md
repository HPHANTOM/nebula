# 🌌 StoryNebula — Complete Deployment & Operations Guide
### 100% Free. Zero Maintenance. Rapid Auto-Expansion.

---

## Table of Contents

1. [Cost Breakdown — Everything Is Free](#1-cost-breakdown)
2. [How Auto-Expansion Works (Built Into the Server)](#2-auto-expansion)
3. [File Structure](#3-file-structure)
4. [Local Setup](#4-local-setup)
5. [Groq API Key — Where to Put It](#5-groq-api-key)
6. [The JSON Database and The Storage Problem (Solved Free)](#6-json-database)
7. [Production Deployment on Render (Free)](#7-render-deployment)
8. [Auto-Expanding in Production — Zero Maintenance Summary](#8-auto-expanding-summary)
9. [Ad Provider Recommendations](#9-ad-providers)
10. [Monetization Strategy](#10-monetization-strategy)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Cost Breakdown

Here is a complete, honest list of every component and what it costs:

| Component | Service | Cost |
|-----------|---------|------|
| AI story generation | **Groq API** | **$0** — free tier, very generous |
| Web hosting | **Render** free plan | **$0** — free web service |
| Auto-generation loop | **Built into server.js** | **$0** — no external tool needed |
| Story database | **GitHub repository** | **$0** — stories.json committed to your repo |
| Keep-alive pings | **cron-job.org** | **$0** — free account |
| Nightly story backup | **GitHub Actions** | **$0** — free for public repos |
| SSL certificate | Render provides it | **$0** — automatic HTTPS |
| Custom domain | Optional | $0 without one; ~$10/yr if you want one |

**Total monthly cost: $0.00**

---

## 2. How Auto-Expansion Works (Built Into the Server)

You do not need any external cron service, paid scheduler, or task runner. StoryNebula's server generates stories on a built-in internal loop that starts the moment the server starts.

### What happens when you deploy

```
Server starts
  → waits 30 seconds (startup grace period)
  → generates first story automatically
  → waits 10 minutes
  → generates next story automatically
  → waits 10 minutes
  → generates next story automatically
  → repeats forever, with zero input from you
```

### Generation rate

| Interval setting | Stories per hour | Stories per day | Stories per month |
|-----------------|-----------------|-----------------|-------------------|
| Every 5 min | 12 | 288 | ~8,640 |
| **Every 10 min (default)** | **6** | **144** | **~4,320** |
| Every 30 min | 2 | 48 | ~1,440 |

At the default 10-minute setting:
- After 1 day: **144 stories**
- After 1 week: **~1,000 stories**
- After 1 month: **~4,300 stories**
- After 3 months: **~13,000 stories**

### Groq free tier limits — you are nowhere near them

Groq's free tier: **14,400 requests/day** for Llama 3 70B.
StoryNebula at every 10 minutes: **144 requests/day** — about 1% of your limit.
Even at every 5 minutes: **288 requests/day** — still only 2% of your limit.

### Controlling the speed

Set these in your `.env` file or in Render's environment variables:

```
AUTO_INTERVAL_MINUTES=10    # default — 144 stories/day
AUTO_INTERVAL_MINUTES=5     # faster — 288 stories/day
AUTO_INTERVAL_MINUTES=30    # slower — 48 stories/day
AUTO_GENERATE=false         # disable entirely
```

---

## 3. File Structure

```
storynebula/
├── server.js                  ← Express backend + built-in auto-generation loop
├── package.json               ← Node dependencies and npm scripts
├── .env.example               ← Template showing all environment variables
├── .env                       ← YOUR env file — never commit this
├── .gitignore                 ← Excludes .env and node_modules; keeps stories.json
├── data/
│   └── stories.json           ← The database — starts empty, committed to GitHub
├── scripts/
│   └── generate.js            ← CLI script for manual generation
└── public/
    ├── index.html             ← Homepage
    ├── story.html             ← Individual story page
    ├── universe.html          ← Universe Map
    ├── styles.css             ← Full design system (dark + light mode)
    ├── script.js              ← Homepage JavaScript
    ├── story.js               ← Story page JavaScript
    └── universe.js            ← Universe Map JavaScript
```

---

## 4. Local Setup

### Step 1: Install Node.js

Download Node.js v18 or higher from https://nodejs.org

```bash
node --version   # Should show v18.x.x or higher
```

### Step 2: Unzip the project

Unzip `storynebula.zip` into a folder called `storynebula`.

### Step 3: Install dependencies

```bash
cd storynebula
npm install
```

### Step 4: Create your .env file

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key (see Section 5).

### Step 5: Start the server

```bash
npm start
```

### Step 6: Open the site

Go to `http://localhost:3000` in your browser.

After 30 seconds you will see the first story auto-generate in your terminal. A new story every 10 minutes after that — no action needed.

---

## 5. Groq API Key

### Getting your free key (takes 2 minutes)

1. Go to **https://console.groq.com**
2. Sign up free — no credit card required
3. Click **API Keys** in the left sidebar
4. Click **Create API Key**
5. Copy the key — it starts with `gsk_`

### Where to put it locally

Open `.env` in your project root:

```
GROQ_API_KEY=gsk_your_actual_key_here
PORT=3000
AUTO_GENERATE=true
AUTO_INTERVAL_MINUTES=10
```

### Where to put it in production (Render)

In the Render dashboard → your service → **Environment** tab. Add `GROQ_API_KEY` as an environment variable there. Never put your real key in any file you commit to GitHub.

### Groq free tier — what you get

- 30 requests per minute
- 14,400 requests per day
- No expiry
- No credit card
- Resets daily

---

## 6. JSON Database and The Storage Problem (Solved Free)

### How data is stored

All stories are saved in `data/stories.json` — a plain text file that grows as stories are added. No database server, no SQL, no MongoDB. Just a JSON array.

### The Render free tier storage issue

Render's free plan uses an ephemeral (temporary) filesystem. When you push a new code deploy, the server container is replaced and any files written to disk since the last deploy are gone.

This means stories generated while the server was running would be lost on the next deploy.

### The free solution: GitHub is your database

`data/stories.json` is committed to your GitHub repository. When you deploy to Render, your stories deploy with your code — they are never lost. The workflow is:

1. Stories generate on the live server and save to disk
2. A GitHub Actions workflow periodically pulls those stories and commits them back to your repo
3. On your next deploy, all committed stories are present

This is entirely free and automatic once set up.

### Pre-seeding before launch (recommended)

Generate stories locally before your first deploy so the site has content immediately:

```bash
# Generate 5 of each genre — 30 launch stories
node scripts/generate.js Horror 5
node scripts/generate.js Sci-Fi 5
node scripts/generate.js Fantasy 5
node scripts/generate.js Mystery 5
node scripts/generate.js Romance 5
node scripts/generate.js Comedy 5
```

Then commit `data/stories.json` to your repo before deploying.

### GitHub Actions automatic backup

Create the file `.github/workflows/backup-stories.yml` in your project:

```yaml
name: Backup Stories to GitHub
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GH_PAT }}

      - name: Fetch stories from live site and save
        run: |
          curl -s "https://YOUR-APP.onrender.com/api/stories?limit=10000" \
            | python3 -c "
import json, sys
data = json.load(sys.stdin)
stories = data.get('stories', [])
with open('data/stories.json', 'w') as f:
    json.dump(stories, f, indent=2)
print(f'Saved {len(stories)} stories')
"

      - name: Commit if there are new stories
        run: |
          git config user.name "StoryNebula Bot"
          git config user.email "bot@storynebula.com"
          git add data/stories.json
          git diff --staged --quiet || git commit -m "Auto-backup: $(date -u '+%Y-%m-%d %H:%M') UTC"
          git push
```

**To activate it:**
1. Replace `YOUR-APP.onrender.com` with your actual Render URL
2. Go to GitHub → your profile → Settings → Developer settings → Personal access tokens (classic)
3. Create a token with `repo` scope — copy it
4. Go to your repo → Settings → Secrets and variables → Actions → New repository secret
5. Name: `GH_PAT`, Value: your token
6. Commit the workflow file to your repo

After that: every 6 hours, GitHub Actions pulls your latest stories from the live site and commits them to the repo. If Render ever resets, you redeploy and everything comes back. Completely free, completely automatic.

---

## 7. Production Deployment on Render (Free)

### Step 1: Create a GitHub repository

1. Go to https://github.com and sign up free if needed
2. Create a new repository (public or private)
3. Make sure your `.gitignore` looks like this — note that `data/stories.json` is NOT excluded:

```
node_modules/
.env
logs/
```

4. Push the project:
```bash
git init
git add .
git commit -m "Initial StoryNebula commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/storynebula.git
git push -u origin main
```

### Step 2: Sign up for Render

Go to **https://render.com** — sign up free with GitHub.

### Step 3: Create a Web Service

1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - Name: `storynebula`
   - Region: US East (or closest to your audience)
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**

### Step 4: Set environment variables

In the Render dashboard → your service → **Environment** tab, add these:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `gsk_your_actual_key_here` |
| `PORT` | `3000` |
| `AUTO_GENERATE` | `true` |
| `AUTO_INTERVAL_MINUTES` | `10` |

### Step 5: Deploy

Click **Create Web Service**. Render builds and deploys in about 2 minutes.

Your site is live at:
```
https://storynebula.onrender.com
```

### Step 6: Keep the server awake (free)

Render's free tier puts your server to sleep after 15 minutes without traffic. While asleep, the auto-generation loop pauses. Fix this for free:

1. Go to **https://cron-job.org** — sign up free
2. Create a new cron job:
   - URL: `https://storynebula.onrender.com/api/stories?limit=1`
   - Method: `GET`
   - Schedule: Every 14 minutes
3. Save it

This pings your server every 14 minutes, keeping it awake around the clock. Since the server never sleeps, the built-in loop generates a story every 10 minutes, 24 hours a day, 7 days a week. Total cost: $0.

### Step 7: Verify it is working

In the Render dashboard → your service → **Logs** tab, you should see:

```
🌌 StoryNebula running at http://localhost:3000
🔄 Auto-generation: every 10 minutes
✅ [AUTO] "The Silence Between Worlds" (Sci-Fi) → /story/the-silence-between-worlds
```

Every 10 minutes, a new line like the last one appears. Your site is expanding on its own.

---

## 8. Auto-Expanding Summary — Zero Maintenance

Here is the complete picture of what runs automatically after the one-time setup:

```
Render free tier → hosts your Node.js server (always on, thanks to cron-job.org pings)
    ↓
Every 10 minutes → server's internal loop calls Groq API (free)
    ↓
Groq generates: title, summary, full story, genre, slug
    ↓
Story saved to data/stories.json on disk
    ↓
Homepage and story pages immediately show the new story
    ↓
Every 6 hours → GitHub Actions pulls latest stories → commits to repo → stories backed up forever
```

You set this up once. After that you never touch it.

### Growth timeline at default settings (every 10 minutes)

| Time | Stories |
|------|---------|
| 1 day | 144 |
| 3 days | 432 |
| 1 week | 1,008 |
| 2 weeks | 2,016 |
| 1 month | 4,320 |
| 3 months | 12,960 |
| 6 months | 25,920 |
| 1 year | 51,840 |

A year from now you would have over 50,000 unique AI-generated short stories across 6 genres, built entirely automatically, at zero cost.

---

## 9. Ad Providers

### Best networks for fiction and story sites

#### Start immediately — no traffic minimum

**Ezoic**
- RPM: $8–$25
- No minimum traffic
- Uses AI to optimize ad placement for maximum revenue
- Significantly better RPMs than AdSense
- Best choice from day one
- Apply at: https://ezoic.com

**Google AdSense**
- RPM: $1–$8
- No minimum
- Very easy to set up
- Use as a fallback or while waiting for Ezoic approval
- Apply at: https://adsense.google.com

**Amazon Associates (affiliate — often outperforms display ads at low traffic)**
- Commission: 1–10% per sale
- No traffic minimum
- Add "If you loved this story, read..." links to real books in the same genre
- Horror readers buy horror novels. Romance readers buy romance novels. High conversion.
- Apply at: https://affiliate-program.amazon.com

#### For when you have traffic (premium RPMs)

**Mediavine**
- RPM: $15–$40+ (up to $60+ in Q4)
- Requires: 50,000 sessions/month
- Built specifically for content and long-form reading sites
- This is the target. Once you hit 50k sessions, apply immediately.
- Apply at: https://mediavine.com

**Raptive (formerly AdThrive)**
- RPM: $15–$35+
- Requires: 100,000 pageviews/month
- Premium brands, excellent fill rates
- Apply at: https://raptive.com

**Monumetric**
- RPM: $5–$15
- Requires: 10,000 pageviews/month
- Good bridge between AdSense and Mediavine
- Apply at: https://monumetric.com

#### Networks to avoid entirely

| Network | Reason |
|---------|--------|
| PropellerAds | Low quality, low RPM, damages reader trust |
| PopAds / PopCash | Pop-unders immediately drive readers away |
| InfoLinks | In-text ads destroy the reading experience |
| Clickadu | Push notifications harm the brand |
| Taboola / Mgid | Clickbait widgets look cheap on editorial content |

### Ad placement strategy for story sites

Best positions (ranked by RPM):
1. Mid-story at a natural break — highest viewability and engagement
2. After the first paragraph — in-content, high RPM
3. End of story before related stories — high engagement moment
4. Sticky sidebar on desktop — passive income
5. Header banner — visible on all pages

Never place ads inside paragraphs, as pop-ups, or as auto-playing video with sound. These destroy the reading experience which is your entire product.

### Revenue projections

| Monthly sessions | Network | Estimated monthly revenue |
|----------------|---------|--------------------------|
| 1,000 | AdSense | $3–$15 |
| 5,000 | Ezoic | $40–$125 |
| 10,000 | Ezoic | $80–$250 |
| 25,000 | Ezoic | $250–$625 |
| 50,000 | Mediavine | $750–$2,000 |
| 100,000 | Mediavine | $2,000–$5,000 |
| 500,000 | Mediavine/Raptive | $10,000–$25,000+ |

Q4 (October through December) RPMs are typically 40–80% higher than other quarters.

---

## 10. Monetization Strategy

### Phase 1 (0–10k sessions/month): Content and foundation
- Apply for Ezoic or AdSense immediately
- Add Amazon Associates links to every story page
- Generate content aggressively — at 10-minute intervals the site grows fast
- Share genre-specific stories on Reddit: r/shortstories, r/worldbuilding, r/horror, r/scifi, r/fantasy
- Start collecting emails with a simple subscribe box

### Phase 2 (10k–50k sessions/month): Optimize revenue
- Optimize Ezoic placement for maximum RPM
- Add Kindle Unlimited and Audible affiliate links (high commission per signup)
- Experiment with Monumetric as an alternative to Ezoic

### Phase 3 (50k+ sessions/month): Premium revenue
- Apply to Mediavine immediately — this is where revenue becomes serious
- Negotiate direct advertising deals with book publishers in your top genres
- Add a sponsored weekly newsletter

### SEO

Each story page already has a unique title and meta description. To accelerate SEO:
- Submit a sitemap to Google Search Console
- Genre pages target long-tail keywords like "AI horror short stories free"
- Story titles and summaries naturally generate semantic richness Google rewards

---

## 11. Troubleshooting

**Auto-generation is not running**
Check Render's Logs tab. You should see `🔄 Auto-generation: every X minutes`. If not, verify `GROQ_API_KEY` and `AUTO_GENERATE=true` are set in Render's Environment tab.

**Site is sleeping on Render**
Set up the cron-job.org ping described in Section 7 Step 6. One free ping every 14 minutes keeps it awake permanently.

**Stories disappear after Render redeploys**
Set up the GitHub Actions backup workflow in Section 6. Or manually commit your `data/stories.json` to GitHub before every deploy.

**"Could not parse story JSON"**
Groq occasionally returns slightly non-standard JSON. The code handles this automatically with a fallback parser. If it keeps failing, the model may be temporarily overloaded — it will retry on the next interval.

**GROQ_API_KEY is not set**
For local: check your `.env` file has no spaces around `=` and that you restarted the server. For production: check Render's Environment tab, not your local `.env`.

**Port 3000 already in use locally**
```bash
lsof -ti:3000 | xargs kill -9
```

---

*StoryNebula Deployment Guide v2.0 — 100% Free Stack*
*All stories are AI-generated fiction. Characters, places, and events are invented.*
