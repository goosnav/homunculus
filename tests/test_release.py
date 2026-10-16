"""Regression checks for save recovery, packaged startup and source distributions."""
import json
import subprocess
import sys
import tempfile
import time
import types
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from urllib.request import urlopen

from homunculus import __version__
from homunculus.__main__ import main
from homunculus.storage import Store

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 1024 * 1024


class SaveRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = Store(Path(self.directory.name))

    def test_nonfinite_and_deeply_nested_saves_are_preserved(self):
        for value in ('NaN', 'Infinity', '-Infinity', '1e999', '[' * 1100 + '0' + ']' * 1100):
            with self.subTest(value=value[:20]):
                raw = '{"version":1,"data":{"saved_at":' + value + '}}'
                self.store.path.write_text(raw)
                self.assertFalse(bool(self.store.load()), 'Malformed save must not become live state')
                self.assertFalse(self.store.path.exists())
                self.assertTrue(any(p.read_text() == raw for p in self.store.path.parent.glob('*.corrupt-*')))

    def test_save_larger_than_one_mebibyte_is_preserved(self):
        raw = json.dumps({'version': 1, 'data': {'extra': 'x' * LIMIT}})
        self.store.path.write_text(raw)
        self.assertFalse(bool(self.store.load()), 'Malformed save must not become live state')
        backups = list(self.store.path.parent.glob('*.corrupt-*'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_text(), raw)

    def test_read_permission_failure_does_not_rename_original(self):
        self.store.save({'name': 'Original'})
        original = self.store.path.read_bytes()
        with patch.object(Path, 'open', side_effect=PermissionError('read denied')):
            with self.assertRaises(PermissionError):
                self.store.load()
        self.assertEqual(self.store.path.read_bytes(), original)
        self.assertEqual(list(self.store.path.parent.glob('*.corrupt-*')), [])

    def test_oversize_write_keeps_last_good_save(self):
        self.store.save({'name': 'Original'})
        with self.assertRaises(ValueError):
            self.store.save({'extra': 'x' * LIMIT})
        self.assertEqual(self.store.load(), {'name': 'Original'})

    def test_successful_save_clears_only_transient_write_warning(self):
        self.store.warning = 'Could not save habitat: storage unavailable'
        self.store.save({'name': 'Recovered'})
        self.assertEqual(self.store.warning, '')
        self.store.warning = 'Previous save could not be read; preserved as habitat.corrupt-1.'
        self.store.save({'name': 'Recovered'})
        self.assertIn('preserved', self.store.warning)


class PackagedStartupTests(unittest.TestCase):
    def run_app(self, frozen, extra=()):
        windows = []
        webview = types.SimpleNamespace(create_window=lambda *args, **kwargs: windows.append((args, kwargs)), start=lambda: None)
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(sys, 'argv', ['Homunculus', '--port', '0', '--data-dir', directory, '--browser-speech', *extra]), \
                patch.object(sys, 'frozen', frozen, create=True), \
                patch.dict(sys.modules, {'webview': webview}), \
                patch('homunculus.__main__.webbrowser.open') as browser, \
                patch('homunculus.__main__.signal.signal', side_effect=lambda sig, handler: handler(sig, None)):
            main()
            return windows, browser.call_count

    def test_frozen_app_opens_native_window_by_default(self):
        windows, browsers = self.run_app(True)
        self.assertEqual(len(windows), 1)
        self.assertEqual(browsers, 0)

    def test_frozen_no_browser_remains_headless(self):
        self.assertEqual(self.run_app(True, ['--no-browser']), ([], 0))

    def test_source_default_opens_browser(self):
        self.assertEqual(self.run_app(False), ([], 1))


class SourceArchiveTests(unittest.TestCase):
    def test_source_zip_launches_and_serves_bundled_assets(self):
        subprocess.run([sys.executable, 'tools/build-zip.py'], cwd=ROOT, check=True, capture_output=True)
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            with zipfile.ZipFile(ROOT / 'dist' / f'homunculus-{__version__}.zip') as archive:
                archive.extractall(target)
                mode = archive.getinfo('homunculus/Start Homunculus.sh').external_attr >> 16
                self.assertTrue(mode & 0o111)
                self.assertFalse(any('/.local/' in name or '/node_modules/' in name for name in archive.namelist()))
            app = target / 'homunculus'
            log = target / 'startup.log'
            with log.open('w') as output:
                process = subprocess.Popen([sys.executable, 'run.py', '--no-browser', '--browser-speech', '--port', '0', '--data-dir', str(target / 'save')], cwd=app, stdout=output, stderr=output)
                try:
                    deadline = time.monotonic() + 30  # Cold CI machines are slow to start Python.
                    while 'Homunculus: http://' not in log.read_text() and process.poll() is None and time.monotonic() < deadline:
                        time.sleep(.05)
                    lines = log.read_text().splitlines()
                    address = next((line.removeprefix('Homunculus: ') for line in lines if line.startswith('Homunculus: http://')), None)
                    self.assertIsNotNone(address, log.read_text())
                    for path in ('/api/bootstrap', '/', '/assets/resident.glb', '/vendor/three.module.js'):
                        with urlopen(address + path, timeout=5) as response:
                            self.assertEqual(response.status, 200)
                            self.assertTrue(response.read())
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=3)


if __name__ == '__main__':
    unittest.main()
