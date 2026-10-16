#!/usr/bin/env bash
# Start Homunculus on Linux or macOS. Works headless too:
#   ./Start\ Homunculus.sh --no-browser --port 8766
#   ./Start\ Homunculus.sh --kiosk --listen        (Raspberry Pi appliance)
# Homunculus only ever listens on this computer (127.0.0.1); --local is accepted for habit and changes nothing.
set -e
cd -- "$(dirname -- "$0")"
args=()
for a in "$@"; do [ "$a" = "--local" ] || args+=("$a"); done
for py in python3 python; do
  if command -v "$py" >/dev/null && "$py" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
    exec "$py" run.py "${args[@]}"
  fi
done
if command -v uv >/dev/null; then exec uv run --no-project --python 3.12 run.py "${args[@]}"; fi
echo 'Homunculus needs Python 3.10 or newer: https://www.python.org/downloads/'
exit 1
