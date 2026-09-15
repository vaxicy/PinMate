"""Build PinMate into a zip inside the `vibe coding` collection folder.

Run from the project root:
    py tools/build.py

Why this wrapper exists: the project lives under a Chinese path, and Windows
PowerShell 5.1 mangles Chinese command-line arguments via the GBK codepage, so
`py "中文路径/tools/pack-pinmate.py"` fails. This script copies the project to
an ASCII temp dir (Python's copy/zip use the wide-char API, so Chinese paths are
fine there) and runs `tools/pack-pinmate.py` with:
    PINMATE_SRC  -> the ASCII temp copy (the real source to zip)
    PINMATE_OUT  -> the `vibe coding` folder (the default output location)
    PYTHONUTF8=1 -> keep non-ASCII paths correct inside the child process
The final zip always lands in the `vibe coding` collection folder that sits one
level above the project's parent directory, named PinMate-<version>.zip.
"""
import os
import sys
import shutil
import subprocess
import tempfile

# Must be run from the project root (cwd). We use cwd, not __file__, so the
# Chinese project path is taken from the OS (correct) rather than a possibly
# GBK-mangled __file__ literal.
SRC = os.getcwd()
OUT_DIR = os.path.normpath(os.path.join(SRC, '..', '..'))  # `vibe coding`
os.makedirs(OUT_DIR, exist_ok=True)

# Copy the project to an ASCII temp dir to dodge the command-line GBK issue.
tmp = tempfile.mkdtemp(prefix='pm_build_')
work = os.path.join(tmp, 'PinMate')
shutil.copytree(
    SRC, work,
    ignore=shutil.ignore_patterns('.git', '.codebuddy', '*.zip', '__pycache__'),
)

env = dict(os.environ)
env['PINMATE_SRC'] = work
env['PINMATE_OUT'] = OUT_DIR
env['PYTHONUTF8'] = '1'
script = os.path.join(work, 'tools', 'pack-pinmate.py')

try:
    subprocess.run([sys.executable, script], env=env, check=True)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('Build complete ->', os.path.join(OUT_DIR, 'PinMate-*.zip'))
