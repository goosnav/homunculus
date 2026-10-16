"""Build a portable source distribution, excluding development dependencies and saves."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
out = root / 'dist'
out.mkdir(exist_ok=True)
archive = out / 'homunculus-0.1.0.zip'
files = ['README.md', 'LICENSE.md', 'run.py', 'run.sh', 'run.bat', 'run.command', 'requirements-desktop.txt']
for folder in ('homunculus', 'web', 'deploy', 'docs'):
    files += [str(p.relative_to(root)) for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc']
files += ['tools/setup-brain.py']
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as z:
    for name in sorted(files):
        z.write(root / name, 'homunculus/' + name)
sha = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{sha}  {archive.name}\n')
print(f'{archive}: {archive.stat().st_size:,} bytes\nSHA256 {sha}')
