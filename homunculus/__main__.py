"""python -m homunculus [--desktop | --kiosk | --no-browser] [--listen]"""
import argparse
import signal
import sys
import threading
import webbrowser
from pathlib import Path
from .runtime import Runtime
from .server import make_server
from .storage import data_directory


def main():
    parser = argparse.ArgumentParser(description='Homunculus — a little life behind glass')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-dir', type=Path, default=data_directory())
    parser.add_argument('--kiosk', action='store_true', help='Observation only; no settings or interaction')
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--desktop', action='store_true', help='Native system-webview window (requires pywebview)')
    parser.add_argument('--browser-speech', action='store_true', help='Use browser voice instead of host OS voice')
    parser.add_argument('--listen', action='store_true', help='Hear the microphone offline (needs Vosk; see tools/setup-ears.py)')
    parser.add_argument('--ears-model', type=Path, help='Vosk model folder (default: DATA_DIR/vosk-model)')
    args = parser.parse_args()
    if getattr(sys, 'frozen', False) and not args.no_browser and not args.kiosk:
        args.desktop = True
    if not 0 <= args.port <= 65535:
        parser.error('Port must be between 0 and 65535.')
    try:
        runtime = Runtime(args.data_dir, kiosk=args.kiosk, host_speech=not args.browser_speech)
    except OSError as exc:
        parser.exit(1, f'Cannot read habitat at {args.data_dir}: {exc}. Check folder permissions or use --data-dir PATH.\n')
    try:
        server = make_server(runtime, args.port)
    except OSError as exc:
        runtime.close()
        parser.exit(1, f'Cannot open port {args.port}: {exc}. Try --port 8766.\n')
    runtime.start()
    if args.listen:
        from .ears import Ears
        runtime.ears = Ears(runtime, args.ears_model or args.data_dir / 'vosk-model').start()
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_port}'
    print(f'Homunculus: {url}\nHabitat: {args.data_dir}\nPress Ctrl+C to close.', flush=True)
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    try:
        if args.desktop:
            try:
                import webview
            except ImportError:
                print('Native window needs pywebview. Opening the browser instead.', flush=True)
                webbrowser.open(url)
                while not stop.wait(.5): pass
            else:
                class Api:  # File → Exit in the page. The XP frame is the only frame, so it needs its own way out.
                    def quit(self):
                        window.destroy()
                window = webview.create_window('Homunculus', url, width=900, height=760, min_size=(480, 420),
                                               frameless=True, easy_drag=False, js_api=Api(),
                                               background_color='#0754d3')
                webview.start()
        else:
            if not args.no_browser:
                webbrowser.open(url)
            while not stop.wait(.5): pass
    finally:
        server.shutdown()
        server.server_close()
        runtime.close()
        thread.join(timeout=2)


if __name__ == '__main__':
    main()
