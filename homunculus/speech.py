"""Bounded, asynchronous OS speech. Browser speech is the portable fallback."""
import base64
import queue
import shutil
import subprocess
import sys
import threading


def speech_command(command, text, platform):
    if platform == 'darwin':
        return [command, '-r', '155', '--', text], None
    if platform == 'win32':
        encoded = base64.b64encode(text.encode('utf-8')).decode('ascii')
        script = ("Add-Type -AssemblyName System.Speech; $v = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
                  f"$v.Rate = -1; $v.Speak([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded}')))" )
        return [command, '-NoProfile', '-NonInteractive', '-Command', script], None
    if command.endswith('spd-say'):
        return [command, '-w', '-r', '-15', '-p', '-15', '-N', 'homunculus', '--', text], None
    return [command, '-s', '155', '-p', '37', '--stdin'], text.encode('utf-8')


class Speaker:
    def __init__(self, enabled=True):
        self.enabled = enabled
        self.command = (shutil.which('say') if sys.platform == 'darwin' else
                        shutil.which('powershell') if sys.platform == 'win32' else
                        shutil.which('espeak-ng') or shutil.which('espeak') or shutil.which('spd-say'))
        self.queue = queue.Queue(maxsize=1)
        self.stopped = threading.Event()
        self.process = None
        self.lock = threading.Lock()
        self.error = ''
        self.thread = threading.Thread(target=self._work, daemon=True, name='voice')
        self.thread.start()

    @property
    def available(self):
        return bool(self.command) and not self.error

    def say(self, text):
        if not self.enabled or not self.command:
            return
        try:
            self.queue.put_nowait(text[:280])
        except queue.Full:
            pass  # Never accumulate old speech.

    def _work(self):
        while not self.stopped.is_set():
            try:
                text = self.queue.get(timeout=.3)
            except queue.Empty:
                continue
            if not self.enabled:
                continue
            args, data = speech_command(self.command, text, sys.platform)
            try:
                with self.lock:
                    if self.stopped.is_set() or not self.enabled:
                        continue
                    self.process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.process.communicate(input=data, timeout=30)
                if self.process.returncode:
                    self.error = 'System speech failed; subtitles remain available.'
            except (OSError, subprocess.TimeoutExpired):
                self.error = 'System speech is unavailable; subtitles remain available.'
                if self.process:
                    self.process.kill()
                    self.process.wait()
            finally:
                with self.lock:
                    self.process = None

    def set_enabled(self, enabled):
        self.enabled = enabled
        if not enabled:
            with self.lock:
                if self.process:
                    self.process.terminate()
            while True:
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    break

    def close(self):
        self.stopped.set()
        self.set_enabled(False)
        self.thread.join(timeout=2)
