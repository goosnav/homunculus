import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from homunculus.runtime import Runtime
from homunculus.server import make_server

class SlowBrain:
    def __init__(self):
        self.entered = threading.Event()
        self.release = threading.Event()
    def think(self, *args):
        self.entered.set()
        self.release.wait(3)
        return {'say': 'The glass is quite solid.', 'action': 'watch'}

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.runtime = Runtime(Path(self.directory.name), host_speech=False)
        self.server = make_server(self.runtime, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.runtime.close(); self.directory.cleanup()
    def request(self, path, data=None, token=True, origin=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['X-Habitat-Token'] = self.server.token
        if origin: headers['Origin'] = origin
        req = Request(self.url + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:
            with urlopen(req) as response: return response.status, json.load(response)
        except HTTPError as exc:
            return exc.code, exc.read().decode()
    def test_input_requires_token_and_same_origin(self):
        self.assertEqual(self.request('/api/interact', {'kind': 'tap'}, token=False)[0], 403)
        self.assertEqual(self.request('/api/interact', {'kind': 'tap'}, origin='https://evil.invalid')[0], 403)
        self.assertEqual(self.request('/api/interact', {'kind': 'tap'}, origin=self.url)[0], 200)
    def test_invalid_input_has_no_side_effect(self):
        before = self.runtime.sim.snapshot()['position']
        self.assertEqual(self.request('/api/interact', {'kind': 'move', 'x': float('nan'), 'z': 1})[0], 400)
        self.assertEqual(self.runtime.sim.snapshot()['position'], before)
        self.assertEqual(self.request('/api/settings', {'name': []})[0], 400)
        self.assertEqual(self.request('/api/interact', [1])[0], 400)
    def test_kiosk_blocks_settings_and_interaction(self):
        self.runtime.kiosk = True
        self.assertEqual(self.request('/api/settings', {'name': 'Bob'})[0], 403)
        self.assertEqual(self.request('/api/interact', {'kind': 'message', 'text': 'Hi'})[0], 403)
    def test_kiosk_still_hears_the_microphone(self):
        self.runtime.kiosk = True
        self.runtime.hear('hello in there')
        self.assertEqual(self.runtime.sim.dialogue[-1], {'role': 'user', 'content': 'hello in there'})
        self.assertEqual(self.request('/api/pull', {'model': 'qwen2.5:0.5b'})[0], 403)

    def test_visible_polls_mean_he_is_watched(self):
        self.runtime.start()
        self.request('/api/state?visible=1')
        deadline = time.monotonic() + 1
        while not self.runtime.sim.watched and time.monotonic() < deadline: time.sleep(.02)
        self.assertTrue(self.runtime.sim.watched)
        self.request('/api/state?visible=0')
        self.assertTrue(self.runtime.snapshot()['simulation']['watched'])  # Grace period, not instant.

    def test_model_list_reports_unreachable_brain(self):
        self.runtime.settings = self.runtime.settings.update({'endpoint': 'http://127.0.0.1:9'})
        status, data = self.request('/api/models')
        self.assertEqual((status, data), (200, {'reachable': False, 'models': []}))

    def test_private_files_not_served(self):
        self.assertEqual(self.request('/../homunculus/config.py')[0], 404)
        self.assertEqual(self.request('/%2e%2e/homunculus/config.py')[0], 404)
    def test_settings_persist(self):
        self.assertEqual(self.request('/api/settings', {'name': 'Bert', 'configured': True})[0], 200)
        self.assertEqual(self.runtime.store.load()['settings']['name'], 'Bert')
    def test_bounded_queue_and_body_during_inference(self):
        brain = SlowBrain()
        self.runtime.brain = brain
        self.runtime.start()
        self.runtime.interact('message', {'text': 'First'})
        self.assertTrue(brain.entered.wait(1))
        before = self.runtime.sim.age
        self.runtime.interact('message', {'text': 'Second'})
        self.runtime.interact('message', {'text': 'Third'})
        self.assertEqual(self.request('/api/interact', {'kind': 'message', 'text': 'Fourth'})[0], 429)
        time.sleep(.25)
        self.assertGreater(self.runtime.sim.age, before)
        self.runtime.configure({'name': 'New personality'})
        brain.release.set()
        deadline = time.monotonic() + 2
        while self.runtime.busy and time.monotonic() < deadline: time.sleep(.01)
        self.assertEqual(self.runtime.sim.utterance['id'], 0)
    def test_sound_toggle_keeps_pending_reply(self):
        brain = SlowBrain()
        self.runtime.brain = brain
        self.runtime.start()
        self.runtime.interact('message', {'text': 'Can you hear me?'})
        self.assertTrue(brain.entered.wait(1))
        self.runtime.configure({'tts': False, 'subtitles': False, 'profile': 'tiny'})
        brain.release.set()
        deadline = time.monotonic() + 2
        while self.runtime.busy and time.monotonic() < deadline: time.sleep(.01)
        self.assertEqual(self.runtime.sim.utterance['text'], 'The glass is quite solid.')

    def test_truncated_http_reply_does_not_kill_brain(self):
        from http.client import IncompleteRead
        class Truncated:
            def think(self, *args): raise IncompleteRead(b'partial', 100)
        self.runtime.brain = Truncated()
        self.runtime.start()
        self.runtime.interact('message', {'text': 'Hello'})
        deadline = time.monotonic() + 1
        while self.runtime.status != 'offline' and time.monotonic() < deadline: time.sleep(.01)
        self.assertEqual(self.runtime.status, 'offline')
        self.assertTrue(self.runtime.threads[1].is_alive())

    def test_failed_inference_leaves_body_alive(self):
        class Offline:
            def think(self, *args): raise OSError('offline')
        self.runtime.brain = Offline()
        self.runtime.start()
        self.runtime.interact('message', {'text': 'Hello'})
        deadline = time.monotonic() + 2
        while self.runtime.status != 'offline' and time.monotonic() < deadline: time.sleep(.01)
        self.assertEqual(self.runtime.status, 'offline')
        self.assertEqual(self.runtime.sim.utterance['source'], 'none')
        self.assertTrue(self.runtime.threads[0].is_alive())

if __name__ == '__main__': unittest.main()
