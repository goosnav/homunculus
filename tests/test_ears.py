import json
import sys
import tempfile
import time
import types
import unittest
from pathlib import Path
from homunculus.ears import Ears, usable
from homunculus.runtime import Runtime


class FakeRecognizer:
    def __init__(self, *args): self.pending = b''
    def AcceptWaveform(self, data): self.pending = data; return True
    def Result(self): return json.dumps({'text': self.pending.decode()})
    def Reset(self): self.pending = b''


class EarsTests(unittest.TestCase):
    def setUp(self):
        sys.modules['vosk'] = types.SimpleNamespace(KaldiRecognizer=FakeRecognizer, Model=lambda path: None, SetLogLevel=lambda level: None)
        self.directory = tempfile.TemporaryDirectory()
        (Path(self.directory.name) / 'model' / 'am').mkdir(parents=True)
        self.runtime = Runtime(Path(self.directory.name), kiosk=True, host_speech=False)

    def tearDown(self):
        del sys.modules['vosk']
        self.runtime.close(); self.directory.cleanup()

    def listen(self, chunks, speaking_for):
        runtime, ears_box = self.runtime, {}
        class Mic:
            def __init__(self): self.chunks = list(chunks)
            def read(self):
                if not self.chunks:
                    ears_box['ears'].stopped.set(); return b''
                runtime.speaker.speaking_now = len(self.chunks) > len(chunks) - speaking_for
                return self.chunks.pop(0)
            def close(self): pass
        original = type(runtime.speaker).speaking
        type(runtime.speaker).speaking = property(lambda s: getattr(s, 'speaking_now', False))
        try:
            ears = ears_box['ears'] = Ears(runtime, Path(self.directory.name) / 'model', microphone=Mic, echo_tail=0)
            ears._run()
        finally:
            type(runtime.speaker).speaking = original
        return ears

    def test_hears_speech_in_appliance_mode_but_never_himself(self):
        self.listen([b'i am the voice of hugh', b'let me out please'], speaking_for=1)
        said = [m['content'] for m in self.runtime.sim.dialogue if m['role'] == 'user']
        self.assertEqual(said, ['let me out please'])
        self.assertEqual(self.runtime.snapshot()['heard']['text'], 'let me out please')

    def test_missing_model_is_reported_not_fatal(self):
        ears = Ears(self.runtime, Path(self.directory.name) / 'nothing')
        ears._run()
        self.assertIn('setup-ears', ears.status)

    def test_noise_words_are_ignored(self):
        self.assertFalse(usable('the'))
        self.assertFalse(usable('uh huh'))
        self.assertTrue(usable('hello there'))
        self.assertTrue(usable('hello'))


if __name__ == '__main__':
    unittest.main()
