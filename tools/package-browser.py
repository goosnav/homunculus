#!/usr/bin/env python3
"""Package the verified Vite build with bundled model weights and no desktop backend."""
import hashlib
from pathlib import Path
import subprocess
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
subprocess.run(['node', 'tools/check-build.mjs'], cwd=root, check=True)
out = root / 'build'
out.mkdir(exist_ok=True)
archive = out / 'homunculus-browser.zip'
shell = '#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec python3 launch.py "$@"\n'
windows = '@echo off\r\ncd /d "%~dp0"\r\nwhere py >nul 2>nul\r\nif %errorlevel% equ 0 (\r\n  py -3 launch.py %*\r\n) else (\r\n  python launch.py %*\r\n)\r\npause\r\n'
readme = """HOMUNCULUS — browser edition

Extract the entire ZIP, then run Start Homunculus for your operating system.
Requires Python 3.10+ to serve files and a modern WebGL 2/WebAssembly browser.
Alternatively: python3 launch.py
Python only serves static files. The simulation and LLM run in your browser.
Model weights are included. No internet connection or Ollama is needed.
The browser loads the weights from the local file server and can cache them.
Anvil, close, and refresh permanently end an individual. There are no saved lives.
Keep the launcher window open; Ctrl+C stops it.
"""
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=6) as bundle:
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file():
            bundle.write(path, 'homunculus/site/' + path.relative_to(root / 'dist').as_posix())
    bundle.write(root / 'tools/browser-launch.py', 'homunculus/launch.py')
    for name, content in [('Start Homunculus.sh', shell), ('Start Homunculus.command', shell),
                          ('Start Homunculus.bat', windows), ('README.txt', readme)]:
        info = ZipInfo('homunculus/' + name)
        info.compress_type = ZIP_DEFLATED
        info.external_attr = (0o100755 if name.endswith(('.sh', '.command')) else 0o100644) << 16
        bundle.writestr(info, content)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive}: {archive.stat().st_size:,} bytes\nSHA256 {digest}')
