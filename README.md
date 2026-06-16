# FIFA World Cup 2026 Dashboard

A live match dashboard for the 2026 FIFA World Cup. Shows upcoming fixtures, scores, recent results, and group stage standings.

It's a **fully static site** hosted for free on **GitHub Pages**. A scheduled GitHub Action fetches fresh data from [football-data.org](https://www.football-data.org/) every 30 minutes and republishes the site. There is no running server — the API key lives in a GitHub Secret and never reaches the browser.

> Live demo: `https://peter-mxtoolbox.github.io/worldcupdashboard/`

---

## How it works

```
┌────────────────────┐    every 30 min (cron)    ┌──────────────────────┐
│  GitHub Actions     │ ────────────────────────▶ │  football-data.org   │
│  scripts/fetch_     │   X-Auth-Token (secret)   │  API                 │
│  data.py            │ ◀──────────────────────── │                      │
└─────────┬──────────┘        matches/standings   └──────────────────────┘
          │ writes JSON
          ▼
   frontend/public/data/*.json  ──►  vite build  ──►  GitHub Pages (static)
                                                            │
                                                            ▼
                                          Browser fetches static JSON only
```

- **`scripts/fetch_data.py`** — calls football-data.org and writes `matches.json`, `standings.json`, `status.json` into `frontend/public/data/`. Runs in CI; the API key comes from the `FOOTBALL_DATA_API_KEY` secret.
- **`.github/workflows/deploy.yml`** — on a 30-minute schedule (and on every push / manual trigger): fetch data → `npm run build` → deploy to Pages.
- **Frontend** — a React/Vite app that fetches the static JSON files (no `/api` backend).

---

## One-time GitHub setup

1. **Add the API key as a secret.** Get a free key from [football-data.org](https://www.football-data.org/client/register), then in the repo: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FOOTBALL_DATA_API_KEY`
   - Value: your key
2. **Enable Pages from Actions.** **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the **Build and deploy to GitHub Pages** workflow manually from the Actions tab). The site goes live at `https://<user>.github.io/<repo>/`.

To change how often data refreshes, edit the `cron` in `.github/workflows/deploy.yml`.

---

## Local development

### Prerequisites

- Python 3.9+
- Node.js 18+
- A free API key from [football-data.org](https://www.football-data.org/client/register)

### Setup

```bash
# 1. API key for local fetches
cp scripts/.env.example scripts/.env
#    then edit scripts/.env and paste your key

# 2. Python deps for the fetch script
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt

# 3. Frontend deps
cd frontend && npm install && cd ..
```

### Run

```bash
./start.sh
```

This fetches the latest data into `frontend/public/data/` and starts the Vite dev server at <http://localhost:5173>. Re-run it (or just `python3 scripts/fetch_data.py`) to pull fresh data.

---

## Project structure

```
worldcupdashboard/
├── .github/workflows/
│   └── deploy.yml          # Scheduled fetch + build + deploy to Pages
├── scripts/
│   ├── fetch_data.py       # Fetches API data -> static JSON
│   ├── requirements.txt
│   └── .env.example        # Copy to scripts/.env for local runs
├── frontend/
│   ├── public/data/        # Generated JSON (gitignored)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/      # Header, MatchCard, MatchSection, Standings
│   │   └── hooks/
│   │       └── useWorldCupData.js  # Fetches static JSON, polls for updates
│   └── vite.config.js      # base path for project Pages
└── start.sh                # Local dev: fetch data + run Vite
```

---

## Notes & limitations

- **Freshness:** data is as recent as the last scheduled run (~30 min; GitHub may delay scheduled jobs under load). The football-data.org free tier does not include true real-time in-play data.
- **Cost:** GitHub Pages and Actions are free for public repositories.
