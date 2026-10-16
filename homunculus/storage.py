"""Atomic, versioned local persistence. Never destroy a broken save."""
import json
import math
import os
import sys
import time
from pathlib import Path

MAX_SAVE_BYTES = 1024 * 1024


def data_directory():
    if sys.platform == 'win32':
        return Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'Homunculus'
    if sys.platform == 'darwin':
        return Path.home() / 'Library/Application Support/Homunculus'
    return Path(os.environ.get('XDG_DATA_HOME', Path.home() / '.local/share')) / 'homunculus'


def reject_constant(name):
    raise ValueError(f'Non-standard JSON value {name}')


def finite_float(text):
    value = float(text)
    if not math.isfinite(value):
        raise ValueError('Save contains a nonfinite number')
    return value


def check_depth(value, depth=0):
    if depth > 64:
        raise ValueError('Save is nested too deeply')
    if isinstance(value, dict):
        value = value.values()
    elif not isinstance(value, list):
        return
    for child in value:
        check_depth(child, depth + 1)


class Store:
    def __init__(self, directory):
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / 'habitat.json'
        self.warning = ''

    def load(self):
        try:
            with self.path.open('rb') as stream:
                raw = stream.read(MAX_SAVE_BYTES + 1)
        except FileNotFoundError:
            return {}
        # Permission and other I/O failures must propagate: starting with defaults
        # would let the next autosave overwrite a habitat we could not read.
        try:
            if len(raw) > MAX_SAVE_BYTES:
                raise ValueError('Save is too large')
            data = json.loads(raw.decode('utf-8'), parse_constant=reject_constant, parse_float=finite_float)
            check_depth(data)
            if not isinstance(data, dict) or data.get('version') != 1 or not isinstance(data.get('data'), dict):
                raise ValueError('Unsupported save format')
            return data['data']
        except (ValueError, RecursionError):
            backup = self.path.with_suffix(f'.corrupt-{time.time_ns()}')
            self.path.replace(backup)
            self.warning = f'Previous save could not be read; preserved as {backup.name}.'
            return {}

    def save(self, data):
        check_depth(data)
        body = json.dumps({'version': 1, 'data': data}, ensure_ascii=False, allow_nan=False).encode('utf-8')
        if len(body) > MAX_SAVE_BYTES:
            raise ValueError('Save is too large')
        temporary = self.path.with_suffix('.tmp')
        with temporary.open('wb') as f:
            f.write(body)
            f.flush()
            os.fsync(f.fileno())
        temporary.replace(self.path)
        if self.warning.startswith('Could not save habitat:'):
            self.warning = ''
