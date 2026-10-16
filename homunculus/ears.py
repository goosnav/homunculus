"""Optional offline ears: a microphone and a small Vosk model. Enabled with --listen.

Nothing here is required. Without Vosk, a model, or a microphone, the habitat runs exactly as before
and the reason is shown in the status bar. Audio never leaves the computer.
"""
import json
import shutil
import subprocess
import threading
import time

RATE = 16000
NOISE = {'the', 'a', 'uh', 'um', 'huh', 'hm', 'hmm', 'oh', 'and', 'but', 'i', 'it'}


def usable(text):
    """Small recognizers turn room noise into single short words. Only pass on something like speech."""
    words = text.split()
    return bool(words) and not all(w in NOISE for w in words) and (len(words) >= 2 or len(text) >= 5)


class Microphone:
    """16 kHz mono 16-bit audio from sounddevice if installed, else arecord (standard on Raspberry Pi OS)."""
    def __init__(self):
        self.process = self.stream = None
        try:
            import sounddevice
            self.stream = sounddevice.RawInputStream(samplerate=RATE, channels=1, dtype='int16', blocksize=4000)
            self.stream.start()
        except Exception:
            self.stream = None
            command = shutil.which('arecord')
            if not command:
                raise OSError('No microphone access. Install alsa-utils (arecord) or the sounddevice package.')
            self.process = subprocess.Popen([command, '-q', '-f', 'S16_LE', '-r', str(RATE), '-c', '1', '-t', 'raw'],
                                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    def read(self):
        if self.stream:
            data, _ = self.stream.read(4000)
            return bytes(data)
        data = self.process.stdout.read(8000)
        if not data:
            raise OSError('The microphone stopped.')
        return data

    def close(self):
        if self.stream:
            self.stream.close()
        if self.process:
            self.process.kill()
            self.process.wait()


class Ears:
    def __init__(self, runtime, model_dir, microphone=Microphone, echo_tail=.7):
        self.runtime, self.model_dir, self.microphone = runtime, model_dir, microphone
        self.echo_tail = echo_tail  # Seconds to stay deaf after he stops talking (room echo, speaker tail).
        self.status = 'starting'
        self.stopped = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True, name='ears')

    def start(self):
        self.thread.start()
        return self

    def _run(self):
        try:
            from vosk import KaldiRecognizer, Model, SetLogLevel
        except ImportError:
            self.status = 'Listening needs Vosk: python -m pip install vosk'
            return
        if not (self.model_dir / 'am').is_dir() and not (self.model_dir / 'conf').is_dir():
            self.status = 'Listening needs a speech model: python tools/setup-ears.py'
            return
        SetLogLevel(-1)
        try:
            recognizer = KaldiRecognizer(Model(str(self.model_dir)), RATE)
            mic = self.microphone()
        except Exception as exc:
            self.status = f'Microphone unavailable: {str(exc)[:120]}'
            return
        self.status = 'listening'
        quiet_after = 0.
        try:
            while not self.stopped.is_set():
                data = mic.read()
                if self.runtime.speaker.speaking:  # Never listen to himself.
                    quiet_after = time.monotonic() + self.echo_tail
                    recognizer.Reset()
                    continue
                if time.monotonic() < quiet_after:
                    recognizer.Reset()
                    continue
                if recognizer.AcceptWaveform(data):
                    text = json.loads(recognizer.Result()).get('text', '').strip()
                    if usable(text):
                        try:
                            self.runtime.hear(text)
                        except (OverflowError, ValueError):
                            pass  # Still thinking about the last thing; let this one go.
        except Exception as exc:
            self.status = f'Microphone stopped: {str(exc)[:120]}'
        finally:
            mic.close()

    def close(self):
        self.stopped.set()

