#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need_node_major=18
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install Node ${need_node_major}+ from https://nodejs.org/"
  exit 1
fi

major="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$major" -lt "$need_node_major" ]; then
  echo "Error: Node.js must be ${need_node_major}+ (found: $(node -v))"
  exit 1
fi

echo "Using Node $(node -v)"

echo "Installing dependencies (root workspaces)..."
npm install

echo "Installing client workspace dependencies..."
npm install -w client

echo "Installing server workspace dependencies..."
npm install -w server

copy_env() {
  local dest="$1"
  local example="$2"
  if [ ! -f "$example" ]; then
    echo "Warning: missing $example — skip"
    return
  fi
  if [ -f "$dest" ]; then
    echo "Keeping existing $dest"
  else
    cp "$example" "$dest"
    echo "Created $dest from $(basename "$example")"
  fi
}

copy_env "$ROOT/client/.env" "$ROOT/client/.env.example"
copy_env "$ROOT/server/.env" "$ROOT/server/.env.example"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Add your GROK_API_KEY to server/.env"
echo "  (Get a key: https://console.x.ai — free tier available)"
echo ""
echo "Run 'npm run dev' to start client + API"
echo "  → App:  http://localhost:5173"
echo "  → API:  http://localhost:3001/api/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
