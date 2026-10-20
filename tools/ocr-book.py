#!/usr/bin/env python3
"""Quick, deliberately unpolished comic OCR. Requires Poppler + Tesseract English.

python3 tools/ocr-book.py book.pdf --output .local/book2/ocr.json \
  --public-output web/assets/comic/excerpts.json --excerpt-pages 10,24,40,61,80,99,120,140

The complete book stays in the local output. Only the requested excerpts are public.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def page_numbers(value, total):
    if not value:
        return list(range(1, total + 1))
    pages = set()
    for part in value.split(','):
        ends = part.strip().split('-')
        a, b = int(ends[0]), int(ends[-1])
        if a < 1 or b < a or b > total:
            raise ValueError(f'Invalid page range: {part}')
        pages.update(range(a, b + 1))
    return sorted(pages)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--pages', help='PDF sheet numbers, e.g. 5-30,40,61. Default: all.')
    parser.add_argument('--public-output', type=Path)
    parser.add_argument('--excerpt-pages', default='10,24,40,61,80,99,120,140')
    parser.add_argument('--printed-offset', type=int, default=4)
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--tesseract', default='tesseract')
    parser.add_argument('--tessdata')
    args = parser.parse_args()
    info = subprocess.check_output(['pdfinfo', str(args.pdf)], text=True)
    total = int(re.search(r'^Pages:\s+(\d+)', info, re.M)[1])
    pages = page_numbers(args.pages, total)
    source_hash = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    results = {}
    if args.output.exists():
        existing = json.loads(args.output.read_text())
        if existing.get('source_sha256') == source_hash:
            results = {p['pdfPage']: p for p in existing['pages']}
    metadata = dict(source_file=args.pdf.name, source_sha256=source_hash,
                    source_pages=total, method='Tesseract English, sparse text (PSM 11), 1600px render. Raw OCR; errors expected.')

    def recognize(number):
        with tempfile.TemporaryDirectory(prefix='homunculus-ocr-') as folder:
            image = Path(folder) / 'page'
            subprocess.run(['pdftoppm', '-f', str(number), '-l', str(number), '-singlefile',
                            '-scale-to', '1600', '-gray', '-png', str(args.pdf), str(image)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=90)
            command = [args.tesseract, str(image) + '.png', 'stdout', '-l', 'eng', '--psm', '11']
            if args.tessdata:
                command += ['--tessdata-dir', args.tessdata]
            text = subprocess.check_output(command, text=True, stderr=subprocess.PIPE,
                                           env={**os.environ, 'OMP_THREAD_LIMIT': '1'}, timeout=90)
            printed = number - args.printed_offset
            return dict(pdfPage=number, page=printed, text=text.strip(),
                        image=f'assets/comic/page-{printed}.jpg')

    pending = [p for p in pages if p not in results]
    print(f'OCR: {total} sheets, {len(pending)} remaining. No manual correction.', flush=True)
    with ThreadPoolExecutor(max_workers=max(1, min(4, args.jobs))) as pool:
        futures = {pool.submit(recognize, n): n for n in pending}
        for future in as_completed(futures):
            result = future.result()
            results[result['pdfPage']] = result
            write_json(args.output, {**metadata, 'pages': [results[n] for n in sorted(results)]})
            if len(results) % 10 == 0 or len(results) == len(pages):
                print(f'{len(results)}/{len(pages)} pages written', flush=True)
    if args.public_output:
        excerpts = page_numbers(args.excerpt_pages, total)
        missing = [p for p in excerpts if p not in results]
        if missing:
            raise ValueError(f'OCR these excerpt sheets first: {missing}')
        write_json(args.public_output, {**metadata, 'pages': [results[n] for n in excerpts]})
        print(f'{len(excerpts)} excerpts → {args.public_output}', flush=True)
    print(f'Full OCR → {args.output}', flush=True)


if __name__ == '__main__':
    main()
