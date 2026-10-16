"""Player-visible runtime recovery and authored story sequencing."""
import io
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from http.client import IncompleteRead

from homunculus.config import Settings
from homunculus.runtime import Runtime
from homunculus.storage import Store


class RuntimeUpgradeTests(unittest.TestCase):
    def runtime(self, brain=None, saved=None):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        if saved is not None:
            Store(Path(directory.name)).save(saved)
        runtime = Runtime(Path(directory.name), brain=brain, host_speech=False)
        self.addCleanup(runtime.close)
        return runtime

    def wait_for(self, condition):
        deadline = time.monotonic() + 2
        while not condition() and time.monotonic() < deadline:
            time.sleep(.01)
        self.assertTrue(condition())

    def test_new_player_gets_immediate_reply_without_network(self):
        runtime = self.runtime()
        with patch('homunculus.runtime.urlopen', side_effect=AssertionError('network is forbidden')):
            runtime.interact('message', {'text': 'hello'})
        self.assertEqual(runtime.settings.public().get('brain_mode'), 'builtin')
        self.assertEqual(runtime.sim.utterance['source'], 'script')
        self.assertTrue(runtime.sim.utterance['text'])
        self.assertTrue(runtime.jobs.empty())
        self.assertEqual(runtime.status, 'builtin')

    def test_old_configured_save_keeps_ollama_choice(self):
        runtime = self.runtime(saved={'settings': {'name': 'Otto', 'configured': True}})
        self.assertEqual(runtime.settings.public().get('brain_mode'), 'ollama')
        self.assertEqual(runtime.settings.name, 'Otto')

    def test_explicit_builtin_save_is_not_migrated(self):
        runtime = self.runtime(saved={'settings': {'name': 'Otto', 'configured': True, 'brain_mode': 'builtin'}})
        self.assertEqual(runtime.settings.name, 'Otto')
        self.assertEqual(runtime.settings.public().get('brain_mode'), 'builtin')

    def test_brain_mode_and_multiline_goal_validation(self):
        self.assertEqual(Settings().update({'goal': 'Find a way\nout.\tBe kind.'}).goal, 'Find a way out. Be kind.')
        for mode in ('cloud', [], None):
            with self.assertRaises(ValueError):
                Settings().update({'brain_mode': mode})

    def test_old_enormous_timestamp_does_not_prevent_starting(self):
        runtime = self.runtime(saved={'last_seen_at': 10**400})
        self.assertEqual(runtime.away_on_boot, 0)

    def test_queued_messages_cannot_see_future_memories_or_dialogue(self):
        seen = []
        class Recorder:
            def think(self, settings, state, trigger):
                seen.append((trigger, state))
                return {'say': 'I heard you.', 'action': 'watch'}
        runtime = self.runtime(brain=Recorder())
        runtime.interact('message', {'text': 'First secret'})
        runtime.interact('message', {'text': 'Future secret'})
        runtime.start()
        self.wait_for(lambda: len(seen) == 2)
        self.assertNotIn('Future secret', json.dumps(seen[0]))
        self.assertNotIn('First secret', json.dumps(seen[0][1]['dialogue']))
        self.assertIn('First secret', json.dumps(seen[1][1]['dialogue']))

    def test_rejected_save_reports_warning_and_can_recover(self):
        runtime = self.runtime()
        with patch.object(runtime.store, 'save', side_effect=ValueError('Save is too large')):
            runtime.save()
        self.assertIn('Could not save habitat', runtime.store.warning)
        runtime.save()
        self.assertEqual(runtime.store.warning, '')

    def test_invalid_model_list_is_unreachable(self):
        runtime = self.runtime()
        for raw in (b'{"models":null}', b'[]', b'{"models":{}}', b'x' * 1_000_001):
            with self.subTest(raw=raw[:30]), patch('homunculus.runtime.urlopen', return_value=io.BytesIO(raw)):
                self.assertEqual(runtime.installed_models(), {'reachable': False, 'models': []})

    def test_model_list_filters_invalid_entries(self):
        runtime = self.runtime()
        with patch('homunculus.runtime.urlopen', return_value=io.BytesIO(b'{"models":[{"name":"small:1b"},null,{"name":12}]}')):
            self.assertEqual(runtime.installed_models(), {'reachable': True, 'models': ['small:1b']})

    def test_incomplete_or_malformed_pull_can_be_retried(self):
        runtime = self.runtime()
        for raw in (b'', b'[]\n', b'{"status":"pulling"}\n', b'x' * 65537):
            with self.subTest(raw=raw[:30]), patch('homunculus.runtime.urlopen', return_value=io.BytesIO(raw)):
                runtime.download = {'model': 'tiny', 'status': 'downloading', 'progress': 0}
                runtime._pull('http://127.0.0.1:11434', 'tiny')
                self.assertEqual(runtime.download['status'], 'failed')

    def test_truncated_pull_fails_without_killing_worker(self):
        runtime = self.runtime()
        runtime.download = {'model': 'tiny', 'status': 'downloading', 'progress': 0}
        with patch('homunculus.runtime.urlopen', side_effect=IncompleteRead(b'partial', 50)):
            runtime._pull('http://127.0.0.1:11434', 'tiny')
        self.assertEqual(runtime.download['status'], 'failed')

    def test_pull_requires_success_and_clamps_progress(self):
        runtime = self.runtime()
        runtime.download = {'model': 'tiny', 'status': 'downloading', 'progress': 0}
        raw = b'{"status":"pulling","total":10,"completed":30}\n{"status":"success"}\n'
        with patch('homunculus.runtime.urlopen', return_value=io.BytesIO(raw)):
            runtime._pull('http://127.0.0.1:11434', 'tiny')
        self.assertEqual(runtime.download['status'], 'done')
        self.assertEqual(runtime.download['progress'], 1)


if __name__ == '__main__':
    unittest.main()
