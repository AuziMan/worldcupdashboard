# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Start both servers together from the project root:
```bash
./start.sh
```
This kills any existing processes on ports 5001 and 5173, then starts the Flask backend and the Vite dev server. Dashboard is at http://localhost:5173.

To start servers individually:
```bash
# Backend
cd backend && venv/bin/python app.py

# Frontend
cd frontend && npm run dev
```

## Frontend commands

Run from `frontend/`:
```bash
npm run build   # production build (outputs to frontend/dist/)
npm run lint    # ESLint
npm run preview # serve the production build locally
```

## Architecture

This is a two-service app. The React frontend never calls football-data.org directly — all external API calls go through the Flask backend.

**Backend** (`backend/app.py`) — Flask on port 5001:
- Fetches from `https://api.football-data.org/v4/competitions/WC/*`
- In-memory cache with a dynamic TTL: **60 seconds** when any match is `IN_PLAY` or `PAUSED`, **60 seconds** otherwise (both currently 60s; adjust `CACHE_TTL_DEFAULT` and `CACHE_TTL_LIVE`).
- API key loaded from `backend/.env` via `python-dotenv`. Copy `.env.example` to `.env` to set it up.
- Key endpoints: `/api/matches`, `/api/standings`, `/api/teams`, `/api/status`, `/api/refresh` (POST to bust cache).

**Frontend** (`frontend/src/`):
- `hooks/useWorldCupData.js` — single data-fetching hook. Polls every 60 seconds between 9 AM–9 PM; interval restarts immediately when live mode changes. Detects live games via `hasLiveMatches()` and exposes `isLiveMode`.
- `components/MatchSection.jsx` — splits matches into Live / Upcoming / Recent. Upcoming filter includes SCHEDULED/TIMED games up to 2 hours past kickoff to handle API status lag.
- `components/MatchCard.jsx` — calculates approximate match minute from `utcDate` since the free API tier doesn't return a `minute` field.
- `App.css` — all styles via CSS custom properties defined in `:root`. No CSS framework.

**Vite proxy** (`frontend/vite.config.js`): `/api/*` proxies to `http://127.0.0.1:5001` in dev. In production the frontend uses `VITE_API_URL` env var to call the Render backend directly.

## Deployment

- **Backend**: Render.com, configured via `render.yaml`. Root dir is `backend/`, start command is `gunicorn app:app`. Set `FOOTBALL_DATA_API_KEY` in Render's environment variables dashboard.
- **Frontend**: GitHub Pages via `.github/workflows/deploy.yml`. Triggers on push to `main`. Requires two GitHub repo secrets: `VITE_API_URL` (Render backend URL) and build env `VITE_BASE_PATH=/worldcupdashboard/`.

## Known limitations

- football-data.org free tier has a ~5–10 minute delay on live score updates. Our 60-second refresh is correct; the lag is upstream.
- Render free tier spins down after 15 minutes of inactivity (~30s cold start). Use UptimeRobot to ping `/api/status` every 5 minutes to keep it warm.
