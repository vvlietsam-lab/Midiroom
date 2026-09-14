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
print(f'{out} ({out.stat().st_size:,} bytes)')
