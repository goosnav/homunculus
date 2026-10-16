"""Owns lifecycle, canonical state, background inference, and atomic saves."""
import json
import queue
import threading
import time
from dataclasses import asdict
from urllib.error import HTTPError, URLError
from .brain import OllamaBrain
from .config import Settings
from .simulation import Simulation
from .speech import Speaker
from .storage import Store


class Runtime:
    def __init__(self, directory, kiosk=False, brain=None, host_speech=True):
        self.lock = threading.RLock()
        self.store = Store(directory)
        saved = self.store.load()
        try:
            self.settings = Settings().update(saved.get('settings', {}))
        except (ValueError, TypeError):
            self.settings = Settings()
            self.store.warning = 'Saved settings were invalid; using defaults.'
        self.sim = Simulation(saved=saved.get('simulation'))
        self.kiosk = kiosk
        if kiosk:
            self.settings = self.settings.update({'profile': 'tiny', 'configured': True})
        self.brain = brain or OllamaBrain()
        self.speaker = Speaker(enabled=self.settings.tts and host_speech)
        if not host_speech:
            self.speaker.command = None
        self.jobs = queue.Queue(maxsize=2)
        self.stopped = threading.Event()
        self.generation = 0
        self.busy = False
        self.status = 'waiting'
        self.error = ''
        self.last_latency = None
        self.next_thought = time.monotonic() + 4
        self.threads = []

    def start(self):
        for target, name in ((self._tick, 'body'), (self._think, 'brain')):
            thread = threading.Thread(target=target, daemon=True, name=name)
            self.threads.append(thread)
            thread.start()

    def snapshot(self):
        with self.lock:
            return {'simulation': self.sim.snapshot(), 'settings': self.settings.public(),
                    'kiosk': self.kiosk, 'brain': {'status': self.status, 'busy': self.busy,
                    'error': self.error, 'queued': self.jobs.qsize(), 'latency': self.last_latency},
                    'voice': {'host': self.speaker.available, 'error': self.speaker.error},
                    'warning': self.store.warning}

    def save(self):
        with self.lock:
            try:
                self.store.save({'settings': asdict(self.settings), 'simulation': self.sim.snapshot()})
            except OSError as exc:
                self.store.warning = f'Could not save habitat: {exc.strerror or "storage unavailable"}'

    def configure(self, patch):
        with self.lock:
            if self.kiosk:
                raise PermissionError('Appliance mode has no interactive settings.')
            settings = self.settings.update(patch)
            self.settings = settings
            self.generation += 1  # Discard thoughts generated under an old personality/model.
            while True:
                try:
                    self.jobs.get_nowait()
                except queue.Empty:
                    break
            self.speaker.set_enabled(settings.tts)
            self.next_thought = time.monotonic() + 1
            self.error = ''
            self.status = 'waiting'
            self.save()

    def interact(self, kind, payload):
        with self.lock:
            if self.kiosk:
                raise PermissionError('This habitat is in observation-only mode.')
            if kind == 'message' and self.jobs.full():
                raise OverflowError('Give him a moment to catch up.')
            self.sim.interact(kind, payload)
            if kind == 'message':
                self.jobs.put_nowait((self.generation, f'The person outside says: {payload["text"].strip()}'))
                self.next_thought = time.monotonic() + self.settings.thought_interval
            elif kind in ('tap', 'move') and not self.busy and self.jobs.empty():
                self.jobs.put_nowait((self.generation, self.sim.event))
                self.next_thought = time.monotonic() + self.settings.thought_interval

    def _tick(self):
        previous, last_save = time.monotonic(), time.monotonic()
        while not self.stopped.wait(.1):
            now = time.monotonic()
            with self.lock:
                self.sim.tick(now - previous)
                if self.settings.configured and now >= self.next_thought and not self.busy and self.jobs.empty():
                    self.jobs.put_nowait((self.generation, self.sim.event + ' Say one new thought about your situation.'))
                    self.next_thought = now + self.settings.thought_interval
            previous = now
            if now - last_save >= 15:
                self.save()
                last_save = now

    def _think(self):
        while not self.stopped.is_set():
            try:
                generation, trigger = self.jobs.get(timeout=.25)
            except queue.Empty:
                continue
            with self.lock:
                if generation != self.generation:
                    continue
                self.busy = True
                self.status = 'thinking'
                settings, state = self.settings, self.sim.snapshot()
            started = time.monotonic()
            try:
                thought = self.brain.think(settings, state, trigger)
                with self.lock:
                    if generation == self.generation and not self.stopped.is_set():
                        self.sim.apply_thought(thought)
                        self.status, self.error = 'connected', ''
                        self.last_latency = round(time.monotonic() - started, 2)
                        self.speaker.say(thought['say'])
            except HTTPError as exc:
                self._failure(generation, f'Model not installed. Run: ollama pull {settings.model}' if exc.code == 404 else f'Ollama returned HTTP {exc.code}.')
            except (URLError, TimeoutError, OSError):
                self._failure(generation, 'Cannot reach the brain. Start Ollama and check the address in Settings.')
            except (ValueError, KeyError, TypeError):
                self._failure(generation, 'The model lost its train of thought. It will try again.')
            finally:
                with self.lock:
                    self.busy = False

    def _failure(self, generation, message):
        with self.lock:
            if generation == self.generation:
                self.status, self.error = 'offline', message
                self.next_thought = time.monotonic() + self.settings.thought_interval

    def close(self):
        self.stopped.set()
        self.save()
        self.speaker.close()
        for thread in self.threads:
            thread.join(timeout=1)
