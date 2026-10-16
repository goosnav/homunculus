"""Build a portable source distribution, excluding development dependencies and saves."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from homunculus import __version__  # noqa: E402

root = Path(__file__).resolve().parent.parent
out = root / 'dist'
out.mkdir(exist_ok=True)
archive = out / f'homunculus-{__version__}.zip'
files = ['README.md', 'LICENSE.md', 'run.py', 'Start Homunculus.sh', 'Start Homunculus.command', 'Start Homunculus.bat',
         'requirements-desktop.txt']
for folder in ('homunculus', 'web', 'deploy', 'docs'):
    files += [str(p.relative_to(root)) for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc']
files += ['tools/setup-brain.py', 'tools/setup-ears.py']
EXECUTABLE = {'Start Homunculus.sh', 'Start Homunculus.command', 'deploy/kiosk.sh'}
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as z:
    for name in sorted(files):
        info = ZipInfo.from_file(root / name, 'homunculus/' + name)
        info.compress_type = ZIP_DEFLATED
        info.external_attr = (0o100755 if name in EXECUTABLE else 0o100644) << 16  # Keep launchers runnable.
        z.writestr(info, (root / name).read_bytes())
sha = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{sha}  {archive.name}\n')
print(f'{archive}: {archive.stat().st_size:,} bytes\nSHA256 {sha}')
