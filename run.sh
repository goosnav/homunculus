#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "$0")"
if ! command -v python3 >/dev/null; then
  echo 'Homunculus needs Python 3.10 or newer. Install Python, then open this launcher again.'
  exit 1
fi
exec python3 run.py "$@"
