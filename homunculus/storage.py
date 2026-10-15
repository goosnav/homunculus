"""Atomic, versioned local persistence. Never destroy a broken save."""
import json
import os
import sys
import time
from pathlib import Path


def data_directory():
    if sys.platform == 'win32':
        return Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'Homunculus'
    if sys.platform == 'darwin':
        return Path.home() / 'Library/Application Support/Homunculus'
    return Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local/share')) / 'homunculus'


class Store:
    def __init__(self, directory):
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / 'habitat.json'
        self.warning = ''

    def load(self):
        if not self.path.exists():
            return {}
        try:
            data = json.loads(self.path.read_text(encoding='utf-8'))
            if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('data'), dict):
                raise ValueError('Unsupported save format')
            return data['data']
        except (ValueError, OSError) as exc:
            backup = self.path.with_suffix(f'.corrupt-{time.time_ns()}')
            self.path.replace(backup)
            self.warning = f'Previous save could not be read; preserved as {backup.name}.'
            return {}

    def save(self, data):
        temporary = self.path.with_suffix('.tmp')
        with temporary.open('w', encoding='utf-8') as f:
            json.dump({'version': 1, 'data': data}, f, ensure_ascii=False, allow_nan=False)
            f.flush()
            os.fsync(f.fileno())
        temporary.replace(self.path)
