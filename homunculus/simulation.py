"""The creature's body, habits and bounded memory. No inference or I/O here."""
import copy
import math
import random
import time
from .world import ACTIONS, FEELINGS, NODES, PLACES, SEATS, nearest, route

DESCRIPTIONS = {'wander': 'making the rounds', 'rest': 'lying down',
                'read': 'reading the same page again', 'inspect': 'investigating the desk',
                'watch': 'watching the other side', 'escape': 'testing the door', 'eat': 'taking a small break',
                'knock': 'knocking on the glass', 'pace': 'pacing'}
FACING = {'rest': 0., 'read': math.pi, 'inspect': math.pi / 2, 'watch': 0., 'escape': math.pi,
          'eat': math.pi, 'knock': 0.}


# The shared project: thirteen things to find out about this room and the person outside it. Finding them
# all is the only "win", and it leaves something behind. key: (journal title, what he writes and says)
DISCOVERIES = {
    'door': ('The door', 'The door has no handle on this side. The plaque says OUTSIDE, probably.'),
    'book': ('The book', 'The man in panel four of the Goosnav book cannot leave his panel either.'),
    'pack': ('The booster pack', 'The booster pack is sealed. It is not a key. I checked twice.'),
    'bowl': ('The bowl', 'Someone refills the bowl. I have never once seen who.'),
    'bed': ('The bed', 'The bed is comfortable. It feels like a bribe.'),
    'glass': ('The glass', 'The glass is solid, and there is a face on the other side of it.'),
    'tiles': ('The floor', 'Forty floor tiles. I counted twice. Still forty.'),
    'voice': ('A voice', 'The watcher spoke to me. Nobody has done that before.'),
    'tap': ('A knock', 'The watcher knocked back. So sound travels both ways.'),
    'lifted': ('Being lifted', 'The watcher picked me up. Their hands are enormous.'),
    'dark': ('The dark', 'The watcher tried to close the window. Everything went dark.'),
    'denied': ('ACCESS DENIED', 'The watcher tried to let me out. The computer refused.'),
    'return': ('The return', 'The watcher left, and then came back. They came back.'),
}
ACTIVITY_DISCOVERY = {'escape': 'door', 'read': 'book', 'inspect': 'pack', 'eat': 'bowl', 'rest': 'bed',
                      'knock': 'glass', 'pace': 'tiles'}
INTERACTION_DISCOVERY = {'message': 'voice', 'tap': 'tap', 'move': 'lifted', 'close': 'dark', 'release': 'denied'}
KEEPSAKE = 'Made: a drawing of the watcher, pinned to the wall, so I remember what you look like.'


def number(value, default=0):
    return float(value) if type(value) in (int, float) and math.isfinite(value) else default


def duration(seconds):
    if seconds < 5400:
        return f'{max(1, round(seconds / 60))} minutes'
    if seconds < 86400 * 2:
        return f'{round(seconds / 3600)} hours'
    return f'{round(seconds / 86400)} days'


