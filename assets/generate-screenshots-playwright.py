"""
generate-screenshots-playwright.py
Render PinMate Chrome Web Store screenshots (1280x800) with a real Pinterest
Create Pin page mockup + PinMate floating panel using Playwright (headless).

Outputs (overwrites existing store assets):
  store-assets/screenshots/zh/screenshot-1-settings.png
  store-assets/screenshots/zh/screenshot-2-result.png
  store-assets/screenshots/zh/screenshot-3-filled.png
  store-assets/screenshots/en/... (same 3)

Usage:
  python assets/generate-screenshots-playwright.py
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = (ROOT / "assets" / "screenshot-template.html").as_uri()
OUT_ZH = ROOT / "store-assets" / "screenshots" / "zh"
OUT_EN = ROOT / "store-assets" / "screenshots" / "en"

SHOTS = [
    # (lang, page, filename)
    ("zh", "settings", "screenshot-1-settings.png"),
    ("zh", "result",   "screenshot-2-result.png"),
    ("zh", "filled",   "screenshot-3-filled.png"),
    ("en", "settings", "screenshot-1-settings.png"),
    ("en", "result",   "screenshot-2-result.png"),
    ("en", "filled",   "screenshot-3-filled.png"),
]


def main():
    OUT_ZH.mkdir(parents=True, exist_ok=True)
    OUT_EN.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
        for lang, pg, fname in SHOTS:
            url = f"{TEMPLATE}?lang={lang}&page={pg}"
            page.goto(url)
            page.wait_for_timeout(250)
            out_dir = OUT_ZH if lang == "zh" else OUT_EN
            out_path = out_dir / fname
            page.screenshot(path=str(out_path), clip={"x": 0, "y": 0, "width": 1280, "height": 800})
            print(f"rendered -> {out_path}")
        browser.close()
    print("done")


if __name__ == "__main__":
    main()
