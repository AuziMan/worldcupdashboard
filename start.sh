#!/bin/bash
set -e

# Local development. There is no backend anymore — we fetch the World Cup data
# once into frontend/public/data/ (using your API key from scripts/.env) and
# then run the Vite dev server. In production this fetch happens in CI instead.

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Fetching latest World Cup data..."
python3 "$ROOT/scripts/fetch_data.py"

echo "Starting Vite dev server on :5173..."
cd "$ROOT/frontend"
npm run dev
