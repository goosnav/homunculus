"""One-time explicit model download: python tools/setup-brain.py [--tiny]."""
import argparse
import shutil
import subprocess

parser = argparse.ArgumentParser(description='Download the small local brain for Homunculus.')
parser.add_argument('--tiny', action='store_true', help='The 0.4 GB brain for a Raspberry Pi (default: the 1.3 GB brain)')
args = parser.parse_args()
command = shutil.which('ollama')
if not command:
    parser.exit(1, 'Install Ollama from https://ollama.com/download, then run this again.\n')
model = 'qwen2.5:0.5b' if args.tiny else 'llama3.2:1b'
print(f'Downloading {model}. Start Ollama first. (You can also download brains from inside Homunculus.)', flush=True)
raise SystemExit(subprocess.call([command, 'pull', model]))
