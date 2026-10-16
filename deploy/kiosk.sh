#!/usr/bin/env bash
# Raspberry Pi appliance: run from a logged-in desktop session. Ctrl+C stops everything.
# Configure name, motivation, brain and voice in normal mode first; the appliance itself has no settings.
# If the offline ears are set up (python3 tools/setup-ears.py), he listens to the microphone.
set -e
cd -- "$(dirname -- "$0")/.."
browser=$(command -v chromium || command -v chromium-browser || true)
[ -n "$browser" ] || { echo 'Install Chromium first: sudo apt install chromium'; exit 1; }
port=${HOMUNCULUS_PORT:-8765}
extra=()
if python3 -c 'import vosk' 2>/dev/null; then extra+=(--listen); else echo 'No offline ears (optional): python3 tools/setup-ears.py'; fi
python3 run.py --kiosk --no-browser --port "$port" "${extra[@]}" &
habitat_pid=$!
cleanup() { kill "$habitat_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for attempt in $(seq 1 30); do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:$port/api/state', timeout=1)" 2>/dev/null; then break; fi
  if ! kill -0 "$habitat_pid" 2>/dev/null; then echo 'Habitat failed to start.'; exit 1; fi
  sleep 1
done
"$browser" --kiosk --app="http://127.0.0.1:$port" --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars
