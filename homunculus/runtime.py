"""Owns lifecycle, canonical state, background inference, and atomic saves."""
import json
import queue
import threading
import time
from dataclasses import asdict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from .brain import SILENCE, OllamaBrain, RepeatError
from .config import Settings
from .simulation import Simulation
from .speech import Speaker
from .storage import Store

MIND = ('name', 'goal', 'model', 'endpoint')  # Changing these invalidates pending thoughts.
PRESENCE_TIMEOUT = 6  # Seconds without a visible poll before he decides nobody is watching.


def clock(now=None):
    t = time.localtime(now)
    part = ('night' if t.tm_hour < 5 else 'morning' if t.tm_hour < 12 else 'afternoon' if t.tm_hour < 17
            else 'evening' if t.tm_hour < 22 else 'night')
    return f'{time.strftime("%A", t)} {part}, {time.strftime("%I:%M %p", t).lstrip("0").lower()}'


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
        last_wall = saved.get('saved_at')
        self.away_on_boot = max(0., time.time() - last_wall) if type(last_wall) in (int, float) else 0.
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
        self.last_seen = 0.
        self.last_trigger = ''
        self.download = None
        self.ears = None
        self.heard = {'id': 0, 'text': ''}
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
                    'error': self.error, 'queued': self.jobs.qsize(), 'latency': self.last_latency,
                    'download': self.download},
                    'voice': {'host': self.speaker.available, 'error': self.speaker.error},
                    'ears': self.ears.status if self.ears else None, 'heard': self.heard,
                    'warning': self.store.warning}

    def save(self):
        with self.lock:
            try:
                self.store.save({'settings': asdict(self.settings), 'simulation': self.sim.snapshot(),
                                 'saved_at': time.time()})
            except OSError as exc:
                self.store.warning = f'Could not save habitat: {exc.strerror or "storage unavailable"}'

    def seen(self, visible):
        """Called by every renderer poll. A visible window means somebody is (probably) watching."""
        if visible:
            with self.lock:
                self.last_seen = time.monotonic()

    def configure(self, patch):
        with self.lock:
            if self.kiosk:
                raise PermissionError('Appliance mode has no interactive settings.')
            settings = self.settings.update(patch)
            mind_changed = any(getattr(settings, k) != getattr(self.settings, k) for k in MIND)
            self.settings = settings
            if mind_changed:
                self.generation += 1  # Discard thoughts generated under an old personality/model.
                while True:
                    try:
                        self.jobs.get_nowait()
                    except queue.Empty:
                        break
                self.next_thought = time.monotonic() + 1
                self.error = ''
                self.status = 'waiting'
            self.speaker.set_enabled(settings.tts)
            self.save()

    def interact(self, kind, payload):
        if self.kiosk:
            raise PermissionError('This habitat is in observation-only mode.')
        self._interact(kind, payload)

    def hear(self, text):
        """Speech from a microphone. Allowed in appliance mode; that is its only input."""
        self._interact('message', {'text': text[:400]})
        with self.lock:
            self.heard = {'id': self.heard['id'] + 1, 'text': text[:400]}

    def _interact(self, kind, payload):
        with self.lock:
            if kind == 'message' and self.jobs.full():
                raise OverflowError('Give him a moment to catch up.')
            self.sim.interact(kind, payload)
            if kind == 'message':
                self.jobs.put_nowait((self.generation, f'The watcher says: {payload["text"].strip()}'))
                self.last_trigger = self.sim.event
            elif kind in ('tap', 'move', 'close', 'release') and not self.busy and self.jobs.empty():
                self.jobs.put_nowait((self.generation, self.sim.event))
                self.last_trigger = self.sim.event
            else:
                return
            self.next_thought = time.monotonic() + self.settings.thought_interval

    def _tick(self):
        previous, last_save = time.monotonic(), time.monotonic()
        while not self.stopped.wait(.1):
            now = time.monotonic()
            with self.lock:
                watched = self.kiosk or now - self.last_seen < PRESENCE_TIMEOUT
                was_watched = self.sim.watched
                self.sim.observe(watched, self.away_on_boot)
                if watched and not was_watched:
                    self.away_on_boot = 0.
                    if self.sim.event != self.last_trigger:
                        self.next_thought = min(self.next_thought, now + 1.5)  # Greet a returning watcher.
                self.sim.tick(now - previous)
                if self.settings.configured and now >= self.next_thought and not self.busy and self.jobs.empty():
                    trigger = self.sim.event if self.sim.event != self.last_trigger else SILENCE
                    self.last_trigger = self.sim.event
                    self.jobs.put_nowait((self.generation, trigger))
                    # Alone, he mutters less often; nobody is listening and the CPU has better things to do.
                    self.next_thought = now + self.settings.thought_interval * (1 if watched else 3)
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
                settings = self.settings
                state = self.sim.snapshot() | {'clock': clock()}
            started = time.monotonic()
            try:
                thought = self.brain.think(settings, state, trigger)
                with self.lock:
                    if generation == self.generation and not self.stopped.is_set():
                        self.sim.apply_thought(thought)
                        self.status, self.error = 'connected', ''
                        self.last_latency = round(time.monotonic() - started, 2)
                        if settings.tts:
                            self.speaker.say(thought['say'])
            except HTTPError as exc:
                self._failure(generation, f'This brain is not installed yet: {settings.model}. Download it in Settings.'
                              if exc.code == 404 else f'Ollama returned HTTP {exc.code}.')
            except (URLError, TimeoutError, OSError):
                self._failure(generation, 'Cannot reach the brain. Start Ollama and check the address in Settings.')
            except RepeatError:
                with self.lock:  # Not a failure: he simply thought better of saying it. Try again soon.
                    self.status = 'connected'
                    self.next_thought = min(self.next_thought, time.monotonic() + 8)
            except (ValueError, KeyError, TypeError):
                self._failure(generation, 'The model lost its train of thought. It will try again.', retry=10)
            except Exception:  # A truncated or odd HTTP reply must never kill the brain thread.
                self._failure(generation, 'The brain connection dropped mid-thought. It will try again.')
            finally:
                with self.lock:
                    self.busy = False

    def _failure(self, generation, message, retry=None):
        with self.lock:
            if generation == self.generation:
                self.status, self.error = 'offline', message
                self.next_thought = time.monotonic() + (retry or self.settings.thought_interval)

    # Brain management: what is installed, and fetching a model without a terminal.
    def installed_models(self):
        try:
            with urlopen(self.settings.endpoint + '/api/tags', timeout=3) as response:
                data = json.loads(response.read(1_000_000))
            return {'reachable': True, 'models': sorted(m['name'] for m in data.get('models', [])
                                                         if isinstance(m, dict) and isinstance(m.get('name'), str))}
        except (OSError, ValueError, AttributeError):
            return {'reachable': False, 'models': []}

    def pull(self, model):
        with self.lock:
            if self.kiosk:
                raise PermissionError('Appliance mode cannot download models.')
            Settings().update({'model': model})  # Validate the name with the normal rules.
            if self.download and self.download['status'] == 'downloading':
                raise OverflowError('A brain is already downloading.')
            self.download = {'model': model, 'status': 'downloading', 'progress': 0., 'detail': 'Starting'}
            endpoint = self.settings.endpoint
        threading.Thread(target=self._pull, args=(endpoint, model), daemon=True, name='pull').start()

    def _pull(self, endpoint, model):
        request = Request(endpoint + '/api/pull', data=json.dumps({'model': model, 'stream': True}).encode(),
                          headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with urlopen(request, timeout=60) as response:
                for line in response:
                    if self.stopped.is_set():
                        return
                    event = json.loads(line)
                    if event.get('error'):
                        raise ValueError(str(event['error'])[:200])
                    with self.lock:
                        total, done = event.get('total'), event.get('completed')
                        if type(total) is int and type(done) is int and total > 0:
                            self.download['progress'] = round(done / total, 3)
                        self.download['detail'] = str(event.get('status', ''))[:80]
            with self.lock:
                self.download.update(status='done', progress=1., detail='Installed')
                if self.settings.model == model:
                    self.status, self.error = 'waiting', ''
                    self.next_thought = time.monotonic() + 1
        except (OSError, ValueError) as exc:
            with self.lock:
                self.download.update(status='failed', detail=str(exc)[:200] or 'Download failed. Is Ollama running?')

    def close(self):
        self.stopped.set()
        if self.ears:
            self.ears.close()
        self.save()
        self.speaker.close()
        for thread in self.threads:
            thread.join(timeout=1)
