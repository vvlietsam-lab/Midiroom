"""Build and package a clean, portable MIDIROOM source release (Python standard library)."""
from pathlib import Path
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
subprocess.run(['node', 'build.js'], cwd=root, check=True)
out = root.parent / f'MIDIROOM-v{version}.zip'
excluded = {'node_modules', '.git', '.sites-runtime', 'test-results', '__pycache__'}
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(root.rglob('*')):
        rel = file.relative_to(root)
        # Keep committed test evidence under docs/test-results, omit transient root QA.
        if any(p in {'node_modules', '.git', '.sites-runtime', '__pycache__'} for p in rel.parts):
            continue
        if rel.parts[0] == 'test-results' or file.suffix == '.zip' or not file.is_file():
            continue
        archive.write(file, rel.as_posix())
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    for required in ['index.html','src/core.js','src/app-shell.html','src/theme.css','src/workspace.js','src/production.js','src/vocal-engine.js','src/daw.js','src/session.js','src/projects.js','src/composer.js','src/discovery-engine.js','src/discovery.js','src/arranger.js','src/expression-engine.js','src/expression.js','src/scenes.js','src/skin.js','src/studio.js','src/sculptor-engine.js','src/sculptor.js','src/midi-import.js','src/groove.js','src/conversation-engine.js','src/conversation.js','assets/midiroom-mark.svg','package.json','package-lock.json','README.md','docs/HANDOVER.md']:
        assert required in archive.namelist(), required
# GitHub's web uploader takes at most 100 files per batch. A release that exceeds that
# cannot be uploaded in one drag, so split it into numbered parts that each stay under
# the limit, grouped by top-level folder so the paths stay intact on upload.
GITHUB_FILE_LIMIT = 100
PART_SIZE = 90

with zipfile.ZipFile(out) as archive:
    names = [n for n in archive.namelist() if not n.endswith('/')]

print(f'{out} ({out.stat().st_size:,} bytes, {len(names)} files)')

if len(names) > GITHUB_FILE_LIMIT:
    print(f'WAARSCHUWING: {len(names)} bestanden, GitHub neemt er maximaal {GITHUB_FILE_LIMIT} per upload.')
    groups = {}
    for name in names:
        groups.setdefault(name.split('/')[0] if '/' in name else '_root', []).append(name)
    batches, current = [], []
    for group in sorted(groups, key=lambda k: (k != '_root', k)):
        for name in groups[group]:
            if len(current) >= PART_SIZE:
                batches.append(current)
                current = []
            current.append(name)
    if current:
        batches.append(current)
    with zipfile.ZipFile(out) as source:
        for index, batch in enumerate(batches, 1):
            part = out.with_name(f'{out.stem}-deel{index}van{len(batches)}.zip')
            with zipfile.ZipFile(part, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
                for name in batch:
                    target.writestr(name, source.read(name))
            print(f'  {part.name} ({len(batch)} files)')
    print('Upload de delen op volgorde; GitHub voegt ze samen in dezelfde mappenstructuur.')
else:
    print(f'past in een enkele upload ({len(names)} van {GITHUB_FILE_LIMIT}).')