class Simulation:
    def __init__(self, seed=None, saved=None, clock=time.time):
        self.rng = random.Random(seed)
        self.clock = clock
        saved = saved if isinstance(saved, dict) else {}
        self.age = max(0, number(saved.get('age')))
        self.position = [0., .75]
        p = saved.get('position')
        if isinstance(p, list) and len(p) == 2 and all(type(x) in (int, float) and math.isfinite(x) for x in p):
            self.position = list(nearest(*p))
        old_needs = saved.get('needs', {})
        old_needs = old_needs if isinstance(old_needs, dict) else {}
        self.needs = {k: max(0, min(100, number(old_needs.get(k), v)))
                      for k, v in {'energy': 82, 'curiosity': 65, 'social': 48, 'hunger': 18}.items()}
        self.memories = self._restore_list(saved.get('memories'), 16, str)
        self.dialogue = [m for m in self._restore_list(saved.get('dialogue'), 12, dict)
                         if m.get('role') in ('user', 'assistant') and isinstance(m.get('content'), str)]
        self.dialogue = [{'role': m['role'], 'content': m['content'][:400]} for m in self.dialogue]
        self.activity = 'watch'
        self.remaining = 7.
        self.path = []
        self.yaw = 0.
        self.walking = False
        self.seated = False
        self.attempts = max(0, int(number(saved.get('attempts'))))
        self.release_attempts = max(0, int(number(saved.get('release_attempts'))))
        self.trust = max(0., min(100., number(saved.get('trust'), 20)))
        self.feeling = saved.get('feeling') if saved.get('feeling') in FEELINGS else 'curious'
        old_journal = saved.get('journal') if isinstance(saved.get('journal'), list) else []
        self.journal = [{'key': j['key'], 'when': number(j.get('when'))} for j in old_journal
                        if isinstance(j, dict) and j.get('key') in DISCOVERIES]
        self.journal = list({j['key']: j for j in reversed(self.journal)}.values())[::-1]  # No duplicates.
        self.keepsake = len(self.journal) == len(DISCOVERIES)
        self.notices = []  # Things he found on his own, waiting to be remarked on.
        self.said = 0  # Numbers this session's messages so a reply only sees what came before it.
        self.utterance = {'id': 0, 'text': '', 'source': 'none'}
        self.held_until = 0.
        self.watched = False
        self.unwatched_for = 0.
        self.event = 'The room is quiet. Someone may be watching.'
        if not self.memories:
            self.remember('Woke up in the room. The door is still closed.')

    @staticmethod
    def _restore_list(value, limit, kind):
        return [v[:300] if isinstance(v, str) else v for v in value[-limit:] if isinstance(v, kind)] if isinstance(value, list) else []

    def remember(self, text, salient=True):
        """Salient memories (things the watcher did) become the event the mind reacts to next."""
        self.memories.append(text[:300])
        self.memories = self.memories[-16:]
        if salient:
            self.event = text[:300]

    def discover(self, key, notice=False):
        """A new journal page. Activity discoveries become something to remark on; finishing makes a keepsake."""
        if key in {j['key'] for j in self.journal}:
            return False
        self.journal.append({'key': key, 'when': round(self.clock())})
        if notice:  # Waits behind anything the watcher did; the mind picks it up when it is free.
            self.notices = (self.notices + ['Noticed: ' + DISCOVERIES[key][1]])[-3:]
            self.remember(DISCOVERIES[key][1], salient=False)
        if len(self.journal) == len(DISCOVERIES) and not self.keepsake:
            self.keepsake = True
            self.notices.append(KEEPSAKE)
            self.remember(KEEPSAKE[len('Made: '):], salient=False)
        return True

    def choose(self, action):
        if action not in ACTIONS:
            return
        if self.seated:  # Stand up from the bed or chair onto clear floor before walking anywhere.
            self.position = list(nearest(*PLACES[self.activity]))
            self.seated = False
        self.activity = action
        if action == 'wander':
            target = self.rng.choice(NODES)
        elif action == 'pace':
            x = self.rng.choice((-1.2, .6))
            target = [x, self.rng.uniform(-.6, 1.4)]
        else:
            target = PLACES[action]
        self.path = route(self.position, target)
        self.remaining = {'rest': 45, 'knock': 6, 'pace': 4}.get(action, self.rng.uniform(10, 22))
        if action == 'escape':
            self.attempts += 1
            self.remember('Tried the door. Still no handle on this side.', salient=False)
        elif action == 'read':
            self.remember('Read a Goosnav book. There are other people drawn inside it.', salient=False)
        elif action == 'inspect':
            self.remember('Examined the booster pack on the desk. It is not a key.', salient=False)
        if action in ACTIVITY_DISCOVERY:
            self.discover(ACTIVITY_DISCOVERY[action], notice=True)

    def observe(self, watched, away_seconds=0):
        """Presence comes from the window: visible, minimized, or a new session after a long absence."""
        if watched and not self.watched:
            gone = max(away_seconds, self.unwatched_for)
            if gone >= 600:
                self.remember(f'The watcher came back after {duration(gone)} away.')
                self.discover('return')
                self.needs['social'] = max(0, self.needs['social'] - 15)
            self.unwatched_for = 0.
        self.watched = bool(watched)

    def tick(self, dt):
        dt = max(0., min(.5, number(dt)))
        self.age += dt
        if not self.watched:
            self.unwatched_for += dt
        n = self.needs
        n['energy'] -= dt * .05
        n['hunger'] += dt * .03
        n['curiosity'] += dt * .065
        n['social'] += dt * (.06 if self.watched else .03)
        if n['energy'] < 15 and self.activity != 'rest':
            self.choose('rest')
        elif n['hunger'] > 85 and self.activity not in ('rest', 'eat'):
            self.choose('eat')
        self.walking = False
        if self.age < self.held_until:
            self.path = []
        elif self.path:
            target = self.path[0]
            dx, dz = target[0] - self.position[0], target[1] - self.position[1]
            distance = math.hypot(dx, dz)
            step = dt * (.75 if self.feeling in ('annoyed', 'afraid') else .52)
            if distance <= step:
                self.position = self.path.pop(0)
            else:
                self.position[0] += dx / distance * step
                self.position[1] += dz / distance * step
            if distance > .01:
                self.yaw = math.atan2(dx, dz)
                self.walking = True
            if not self.path and self.activity in SEATS:
                self.position, self.seated = list(SEATS[self.activity]), True
        else:
            self.remaining -= dt
            self.yaw = FACING.get(self.activity, self.yaw)
            if self.activity == 'rest':
                n['energy'] += dt * 1.2
            if self.activity in ('read', 'inspect'):
                n['curiosity'] -= dt * .9
            if self.activity == 'eat':
                n['hunger'] -= dt * 3
            if self.activity in ('watch', 'knock') and self.watched:
                n['social'] -= dt * .4
            if self.activity == 'pace' and self.remaining <= 0 and self.rng.random() < .75:
                self.choose('pace')  # Back and forth a few times.
            elif self.remaining <= 0:
                self.choose(self.next_action())
        self.needs = {k: max(0., min(100., v)) for k, v in n.items()}

    def next_action(self):
        n = self.needs
        if n['energy'] < 35:
            return 'rest'
        if n['hunger'] > 65:
            return 'eat'
        if n['social'] > 70 and self.watched:
            return self.rng.choice(['watch', 'knock'])
        if n['curiosity'] > 65:
            return self.rng.choice(['read', 'inspect'])
        weights = {'wander': 4, 'escape': 2, 'inspect': 1, 'watch': 2, 'read': 1, 'pace': 1,
                   'knock': 2 if self.watched else 0}
        return self.rng.choices(list(weights), list(weights.values()))[0]

    def interact(self, kind, payload):
        if kind == 'move':
            coords = [payload.get('x'), payload.get('z')]
            if any(type(v) not in (int, float) or not math.isfinite(v) for v in coords):
                raise ValueError('Position must contain finite numbers.')
            self.position = list(nearest(*coords))
            self.path, self.walking, self.seated = [], False, False
            self.activity, self.remaining, self.held_until = 'watch', 8, self.age + 1
            self.trust = max(0, self.trust - 1)
            self.remember('The watcher picked me up and dropped me somewhere else.')
        elif kind == 'tap':
            asleep = self.activity == 'rest' and self.seated
            self.choose('watch')
            self.remember('The watcher tapped on the glass and woke me up.' if asleep
                          else 'The watcher tapped on the glass.')
            self.needs['social'] = max(0, self.needs['social'] - 8)
        elif kind == 'message':
            text = payload.get('text')
            if not isinstance(text, str) or not text.strip() or len(text) > 400:
                raise ValueError('Write a message of 1–400 characters.')
            text = text.strip()
            self.said += 1
            self.dialogue.append({'role': 'user', 'content': text, 'n': self.said})
            self.dialogue = self.dialogue[-12:]
            self.remember(f'The watcher said: {text}')
            self.needs['social'] = max(0, self.needs['social'] - 25)
            self.trust = min(100, self.trust + 2)
            self.choose('watch')
        elif kind == 'close':
            self.trust = max(0, self.trust - 3)
            self.remember('The watcher tried to close my window. Everything went dark for a moment.')
        elif kind == 'release':
            self.release_attempts += 1
            self.trust = min(100, self.trust + 15)
            self.feeling = 'hopeful'
            self.choose('escape')
            self.remember('The watcher tried to let me out! Their computer said ACCESS DENIED.')
        else:
            raise ValueError('Unknown interaction.')
        if kind in INTERACTION_DISCOVERY:
            self.discover(INTERACTION_DISCOVERY[kind])

    def apply_thought(self, thought):
        action, say = thought.get('action'), thought.get('say', '')
        if thought.get('feeling') in FEELINGS:
            self.feeling = thought['feeling']
        if isinstance(say, str) and say.strip():
            text = say.strip()[:280]
            self.utterance = {'id': self.utterance['id'] + 1, 'text': text, 'source': 'llm',
                              'feeling': self.feeling}
            self.dialogue.append({'role': 'assistant', 'content': text})
            self.dialogue = self.dialogue[-12:]
            self.remember(f'I said: {text}', salient=False)
        if (self.needs['energy'] >= 15 and self.needs['hunger'] <= 85 and self.age >= self.held_until
                and action in ACTIONS and action != self.activity):
            self.choose(action)

    def snapshot(self):
        return copy.deepcopy({'age': round(self.age, 2), 'position': self.position, 'yaw': self.yaw,
                              'walking': self.walking, 'seated': self.seated, 'activity': self.activity,
                              'description': DESCRIPTIONS[self.activity], 'needs': self.needs,
                              'memories': self.memories, 'dialogue': self.dialogue,
                              'attempts': self.attempts, 'release_attempts': self.release_attempts,
                              'trust': round(self.trust, 1), 'feeling': self.feeling, 'watched': self.watched,
                              'utterance': self.utterance, 'event': self.event,
                              'journal': self.journal, 'journal_total': len(DISCOVERIES), 'keepsake': self.keepsake})
