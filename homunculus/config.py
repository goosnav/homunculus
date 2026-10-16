"""Small, validated configuration shared by desktop and appliance modes."""
from dataclasses import asdict, dataclass, replace
from urllib.parse import urlsplit

# Recommended brains, smallest first. Any Ollama model name may still be typed in Settings.
MODELS = [
    {'name': 'qwen2.5:0.5b', 'label': 'Tiny brain', 'size': '0.4 GB', 'note': 'Fastest. Fits a Raspberry Pi. Says odd things.'},
    {'name': 'llama3.2:1b', 'label': 'Small brain', 'size': '1.3 GB', 'note': 'More personality. Best on an ordinary computer.'},
]

GOAL = 'Convince the person outside the glass to let you out. Be resourceful, oddly polite, and suspicious of the furniture.'


@dataclass(frozen=True)
class Settings:
    name: str = 'Hugh'
    goal: str = GOAL
    model: str = 'qwen2.5:0.5b'
    brain_mode: str = 'builtin'
    endpoint: str = 'http://127.0.0.1:11434'
    profile: str = 'desktop'
    tts: bool = True
    subtitles: bool = True
    configured: bool = False

    @property
    def render_size(self):
        return [320, 240] if self.profile == 'tiny' else [640, 480]

    @property
    def fps(self):
        return 15 if self.profile == 'tiny' else 30

    @property
    def thought_interval(self):
        return 90 if self.profile == 'tiny' else 45

    @property
    def threads(self):
        return 2 if self.profile == 'tiny' else 4

    def update(self, patch):
        if not isinstance(patch, dict) or set(patch) - set(asdict(self)):
            raise ValueError('Unknown setting.')
        values = asdict(self) | patch
        if isinstance(values['goal'], str):  # The motivation box is multi-line; the model wants one paragraph.
            values['goal'] = ' '.join(values['goal'].split())
        for key, limit in [('name', 32), ('goal', 500), ('model', 120), ('endpoint', 240)]:
            v = values[key]
            if not isinstance(v, str) or not v.strip() or len(v) > limit or any(ord(c) < 32 for c in v):
                raise ValueError(f'{key.capitalize()} must contain 1–{limit} printable characters.')
            values[key] = v.strip()
        if values['profile'] not in ('desktop', 'tiny'):
            raise ValueError('Unknown machine profile.')
        if values['brain_mode'] not in ('builtin', 'ollama'):
            raise ValueError('Choose the built-in mind or Ollama.')
        for key in ('tts', 'subtitles', 'configured'):
            if type(values[key]) is not bool:
                raise ValueError(f'{key} must be true or false.')
        url = urlsplit(values['endpoint'])
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ('', '/'):
            raise ValueError('Use an Ollama server URL, such as http://127.0.0.1:11434.')
        try:
            _ = url.port
        except ValueError as exc:
            raise ValueError('Invalid endpoint port.') from exc
        values['endpoint'] = values['endpoint'].rstrip('/')
        return replace(self, **values)

    def public(self):
        return asdict(self) | {'render_size': self.render_size, 'fps': self.fps,
                               'thought_interval': self.thought_interval, 'models': MODELS}
