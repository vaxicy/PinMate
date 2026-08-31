import os, zipfile, json

# Derive paths from this file's location instead of hard-coding a Chinese path
# literal — Windows shells mangle non-ASCII literals (GBK) and break the build.
# tools/pack-pinmate.py -> parent = project root -> parent = collection folder
_HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('PINMATE_SRC') or os.path.dirname(_HERE)
DIST = os.path.dirname(os.path.dirname(SRC))

# Version is read from manifest.json — single source of truth, never hard-code it here.
with open(os.path.join(SRC, 'manifest.json'), encoding='utf-8') as f:
    VERSION = json.load(f)['version']

OUT = os.path.join(DIST, 'PinMate-%s.zip' % VERSION)
OUT_PROJECT = os.path.join(SRC, 'PinMate-%s.zip' % VERSION)

EXCLUDE_TOP_DIRS = {'.git', '.codebuddy', 'store-assets', 'tools', '.vscode'}
EXCLUDE_TOP_FILES = {'STORE-ASSETS-GUIDE.md',
                     '微信赞赏码.png', 'logo.jpeg', 'README.md', 'LICENSE'}

def ok(path):
    rel = os.path.relpath(path, SRC)
    parts = rel.split(os.sep)
    if parts[0] in EXCLUDE_TOP_DIRS:
        return False
    if rel in EXCLUDE_TOP_FILES or parts[-1] in EXCLUDE_TOP_FILES:
        return False
    # assets 目录：只保留运行时资源（icons、微信赞赏码），
    # 排除脚本/提案/截图模板/编译产物
    if len(parts) >= 2 and parts[0] == 'assets':
        if parts[-1].lower().endswith(('.py', '.ps1', '.pyc')):
            return False
        if 'proposals' in parts:
            return False
        if parts[-1].lower() in ('screenshot-template.html',):
            return False
    if parts[-1].lower().endswith('.pyc'):
        return False
    # never zip a previously built package into itself
    if parts[-1].lower().startswith('pinmate-') and parts[-1].lower().endswith('.zip'):
        return False
    return True

for p in (OUT, OUT_PROJECT):
    if os.path.exists(p):
        os.remove(p)

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if ok(os.path.join(root, d))]
        for f in files:
            fp = os.path.join(root, f)
            if ok(fp):
                z.write(fp, os.path.relpath(fp, SRC))

    names = z.namelist()
    bad = [x for x in names if 'proposals' in x or x.endswith(('.py', '.ps1'))]

# Always keep a copy inside the project for version history.
import shutil
shutil.copyfile(OUT, OUT_PROJECT)

print('VERSION', VERSION)
print('PACKED', os.path.getsize(OUT), 'bytes ->', len(names), 'files')
print('OUT (default folder):', OUT)
print('OUT (project copy)  :', OUT_PROJECT)
print('BAD_ENTRIES', bad)
for n in sorted(names):
    print('  ', n)
