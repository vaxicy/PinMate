"""Crop transparent edges from logo.jpeg (actually WebP) and generate 16/48/128 PNG icons."""
from PIL import Image
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(script_dir, "..", "logo.jpeg")
out_dir = os.path.join(script_dir, "icons")

img = Image.open(src).convert("RGBA")
print(f"Source: {img.size[0]}x{img.size[1]}, mode={img.mode}")

# Find bounding box of non-transparent content
bbox = img.getbbox()  # PIL built-in: returns (left, upper, right, lower) of non-zero region
if bbox:
    left, top, right, bottom = bbox
    # Add small padding for anti-aliased edges
    pad = 2
    w, h = img.size
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w - 1, right + pad)
    bottom = min(h - 1, bottom + pad)
    cropped = img.crop((left, top, right + 1, bottom + 1))
    print(f"Cropped: {cropped.size[0]}x{cropped.size[1]}")
else:
    cropped = img
    print("No transparent area found, using full image")

# Generate sizes
for sz in (16, 48, 128):
    resized = cropped.resize((sz, sz), Image.LANCZOS)
    out_path = os.path.join(out_dir, f"icon{sz}.png")
    resized.save(out_path, "PNG")
    print(f"  wrote icon{sz}.png ({sz}x{sz})")

# Save preview
preview_dir = os.path.join(out_dir, "proposals")
os.makedirs(preview_dir, exist_ok=True)
prev128 = cropped.resize((128, 128), Image.LANCZOS)
prev_path = os.path.join(preview_dir, "chatgpt-icon-128.png")
prev128.save(prev_path, "PNG")
print(f"  wrote chatgpt-icon-128.png (preview)")

print("\nDone! Icons replaced.")
