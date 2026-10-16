import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from homunculus.brain import OllamaBrain, parse_thought
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

if __name__ == '__main__': unittest.main()
