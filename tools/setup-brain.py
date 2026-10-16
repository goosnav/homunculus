"""One-time explicit model download: python tools/setup-brain.py [--tiny]."""
import argparse
import shutil
import subprocess

parser = argparse.ArgumentParser(description='Download the small local brain for Homunculus.')
parser.add_argument('--tiny', action='store_true', help='Use the smaller 271 MB SmolLM2 model')
args = parser.parse_args()
command = shutil.which('ollama')
if not command:
    parser.exit(1, 'Install Ollama from https://ollama.com/download, then run this again.\n')
model = 'smollm2:360m-instruct-q4_K_M' if args.tiny else 'qwen2.5:0.5b'
print(f'Downloading {model}. Start Ollama first. Choose this model in Homunculus Settings.', flush=True)
raise SystemExit(subprocess.call([command, 'pull', model]))
