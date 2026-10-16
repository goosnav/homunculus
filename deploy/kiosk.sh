#!/usr/bin/env bash
# Run from a logged-in Raspberry Pi desktop. Ctrl+C stops both processes.
set -e
cd -- "$(dirname -- "$0")/.."
command -v chromium >/dev/null || { echo 'Install Chromium first: sudo apt install chromium'; exit 1; }
python3 run.py --kiosk --no-browser &
habitat_pid=$!
cleanup() { kill "$habitat_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for attempt in $(seq 1 30); do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/api/state', timeout=1)" 2>/dev/null; then break; fi
  if ! kill -0 "$habitat_pid" 2>/dev/null; then echo 'Habitat failed to start.'; exit 1; fi
  sleep 1
done
chromium --kiosk --app=http://127.0.0.1:8765 --autoplay-policy=no-user-gesture-required
