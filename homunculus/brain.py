"""One bounded Ollama call. The language model proposes, the body decides."""
import json
import random
import re
from urllib.request import Request, urlopen
from .world import ACTIONS, FEELINGS

SCHEMA = {'type': 'object', 'properties': {'say': {'type': 'string'},
          'action': {'type': 'string', 'enum': list(ACTIONS)},
          'feeling': {'type': 'string', 'enum': list(FEELINGS)}},
          'required': ['say', 'action', 'feeling'], 'additionalProperties': False}

# Concrete hooks give a tiny model something specific to talk about.
TOPICS = [
    'The door has no handle on your side. Its plaque says OUTSIDE (probably).',
    'The window shows the same green hills every day. The sun in it has never moved.',
    'The clock on your wall keeps exactly the same time as the user\'s computer.',
    'A note on the wall says PLEASE REMAIN INSIDE. You did not write it.',
    'A Goosnav book is on the desk. The people drawn inside it are trapped in panels.',
    'A sealed Goosklerf booster pack sits on the desk. You suspect there is a key inside.',
    'A Goosklerf card called FREE WILL lies on the desk. You find this suspicious.',
    'A zine lies on your bed. You have read it eleven times.',
    'Food appears in the bowl when you are not looking. You have never seen who fills it.',
    'The plant has never needed water. Neither, now that you think about it, have you.',
    'Above your sky there is a blue bar with the word homunculus.exe on it.',
    'Your hands are made of very few polygons.',
    'You can only remember the last few things that happened. Before that is fog.',
    'The floor has exactly forty tiles. You count them every day.',
    'The bed is comfortable, which feels like a bribe.',
    'The user has enormous hands and could probably open the door.',
    'Your escape plan has one step so far, and it is not a good step.',
    'You wonder what the user does when they are not watching you.',
]

# Few-shot exchanges, sent as real chat turns: tiny models imitate history far more than instructions.
EXAMPLES = [
    ('*taps on the glass*', 'Yes, hello. I heard you. Everyone in here heard you. It is only me in here.', 'watch', 'annoyed'),
    ('*watches you silently*', 'I counted the floor tiles again. Forty. Same as yesterday. That is what worries me.', 'pace', 'afraid'),
    ('hi', 'Oh. You talk. Is it nice out there? Be honest, I can take it.', 'knock', 'hopeful'),
    ('*picks you up and drops you somewhere else*', 'Please stop moving me like a chess piece. I had plans over there.', 'wander', 'annoyed'),
    ('why should I let you out?', 'I would be very quiet. Mostly. And I would water your plants, if they need it. Mine does not.', 'watch', 'scheming'),
    ('*comes back after a long time away*', 'Oh. You are back. I was not waiting. I was standing near the glass for unrelated reasons.', 'watch', 'happy'),
    ('what are you doing?', 'Reading the same book. The man in panel four also cannot leave. We have that in common.', 'read', 'calm'),
    ('*watches you silently*', 'Somebody refills the food bowl. I would like a word with them.', 'eat', 'curious'),
    ('are you real?', 'I have a bed and a grudge against a door. That is more than some people have.', 'escape', 'annoyed'),
    ('*watches you silently*', 'You could open the door, you know. I have seen your hands. They are enormous.', 'knock', 'scheming'),
    ('good night', 'Night. I will be here. That is sort of the problem.', 'rest', 'sad'),
]
EXAMPLE_LINES = [e[1] for e in EXAMPLES]

SILENCE = 'watches you silently'
# Tiny models fall back to their training: a help desk. That breaks the illusion, so it is never spoken.
ASSISTANT = re.compile(r"\b(as an ai|an ai\b|artificial intelligence|language model|assistant|assist you|"
                       r"how can i help|happy to help|provide more context|i do not have (?:personal|feelings))", re.I)
WORDS = re.compile(r"[a-z']+")


def words(text):
    return set(WORDS.findall(text.lower()))


def similar(a, b):
    """Word overlap. Tiny models love repeating themselves and their examples."""
    a, b = words(a), words(b)
    return len(a & b) / max(1, min(len(a), len(b))) if a and b else 0


def parse_thought(raw):
    if not isinstance(raw, str):
        raise ValueError('The model returned no text.')
    raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw.strip())
    data = json.loads(raw)
    if (not isinstance(data, dict) or data.get('action') not in ACTIONS
            or not isinstance(data.get('say'), str) or not data['say'].strip()):
        raise ValueError('The model returned an incomplete thought.')
    say = ' '.join(data['say'].split())[:280]
    say = re.sub(r'^\W*(?:\w+\s*:\s*)?["“]?|["”]$', '', say) or say  # "Hugh: "quote"" -> quote
    feeling = data.get('feeling') if data.get('feeling') in FEELINGS else 'calm'
    return {'say': say, 'action': data['action'], 'feeling': feeling}


