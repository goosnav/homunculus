"""Loopback-only habitat HTTP API and local asset serving."""
import json
import mimetypes
import secrets
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit
from .world import BOUNDS, OBSTACLES, PLACES

WEB = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent.parent)) / 'web'


class Handler(BaseHTTPRequestHandler):
    server_version = 'Homunculus/0.2'

    def log_message(self, *args):
        pass

    def _headers(self, code, mime='application/json', length=None):
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store' if mime == 'application/json' else 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        if length is not None:
            self.send_header('Content-Length', str(length))
        self.end_headers()

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self._headers(code, 'application/json', len(body))
        self.wfile.write(body)

    def allowed_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')

    def do_GET(self):
        if not self.allowed_host():
            return self.reply(403, {'error': 'Local access only.'})
        url = urlsplit(self.path)
        path = url.path
        if path == '/api/state':
            self.server.runtime.seen(parse_qs(url.query).get('visible') == ['1'])
            return self.reply(200, self.server.runtime.snapshot())
        if path == '/api/models':
            return self.reply(200, self.server.runtime.installed_models())
        if path == '/api/bootstrap':
            return self.reply(200, self.server.runtime.snapshot() | {'token': self.server.token,
                'world': {'bounds': BOUNDS, 'obstacles': OBSTACLES, 'places': PLACES}})
        if path.startswith('/api/'):
            return self.reply(404, {'error': 'Unknown endpoint.'})
        try:
            target = (WEB / unquote(path).lstrip('/')).resolve()
            if path == '/':
                target = WEB / 'index.html'
            if not target.is_relative_to(WEB.resolve()) or not target.is_file():
                return self.reply(404, {'error': 'File not found.'})
            data = target.read_bytes()
            mime = 'text/javascript' if target.suffix == '.js' else mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
            self._headers(200, mime, len(data))
            self.wfile.write(data)
        except (OSError, ValueError):
            self.reply(404, {'error': 'File not found.'})

    def do_POST(self):
        origin = self.headers.get('Origin')
        if (not self.allowed_host() or (origin and origin not in (f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'))
                or not secrets.compare_digest(self.headers.get('X-Habitat-Token', ''), self.server.token)):
            return self.reply(403, {'error': 'This request did not come from your habitat.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 8192:
                return self.reply(413, {'error': 'Request is too large or empty.'})
            if self.headers.get_content_type() != 'application/json':
                return self.reply(415, {'error': 'Send JSON.'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError('Expected an object.')
            if self.path == '/api/settings':
                self.server.runtime.configure(data)
            elif self.path == '/api/interact':
                self.server.runtime.interact(data.get('kind'), data)
            elif self.path == '/api/pull':
                self.server.runtime.pull(data.get('model'))
            else:
                return self.reply(404, {'error': 'Unknown endpoint.'})
            self.reply(200, {'ok': True})
        except PermissionError as exc:
            self.reply(403, {'error': str(exc)})
        except OverflowError as exc:
            self.reply(429, {'error': str(exc)})
        except (ValueError, TypeError) as exc:
            self.reply(400, {'error': str(exc)})

    def setup(self):
        super().setup()
        self.connection.settimeout(5)


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def make_server(runtime, port=8765):
    server = LocalServer(('127.0.0.1', port), Handler)
    server.runtime, server.token = runtime, secrets.token_urlsafe(32)
    return server
