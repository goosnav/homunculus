"""The creature's body, habits and bounded memory. No inference or I/O here."""
import copy
import math
import random
from .world import ACTIONS, NODES, PLACES, nearest, route, walkable

DESCRIPTIONS = {'wander': 'making the rounds', 'rest': 'resting his eyes',
                'read': 'reading the same page again', 'inspect': 'investigating the desk',
                'watch': 'watching the other side', 'escape': 'testing the door', 'eat': 'taking a small break'}


def number(value, default=0):
    return float(value) if type(value) in (int, float) and math.isfinite(value) else default


class Simulation:
    def __init__(self, seed=None, saved=None):
        self.rng = random.Random(seed)
        saved = saved if isinstance(saved, dict) else {}
        self.age = max(0, number(saved.get('age')))
        self.position = [0., .8]
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
        self.attempts = max(0, int(number(saved.get('attempts'))))
        self.utterance = {'id': 0, 'text': '', 'source': 'none'}
        self.held_until = 0.
        self.event = 'The room is quiet. Someone may be watching.'
        if not self.memories:
            self.remember('Woke up in the room. The door is still closed.')
        else:
            self.event = self.memories[-1]

    @staticmethod
    def _restore_list(value, limit, kind):
        return [v[:300] if isinstance(v, str) else v for v in value[-limit:] if isinstance(v, kind)] if isinstance(value, list) else []

    def remember(self, text):
        self.memories.append(text[:300])
        self.memories = self.memories[-16:]
        self.event = text[:300]

    def choose(self, action):
        if action not in ACTIONS:
            return
        self.activity = action
        target = self.rng.choice(NODES) if action == 'wander' else PLACES[action]
        self.path = route(self.position, target)
        self.remaining = self.rng.uniform(10, 22) if action != 'rest' else 38
        if action == 'escape':
            self.attempts += 1
            self.remember('Tried the door. Still no handle on this side.')
        elif action == 'read':
            self.remember('Read a Goosnav book. There are other people drawn inside it.')
        elif action == 'inspect':
            self.remember('Examined the booster pack on the desk. It is not a key.')

    def tick(self, dt):
        dt = max(0., min(.5, number(dt)))
        self.age += dt
        n = self.needs
        n['energy'] -= dt * .055
        n['hunger'] += dt * .035
        n['curiosity'] += dt * .065
        n['social'] += dt * .045
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
            step = dt * .52
            if distance <= step:
                self.position = self.path.pop(0)
            else:
                self.position[0] += dx / distance * step
                self.position[1] += dz / distance * step
            if distance > .01:
                self.yaw = math.atan2(dx, dz)
                self.walking = True
        else:
            self.remaining -= dt
            if self.activity == 'rest':
                n['energy'] += dt * 1.5
                self.yaw = -math.pi / 2
            if self.activity in ('read', 'inspect'):
                n['curiosity'] -= dt * .9
                self.yaw = math.pi
            if self.activity == 'eat':
                n['hunger'] -= dt * 3
            if self.activity == 'watch':
                self.yaw = 0
            if self.activity == 'escape':
                self.yaw = math.pi
            if self.remaining <= 0:
                if n['energy'] < 35:
                    action = 'rest'
                elif n['hunger'] > 65:
                    action = 'eat'
                elif n['curiosity'] > 65:
                    action = self.rng.choice(['read', 'inspect'])
                elif n['social'] > 70:
                    action = 'watch'
                    n['social'] -= 8
                else:
                    action = self.rng.choices(['wander', 'escape', 'inspect', 'watch', 'read'], [4, 2, 1, 2, 1])[0]
                self.choose(action)
        self.needs = {k: max(0., min(100., v)) for k, v in n.items()}

    def interact(self, kind, payload):
        if kind == 'move':
            coords = [payload.get('x'), payload.get('z')]
            if any(type(v) not in (int, float) or not math.isfinite(v) for v in coords):
                raise ValueError('Position must contain finite numbers.')
            self.position = list(nearest(*coords))
            self.path, self.walking = [], False
            self.activity, self.remaining, self.held_until = 'watch', 8, self.age + 1
            self.remember('The person outside picked me up and put me somewhere else.')
        elif kind == 'tap':
            self.choose('watch')
            self.remember('Someone tapped on the glass.')
            self.needs['social'] = max(0, self.needs['social'] - 8)
        elif kind == 'message':
            text = payload.get('text')
            if not isinstance(text, str) or not text.strip() or len(text) > 400:
                raise ValueError('Write a message of 1–400 characters.')
            text = text.strip()
            self.dialogue.append({'role': 'user', 'content': text})
            self.dialogue = self.dialogue[-12:]
            self.remember(f'The person outside said: {text}')
            self.needs['social'] = max(0, self.needs['social'] - 25)
            self.choose('watch')
        else:
            raise ValueError('Unknown interaction.')

    def apply_thought(self, thought):
        action, say = thought.get('action'), thought.get('say', '')
        if isinstance(say, str) and say.strip():
            text = say.strip()[:280]
            self.utterance = {'id': self.utterance['id'] + 1, 'text': text, 'source': 'llm'}
            self.dialogue.append({'role': 'assistant', 'content': text})
            self.dialogue = self.dialogue[-12:]
            self.remember(f'I said: {text}')
        if self.needs['energy'] >= 15 and self.needs['hunger'] <= 85 and self.age >= self.held_until and action in ACTIONS:
            self.choose(action)

    def snapshot(self):
        return copy.deepcopy({'age': round(self.age, 2), 'position': self.position, 'yaw': self.yaw,
                              'walking': self.walking, 'activity': self.activity,
                              'description': DESCRIPTIONS[self.activity], 'needs': self.needs,
                              'memories': self.memories, 'dialogue': self.dialogue,
                              'attempts': self.attempts, 'utterance': self.utterance, 'event': self.event})