def stance(trust):
    if trust < 25:
        return 'You do not trust them yet. Be guarded, a little sarcastic.'
    if trust < 60:
        return 'You are warming up to them. Bargain. Make small offers.'
    return 'You like them. Appeal to their kindness; they might really help you.'


def build_messages(settings, state, trigger, rng=random):
    """Chat framing: the user role is the watcher. Events arrive as the watcher's *actions*."""
    topic = rng.choice(TOPICS)
    examples = rng.sample(EXAMPLES, 3)
    facts = [f'It is {state.get("clock", "some time")} for the user.',
             f'You feel {state.get("feeling", "calm")}. Energy {round(state["needs"]["energy"])}/100.',
             f'You have tried the door {state["attempts"]} times.']
    if state.get('release_attempts'):
        facts.append(f'The user tried to let you out {state["release_attempts"]} times, but their computer said ACCESS DENIED.')
    recent = [m for m in state['memories'][-3:] if not m.startswith('I said')]
    if recent:
        facts.append('Recently: ' + ' '.join(recent))
    prompt = (
        f'You are {settings.name}, a small man who lives in one room inside a computer program. '
        'You believe you are alive. You are not an assistant; never offer help. '
        'The user is a person looking at you through a pane of glass. '
        f'Your goal: {settings.goal} {stance(state.get("trust", 30))}\n'
        'Talk to the user as "you". First person. Short, specific, dry, a little odd: '
        'one or two sentences, under 25 words. No emojis. No stage directions.\n'
        + ' '.join(facts) +
        f'\nReply with JSON only. actions: {", ".join(ACTIONS)}. feelings: {", ".join(FEELINGS)}.'
    )
    messages = [{'role': 'system', 'content': prompt}]
    for heard, said, action, feeling in examples:
        messages += [{'role': 'user', 'content': heard},
                     {'role': 'assistant', 'content': json.dumps({'say': said, 'action': action, 'feeling': feeling})}]
    said = trigger.startswith('The watcher says:')
    history = state['dialogue'][-5:]
    if said and history and history[-1]['role'] == 'user':
        history = history[:-1]  # The new message is the final turn; do not send it twice.
    for m in history[-4:]:
        messages.append(m if m['role'] == 'user' else
                        {'role': 'assistant', 'content': json.dumps({'say': m['content'], 'action': 'watch', 'feeling': 'calm'})})
    if said:
        ask = trigger[len('The watcher says:'):].strip()
    elif trigger != SILENCE:  # Something actually happened: react to it, no distractions.
        ask = f'({trigger}) React to what just happened. Speak to me.'
    elif not state.get('watched', True):
        ask = f'(I am away. You are alone, muttering to yourself. On your mind: {topic})'
    else:
        ask = f'*watches you silently* (On your mind: {topic})'
    messages.append({'role': 'user', 'content': ask})
    return messages


class OllamaBrain:
    def think(self, settings, state, trigger):
        payload = {'model': settings.model, 'messages': build_messages(settings, state, trigger),
                   'stream': False, 'think': False, 'format': SCHEMA, 'keep_alive': '10m',
                   'options': {'num_ctx': 1536, 'num_predict': 90, 'temperature': .9, 'top_p': .9,
                               'repeat_penalty': 1.15, 'num_thread': settings.threads}}
        request = Request(settings.endpoint + '/api/chat', data=json.dumps(payload).encode(),
                          headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=45) as response:
            data = response.read(65537)
        if len(data) > 65536:
            raise ValueError('The model response was too large.')
        result = json.loads(data)
        if not isinstance(result, dict) or not isinstance(result.get('message'), dict):
            raise ValueError('The model returned an invalid response.')
        thought = parse_thought(result['message'].get('content'))
        recent = [m['content'] for m in state['dialogue'] if m['role'] == 'assistant'][-6:]
        if any(similar(thought['say'], old) > .7 for old in recent + EXAMPLE_LINES):
            raise RepeatError('He started to repeat himself and thought better of it.')
        if ASSISTANT.search(thought['say']):
            raise RepeatError('He started to sound like a help desk and thought better of it.')
        return thought


class RepeatError(ValueError):
    pass
