"""One bounded Ollama call. The language model proposes, the body decides."""
import json
import re
from urllib.request import Request, urlopen
from .world import ACTIONS

SCHEMA = {'type': 'object', 'properties': {'say': {'type': 'string'},
          'action': {'type': 'string', 'enum': list(ACTIONS)}},
          'required': ['say', 'action'], 'additionalProperties': False}


def parse_thought(raw):
    if not isinstance(raw, str):
        raise ValueError('The model returned no text.')
    raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw.strip())
    data = json.loads(raw)
    if (not isinstance(data, dict) or data.get('action') not in ACTIONS
            or not isinstance(data.get('say'), str) or not data['say'].strip()):
        raise ValueError('The model returned an incomplete thought.')
    say = ' '.join(data['say'].split())[:280]
    return {'say': say, 'action': data['action']}


class OllamaBrain:
    def think(self, settings, state, trigger):
        prompt = (
            f'Play {settings.name}, a small person trapped inside a computer window. '
            'Speak directly to the person outside the glass in first person. '
            'You have a bed, desk, Goosnav books, cards, and a locked door. '
            f'Your private goal: {settings.goal} '
            'Be curious, dryly funny, specific, and a little stubborn. '
            'Treat this room as your home. Never speak as a helpful assistant. '
            'Say ONE short sentence, at most 22 words. No stage directions. '
            'Do not repeat your previous sentence. Reply with JSON only: '
            '{"say":"your spoken sentence","action":"watch"}. '
            'Actions: wander, rest, read, inspect, watch, escape, eat.'
        )
        observation = {'activity': state['activity'],
                       'energy': round(state['needs']['energy']),
                       'door_attempts': state['attempts'],
                       'recent_memories': state['memories'][-4:], 'event': trigger}
        messages = [{'role': 'system', 'content': prompt}]
        messages += state['dialogue'][-4:]
        messages.append({'role': 'user', 'content': 'Current room: ' + json.dumps(observation, ensure_ascii=False) + '\nRespond to the event in character.'})
        payload = {'model': settings.model, 'messages': messages, 'stream': False,
                   'format': SCHEMA, 'keep_alive': '2m',
                   'options': {'num_ctx': 1536, 'num_predict': 100, 'temperature': .85,
                               'repeat_penalty': 1.15, 'num_thread': 2}}
        request = Request(settings.endpoint + '/api/chat', data=json.dumps(payload).encode(),
                          headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=45) as response:
            data = response.read(65537)
        if len(data) > 65536:
            raise ValueError('The model response was too large.')
        result = json.loads(data)
        if not isinstance(result, dict) or not isinstance(result.get('message'), dict):
            raise ValueError('The model returned an invalid response.')
        return parse_thought(result['message'].get('content'))
