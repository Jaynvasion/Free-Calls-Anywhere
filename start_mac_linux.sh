#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 18+ (brew install node OR https://nodejs.org/)."
  exit 1
fi

# Install deps
echo "== Installing dependencies (safe to rerun) =="
npm install

# Check cloudflared
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found."
  echo "Install: brew install cloudflared    (macOS)"
  echo "Or see: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

echo "== Starting server =="
npm start &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 2
echo "== Starting Cloudflare Tunnel =="
cloudflared tunnel --url http://localhost:3000
