# FIFA World Cup 2026 Dashboard

A live match dashboard for the 2026 FIFA World Cup. Shows upcoming fixtures, live scores, recent results, and group stage standings — refreshed automatically every 3 hours between 9 AM and 9 PM.

Built with a Flask backend and a React frontend.

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- A free API key from [football-data.org](https://www.football-data.org/client/register) (takes ~30 seconds to sign up)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/AuziMan/worldcupdashboard
cd WorldCupDashboard
```

### 2. Add your API key

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and replace `your_api_key_here` with your key from football-data.org:

```
FOOTBALL_DATA_API_KEY=your_api_key_here
```

### 3. Install backend dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Running the app

From the project root:

```bash
./start.sh
```

This clears any existing processes on the required ports, starts the Flask backend on `:5001` and the React frontend on `:5173`, then opens the dashboard at:

```
http://localhost:5173
```

Press `Ctrl+C` to stop both servers.

---

## Project structure

```
WorldCupDashboard/
├── backend/
│   ├── app.py              # Flask API with 3-hour cache
│   ├── requirements.txt
│   ├── .env                # Your API key (never committed)
│   └── .env.example        # Template — copy this to .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Root component and tab layout
│   │   ├── components/
│   │   │   ├── Header.jsx       # Title bar with refresh button
│   │   │   ├── MatchCard.jsx    # Individual match tile
│   │   │   ├── MatchSection.jsx # Live / upcoming / results layout
│   │   │   └── Standings.jsx    # Group stage tables
│   │   └── hooks/
│   │       └── useWorldCupData.js  # Data fetching and auto-refresh
│   └── vite.config.js      # Proxies /api/* to Flask backend
└── start.sh                # One-command startup script
```

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/matches` | All tournament matches |
| `GET /api/standings` | Group stage standings |
| `GET /api/teams` | Team info and crests |
| `GET /api/status` | Cache freshness info |
| `POST /api/refresh` | Force-clear the cache |

Data is cached for 3 hours. The frontend auto-refreshes on the same interval, but only between 9 AM and 9 PM.

---

## Data source

[football-data.org](https://www.football-data.org) — free tier, no credit card required.
