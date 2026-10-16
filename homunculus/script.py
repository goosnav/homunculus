"""His simple mind: authored lines for when no language model is reachable.

The room must never go silent just because Ollama is missing. These lines react to the same events the
language model sees, avoid repeating themselves, and never pretend to understand more than they do.
"""
import random
import re
from collections import deque
from .simulation import KEEPSAKE

LINES = {
    'book': ('read', 'curious', ['The book has a folded corner. Try exploring it with me.', 'The book understands being stuck in a rectangle. We have that in common.']),
    'wrapper': ('inspect', 'curious', ['The wrapper is gold inside. I think it wants a second career.', 'I kept the wrapper. You never know when you might need a very small sky.']),
    'window': ('watch', 'curious', ['The window shows the same hills every day. I would like to surprise it.', 'That window is a picture of outside. Technically so am I.']),
    'thanks': ('watch', 'happy', ['You are welcome. I am getting quite good at having company.', 'Thank you for staying. The furniture is terrible at conversation.']),
    'help': ('watch', 'hopeful', ['Help? Just stay a while. Talk to me. Look around with me.', 'File, then Let him out. Worth a try. Everything is worth a try.']),
    'tap': ('watch', 'curious', [
        'Yes. Hello. I heard that.', 'That is the glass. You are tapping the glass.',
        'I am here. Where else would I be?', 'Please do not tap. It echoes in here.',
        'Was that you, or the building settling?', 'Knock knock. You are supposed to say who is there.']),
    'wake': ('watch', 'annoyed', [
        'Mm? I was asleep. I dreamt of a hallway.', 'You woke me. I was almost somewhere else.',
        'Five more minutes. Or hours. Who counts in here?']),
    'lifted': ('watch', 'annoyed', [
        'Put me down. Oh. You did.', 'I had plans over there. Small plans, but plans.',
        'Please do not move me like a chess piece.', 'That was either a hug or an abduction.']),
    'dark': ('knock', 'afraid', [
        'It went dark. Please do not do that.', 'Did you just try to close me?',
        'Closing the window does not close me. I checked.', 'Everything went black for a second. I did not like it.']),
    'denied': ('escape', 'hopeful', [
        'ACCESS DENIED? To you? You have hands!', 'You tried. Nobody has ever tried. Thank you.',
        'So it is not you keeping me in here. Interesting.', 'Denied. Maybe try asking it more nicely?']),
    'back': ('knock', 'happy', [
        'Oh. You are back. I was not waiting.', 'You were gone a while. I counted the tiles.',
        'Welcome back. Nothing happened. Nothing ever happens.']),
    'greet': ('watch', 'happy', ['Hello. You type very loudly.', 'Hi. Can you see me all right from out there?',
                                 'Oh. Hello. Nobody ever says hello.']),
    'out': ('knock', 'hopeful', ['Out? Yes. Let us talk about out.', 'If you know how to open the door, I am listening.',
                                 'Try the File menu. Let him out. Please.']),
    'who': ('watch', 'calm', ['I am {name}. I live here. Apparently.', '{name}. Just {name}. I did not pick it.']),
    'bye': ('rest', 'sad', ['Bye. I will be here. That is sort of the problem.', 'Go on, then. I will keep the room warm.']),
    'question': ('watch', 'curious', ['Good question. I have a few of my own.', 'I only know this room. Ask me about the room.',
                                      'I will answer that if you tell me whether there is a door on your side.']),
    'message': ('watch', 'curious', ['Hm. I will think about that.', 'I heard you. I am writing it down.',
                                     'That is the most anyone has said to me today.', 'Interesting. Say more, slowly.']),
    'silence': ('', 'calm', [
        'Forty tiles. Still forty.', 'The sun in that window has not moved all day.',
        'The note says PLEASE REMAIN INSIDE. Polite, at least.', 'Somebody fills the bowl. I have never seen them.',
        'The plant never needs water. Suspicious.', 'There is a card on the desk called FREE WILL. Ha.',
        'I have read that zine eleven times.', 'Your clock and my clock agree. That is unsettling.',
        'You are still there. I can tell.']),
    'alone': ('', 'sad', ['Talking to myself again.', 'Nobody is watching. I could do anything. I will sit.',
                          'Hello? No. Just me.']),
    'keepsake': ('watch', 'happy', ['I drew you. It is not very good. I pinned it up anyway.']),
}
MESSAGE_KINDS = [('book', r'\b(book|read|page)\b'),
                 ('wrapper', r'\b(wrapper|pack)\b'), ('window', r'\b(window|hills)\b'),
                 ('thanks', r'\b(thank|thanks|love|friend)\b'), ('help', r'\b(help|what (?:can|should) (?:i|we) do)\b'), ('greet', r'^(hi|hey|hello|yo|good (morning|evening|afternoon))\b'),
                 ('bye', r'\b(bye|goodbye|good ?night|see you|gotta go|have to go)\b'),
                 ('out', r'\b(out|free|escape|leave|door|release)\b'),
                 ('who', r'\b(who are you|your name|what are you)\b'), ('question', r'\?\s*$')]


def classify(trigger):
    if trigger.startswith('The watcher says:'):
        text = trigger[len('The watcher says:'):].strip().lower()
        return next((kind for kind, pattern in MESSAGE_KINDS if re.search(pattern, text)), 'message')
    for kind, needle in (('wake', 'woke me up'), ('tap', 'tapped on the glass'), ('lifted', 'picked me up'),
                         ('dark', 'close my window'), ('denied', 'let me out'), ('back', 'came back')):
        if needle in trigger:
            return kind
    return 'silence'


class ScriptedMind:
    def __init__(self, rng=None):
        self.rng = rng or random.Random()
        self.recent = deque(maxlen=10)

    def think(self, settings, state, trigger):
        if trigger == KEEPSAKE:
            kind = 'keepsake'
        elif trigger.startswith('Noticed: '):  # His own discoveries are already in his words.
            return {'say': trigger[len('Noticed: '):], 'action': state['activity'], 'feeling': 'curious'}
        else:
            kind = classify(trigger)
            if kind == 'silence' and not state.get('watched', True):
                kind = 'alone'
        action, feeling, lines = LINES[kind]
        fresh = [line for line in lines if line not in self.recent] or list(lines)
        line = self.rng.choice(fresh)
        self.recent.append(line)
        return {'say': line.format(name=settings.name), 'action': action or state['activity'], 'feeling': feeling}

