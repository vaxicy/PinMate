import os, zipfile, sys

SRC = os.environ.get('PINMATE_SRC') or r'd:\迅雷下载\vibe coding\Chrome Extensions\PinMate'
OUT = r'd:\迅雷下载\vibe coding\PinMate-1.1.3.zip'

EXCLUDE_TOP_DIRS = {'.git', '.codebuddy', 'store-assets', 'tools', '.vscode'}
EXCLUDE_TOP_FILES = {'STORE-ASSETS-GUIDE.md', 'pinmate-1.1.3.zip',
                     '微信赞赏码.png', 'logo.jpeg', 'README.md', 'LICENSE'}

def ok(path):
    rel = os.path.relpath(path, SRC)
    parts = rel.split(os.sep)
    if parts[0] in EXCLUDE_TOP_DIRS:
        return False
    if rel in EXCLUDE_TOP_FILES or parts[-1] in EXCLUDE_TOP_FILES:
        return False
    # assets 目录：只排除脚本/提案/编译产物，保留 icons 与微信赞赏码等运行时资源
    if len(parts) >= 2 and parts[0] == 'assets':
        if parts[-1].lower().endswith(('.py', '.ps1', '.pyc')):
            return False
        if 'proposals' in parts:
            return False
    if parts[-1].lower().endswith('.pyc'):
        return False
    return True

if os.path.exists(OUT):
    os.remove(OUT)

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if ok(os.path.join(root, d))]
        for f in files:
            fp = os.path.join(root, f)
            if ok(fp):
                z.write(fp, os.path.relpath(fp, SRC))

    bad = [x for x in z.namelist() if 'proposals' in x or x.endswith(('.py', '.ps1'))]
print('PACKED', os.path.getsize(OUT), 'bytes ->', len(z.namelist()), 'files')
print('BAD_ENTRIES', bad)
