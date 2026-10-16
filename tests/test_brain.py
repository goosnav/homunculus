import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import random
from homunculus.brain import OllamaBrain, RepeatError, build_messages, parse_thought
from homunculus.config import Settings
from homunculus.simulation import Simulation

class BrainTests(unittest.TestCase):
    def test_bad_model_output_is_rejected(self):
        for text in ('not json', '[]', '{"say":2,"action":"watch"}', '{"say":"Hi","action":"shell"}', '{"say":"","action":"watch"}'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                parse_thought(text)

    def test_bounded_text(self):
        result = parse_thought(json.dumps({'say': 'a' * 1000, 'action': 'read'}))
        self.assertLessEqual(len(result['say']), 280)

    def test_missing_feeling_defaults_and_speaker_prefix_is_removed(self):
        result = parse_thought('{"say":"Hugh: \\"Let me out.\\"","action":"knock"}')
        self.assertEqual(result, {'say': 'Let me out.', 'action': 'knock', 'feeling': 'calm'})

    def test_watcher_words_arrive_as_the_user_turn(self):
        state = Simulation().snapshot() | {'watched': True}
        messages = build_messages(Settings(), state, 'The watcher says: open sesame', random.Random(1))
        self.assertEqual(messages[-1], {'role': 'user', 'content': 'open sesame'})
        self.assertIn('Convince the person outside', messages[0]['content'])
        alone = build_messages(Settings(), state | {'watched': False}, 'watches you silently', random.Random(1))
        self.assertIn('away', alone[-1]['content'])

    def test_repeated_line_is_rejected(self):
        reply = '{"say":"The glass is quite solid today.","action":"watch","feeling":"calm"}'
        with stub_ollama(reply) as url:
            state = Simulation().snapshot()
            state['dialogue'] = [{'role': 'assistant', 'content': 'The glass is quite solid today!'}]
            with self.assertRaises(RepeatError):
                OllamaBrain().think(Settings().update({'endpoint': url}), state, 'watches you silently')

    def test_help_desk_voice_is_never_spoken(self):
        reply = '{"say":"I am sorry, but as an artificial intelligence I cannot taste food.","action":"read","feeling":"calm"}'
        with stub_ollama(reply) as url, self.assertRaises(RepeatError):
            OllamaBrain().think(Settings().update({'endpoint': url}), Simulation().snapshot(), 'watches you silently')

    def test_real_http_ollama_contract(self):
        captured = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                captured.append((self.path, json.loads(self.rfile.read(int(self.headers['Content-Length'])))))
                data = json.dumps({'message': {'role': 'assistant', 'content': '{"say":"Is the door decorative?","action":"escape"}'}, 'done': True}).encode()
                self.send_response(200); self.end_headers(); self.wfile.write(data)
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            settings = Settings().update({'endpoint': f'http://127.0.0.1:{server.server_port}'})
            result = OllamaBrain().think(settings, Simulation().snapshot(), 'Someone tapped the glass.')
            self.assertEqual(result['action'], 'escape')
            self.assertEqual(captured[0][0], '/api/chat')
            request = captured[0][1]
            self.assertFalse(request['stream'])
            self.assertLessEqual(request['options']['num_ctx'], 1536)
            self.assertLessEqual(request['options']['num_predict'], 120)
            self.assertIn('escape', request['format']['properties']['action']['enum'])
        finally:
            server.shutdown(); server.server_close(); thread.join()

class stub_ollama:
    def __init__(self, content):
        self.content = content
    def __enter__(self):
        content = self.content
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                self.rfile.read(int(self.headers['Content-Length']))
                data = json.dumps({'message': {'role': 'assistant', 'content': content}}).encode()
                self.send_response(200); self.end_headers(); self.wfile.write(data)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True); self.thread.start()
        return f'http://127.0.0.1:{self.server.server_port}'
    def __exit__(self, *args):
        self.server.shutdown(); self.server.server_close(); self.thread.join()

if __name__ == '__main__': unittest.main()
