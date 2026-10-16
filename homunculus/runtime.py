"""Owns lifecycle, canonical state, background inference, and atomic saves."""
import json
import queue
import threading
import time
from dataclasses import asdict
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from .brain import SILENCE, OllamaBrain
from .config import Settings
from .script import ScriptedMind
from .simulation import Simulation, number
from .speech import Speaker
from .storage import Store

MIND = ('name', 'goal', 'model', 'endpoint', 'brain_mode')  # Changing these invalidates pending thoughts.
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
            previous_settings = saved.get('settings', {})
            if isinstance(previous_settings, dict) and previous_settings.get('configured') is True and 'brain_mode' not in previous_settings:
                previous_settings = previous_settings | {'brain_mode': 'ollama'}
            self.settings = Settings().update(previous_settings)
        except (ValueError, TypeError):
            self.settings = Settings()
            self.store.warning = 'Saved settings were invalid; using defaults.'
        self.sim = Simulation(saved=saved.get('simulation'))
        # Absence is measured from the last time somebody actually watched, not the last autosave.
        last_wall = number(saved.get('last_seen_at', saved.get('saved_at')), None)
        self.away_on_boot = min(365 * 86400., max(0., time.time() - last_wall)) if last_wall is not None else 0.
        self.last_seen_wall = last_wall if last_wall is not None else time.time()
        self.kiosk = kiosk
        if kiosk:
            self.settings = self.settings.update({'profile': 'tiny', 'configured': True})
        self.brain = brain or OllamaBrain()
        if brain is not None:
            self.settings = self.settings.update({'brain_mode': 'ollama'})
        self.script = ScriptedMind()  # His simple mind, for whenever the language model cannot answer.
        self.speaker = Speaker(enabled=self.settings.tts and host_speech)
        if not host_speech:
            self.speaker.command = None
        self.jobs = queue.Queue(maxsize=2)
        self.stopped = threading.Event()
        self.generation = 0
        self.busy = False
        self.status = 'builtin' if self.settings.brain_mode == 'builtin' else 'waiting'
        self.error = ''
        self.last_latency = None
        self.last_seen = 0.
        self.last_trigger = self.sim.event  # Nothing has happened yet this session.
        self.download = None
        self.ears = None
        self.heard = {'id': 0, 'text': ''}
        self.next_thought = time.monotonic() + 4
        self.threads = []
        self.last_spoken_id = 0

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
                    'download': dict(self.download) if self.download else None},
                    'voice': {'host': self.speaker.available, 'error': self.speaker.error},
                    'ears': self.ears.status if self.ears else None, 'heard': self.heard,
                    'warning': self.store.warning}

    def save(self):
        with self.lock:
            try:
                self.store.save({'settings': asdict(self.settings), 'simulation': self.sim.snapshot(),
                                 'saved_at': time.time(), 'last_seen_at': self.last_seen_wall})
            except (OSError, ValueError) as exc:
                detail = getattr(exc, 'strerror', None) or str(exc) or 'storage unavailable'
                self.store.warning = f'Could not save habitat: {detail}'

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
                self._discard_thoughts()
                self.next_thought = time.monotonic() + 1
                self.error = ''
                self.status = 'builtin' if settings.brain_mode == 'builtin' else 'waiting'
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
            if kind == 'message' and self.settings.brain_mode == 'ollama' and self.jobs.full():
                raise OverflowError('Give him a moment to catch up.')
            # Capture the world before a message. Later queued input must not leak
            # into either conversation history, memories, or the current event.
            state = self.sim.snapshot() | {'clock': clock(), 'dialogue_before_trigger': True} if kind == 'message' else None
            self.sim.interact(kind, payload)
            self._speak_latest()
            trigger = f'The watcher says: {payload["text"].strip()}' if kind == 'message' else self.sim.event
            if self.settings.brain_mode == 'builtin':
                self._say(self.script.think(self.settings, state or self.sim.snapshot(), trigger), 'script')
                self.status, self.error = 'builtin', ''
                self.last_trigger = self.sim.event
                self.next_thought = time.monotonic() + self.settings.thought_interval
                return
            if kind == 'message':
                self.jobs.put_nowait((self.generation, trigger, state))
                self.last_trigger = self.sim.event
            elif kind in ('tap', 'move', 'close', 'release') and not self.busy and self.jobs.empty():
                self.jobs.put_nowait((self.generation, self.sim.event, None))
                self.last_trigger = self.sim.event
            else:
                return
            self.next_thought = time.monotonic() + self.settings.thought_interval

    def _discard_thoughts(self):
        self.generation += 1
        while True:
            try:
                self.jobs.get_nowait()
            except queue.Empty:
                break

    def _tick(self):
        previous, last_save = time.monotonic(), time.monotonic()
        while not self.stopped.wait(.1):
            now = time.monotonic()
            with self.lock:
                watched = self.kiosk or now - self.last_seen < PRESENCE_TIMEOUT
                was_watched = self.sim.watched
                self.sim.observe(watched, self.away_on_boot)
                if watched:
                    self.last_seen_wall = time.time()
                if watched and not was_watched:
                    self.away_on_boot = 0.
                    if self.sim.event != self.last_trigger:
                        self.next_thought = min(self.next_thought, now + 1.5)  # Greet a returning watcher.
                previous_utterance = self.sim.utterance['id']
                self.sim.tick(now - previous)
                if self.sim.utterance['id'] != previous_utterance:
                    self._speak_latest()
                    self.last_trigger = self.sim.event
                    self.next_thought = max(self.next_thought, now + 20)
                if self.settings.configured and now >= self.next_thought and not self.busy and self.jobs.empty():
                    trigger = (self.sim.event if self.sim.event != self.last_trigger
                               else self.sim.notices.pop(0) if self.sim.notices else SILENCE)
                    self.last_trigger = self.sim.event
                    self.jobs.put_nowait((self.generation, trigger, None))
                    # Alone, he mutters less often; nobody is listening and the CPU has better things to do.
                    self.next_thought = now + self.settings.thought_interval * (1 if watched else 3)
            previous = now
            if now - last_save >= 15:
                self.save()
                last_save = now

    def _think(self):
        while not self.stopped.is_set():
            try:
                generation, trigger, captured_state = self.jobs.get(timeout=.25)
            except queue.Empty:
                continue
            with self.lock:
                if generation != self.generation:
                    continue
                self.busy = True
                self.status = 'thinking'
                settings = self.settings
                state = captured_state if captured_state is not None else self.sim.snapshot() | {'clock': clock()}
            started = time.monotonic()
            try:
                builtin = settings.brain_mode == 'builtin'
                thought = (self.script if builtin else self.brain).think(settings, state, trigger)
                with self.lock:
                    if generation == self.generation and not self.stopped.is_set():
                        self._say(thought, 'script' if builtin else 'llm')
                        self.status, self.error = ('builtin' if builtin else 'connected'), ''
                        self.last_latency = round(time.monotonic() - started, 2)
            except HTTPError as exc:
                self._failure(generation, f'His full mind is not installed yet ({settings.model}). Download it in File → Properties.'
                              if exc.code == 404 else f'Ollama returned HTTP {exc.code}.', state, trigger)
            except (URLError, TimeoutError, OSError):
                self._failure(generation, 'Running on his simple built-in mind. Start Ollama for his full personality.',
                              state, trigger)
            except (ValueError, KeyError, TypeError):
                with self.lock:  # Repeats, help-desk lines, garbled JSON: the brain is fine; he lost the thought.
                    if generation == self.generation:
                        self.status, self.error = 'connected', ''
                        self.next_thought = min(self.next_thought, time.monotonic() + 8)
            except Exception:  # A truncated or odd HTTP reply must never kill the brain thread.
                self._failure(generation, 'The brain connection dropped mid-thought. It will try again.', state, trigger)
            finally:
                with self.lock:
                    self.busy = False

    def _say(self, thought, source):
        self.sim.apply_thought(dict(thought, source=source))
        self._speak_latest()

    def _speak_latest(self):
        utterance = self.sim.utterance
        if utterance['id'] <= self.last_spoken_id:
            return
        self.last_spoken_id = utterance['id']
        if self.settings.tts and utterance['text']:
            self.speaker.say(utterance['text'])

    def _failure(self, generation, message, state, trigger):
        """No language model: say so in the status bar, and let the simple mind answer so he is never mute."""
        with self.lock:
            if generation == self.generation and not self.stopped.is_set():
                self.status, self.error = 'offline', message
                self.next_thought = time.monotonic() + self.settings.thought_interval
                self._say(self.script.think(self.settings, state, trigger), 'script')

    # Brain management: what is installed, and fetching a model without a terminal.
    def installed_models(self):
        try:
            with urlopen(self.settings.endpoint + '/api/tags', timeout=3) as response:
                raw = response.read(1_000_001)
            if len(raw) > 1_000_000:
                raise ValueError('Model list is too large.')
            data = json.loads(raw)
            if not isinstance(data, dict) or not isinstance(data.get('models'), list):
                raise ValueError('Invalid model list.')
            return {'reachable': True, 'models': sorted(m['name'] for m in data['models']
                                                         if isinstance(m, dict) and isinstance(m.get('name'), str))}
        except (OSError, ValueError, TypeError, HTTPException, RecursionError):
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
            success = False
            with urlopen(request, timeout=60) as response:
                while True:
                    line = response.readline(65537)
                    if not line:
                        break
                    if len(line) > 65536:
                        raise ValueError('Download response is too large.')
                    if self.stopped.is_set():
                        raise ValueError('Download stopped.')
                    event = json.loads(line)
                    if not isinstance(event, dict):
                        raise ValueError('Invalid download response.')
                    if event.get('error'):
                        raise ValueError(str(event['error'])[:200])
                    with self.lock:
                        total, done = event.get('total'), event.get('completed')
                        if type(total) is int and type(done) is int and total > 0:
                            self.download['progress'] = round(min(total, max(0, done)) / total, 3)
                        self.download['detail'] = str(event.get('status', ''))[:80]
                    if event.get('status') == 'success':
                        success = True
                        break
            if not success:
                raise ValueError('Download ended before Ollama confirmed installation. Try again.')
            with self.lock:
                self.download.update(status='done', progress=1., detail='Installed')
                if self.settings.model == model:
                    self.status, self.error = 'waiting', ''
                    self.next_thought = time.monotonic() + 1
        except (OSError, ValueError, TypeError, HTTPException, RecursionError) as exc:
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
