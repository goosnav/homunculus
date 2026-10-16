"""One-time offline speech setup for --listen: python tools/setup-ears.py [--data-dir PATH]

Installs the Vosk recognizer (about 10 MB) into this Python and downloads the small English model
(about 40 MB) into the habitat's data folder. Nothing is sent anywhere when listening.
"""
import argparse
import io
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from homunculus.storage import data_directory  # noqa: E402

URL = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip'
parser = argparse.ArgumentParser(description='Give Homunculus offline ears.')
parser.add_argument('--data-dir', type=Path, default=data_directory())
args = parser.parse_args()
target = args.data_dir / 'vosk-model'
try:
    import vosk  # noqa: F401
except ImportError:
    print('Installing the Vosk speech recognizer…', flush=True)
    if subprocess.call([sys.executable, '-m', 'pip', 'install', '--user', 'vosk']):
        parser.exit(1, 'Could not install Vosk. Try: python3 -m pip install vosk  (on Raspberry Pi OS add --break-system-packages)\n')
if (target / 'am').is_dir():
    print(f'Speech model already present: {target}')
else:
    print(f'Downloading the small English speech model (about 40 MB) to {target}…', flush=True)
    with urlopen(URL, timeout=60) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    root = archive.namelist()[0].split('/')[0]
    args.data_dir.mkdir(parents=True, exist_ok=True)
    archive.extractall(args.data_dir)
    shutil.rmtree(target, ignore_errors=True)
    (args.data_dir / root).rename(target)
print('Done. Start Homunculus with --listen (the Pi appliance script does this automatically).')
