#!/usr/bin/env python3
"""Serve the extracted browser edition locally; simulation runs in the browser."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=0)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    folder = Path(__file__).resolve().parent / 'site'
    if not (folder / 'index.html').is_file():
        parser.error('Keep this launcher beside the extracted site folder.')
    handler = partial(SimpleHTTPRequestHandler, directory=str(folder))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        address = f'http://127.0.0.1:{server.server_port}'
        print(f'Homunculus: {address}\nKeep this window open. Ctrl+C stops the file server.', flush=True)
        if not args.no_browser:
            webbrowser.open(address)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
