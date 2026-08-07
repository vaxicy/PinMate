"""
PinMate Store Promo Images Generator
Generates ENGLISH-only promo tiles for Chrome Web Store.
Output: store-assets/promo/promo-small-440x280.png, promo-large-1400x560.png

Notes:
- English only (Chrome theme-style asset per store policy for this project).
- No emoji used anywhere (PIL CJK fonts render emoji as tofu boxes).
- Top red brand bar removed per design feedback; titles sit on light pink bg.
- Buttons center text vertically via anchor="mm" at button mid-height.
- Feature icons are colored dots, not emoji.

Usage: python assets/generate-store-promo.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets" / "promo"
OUT.mkdir(parents=True, exist_ok=True)

# ── Brand colors ──
C = {
    "primary":   "#E60023",
    "primary_h": "#c60020",
    "secondary": "#FF6B81",
    "bg":        "#FFF5F6",
    "surface":   "#ffffff",
    "text":      "#1f1f24",
    "sub":       "#6b6b73",
    "border":    "#f0dfe1",
    "ok":        "#1a9d55",
    "paper":     "#fef7f8",
    "grid":      "#fce4e8",
    "dot":       "#f8c0cb",
    "mint":      "#67d6bd",
    "cream":     "#e6b800",   # gold for rating (dark enough to read)
    "lavender":  "#b388ff",
    "sky":       "#75bfe8",
}


def font(size, bold=False):
    # Prefer English fonts so promo text renders cleanly in English-only assets.
    cands = []
    if bold:
        cands += [
            Path("C:/Windows/Fonts/seguisb.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf"),
            Path("C:/Windows/Fonts/msyhbd.ttc"),
        ]
    cands += [
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/msyh.ttc"),
    ]
    for c in cands:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default()


def font_en(size, bold=False):
    cands = []
    if bold:
        cands.append(Path("C:/Windows/Fonts/seguibd.ttf"))
    cands += [
        Path("C:/Windows/Fonts/segui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for c in cands:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return font(size, bold)


FZ = {
    "h1": font(26, bold=True),
    "h2": font(20, bold=True),
    "h3": font(16, bold=True),
    "body": font(14),
    "small": font(12),
    "tiny": font(11),
}
FE = {
    "h1": font_en(24, bold=True),
    "h2": font_en(18, bold=True),
    "h3": font_en(15, bold=True),
    "body": font_en(13),
    "small": font_en(11),
    "tiny": font_en(10),
}


def rect(d, xy, fill, outline=C["text"], width=3):
    xy = tuple(int(v) for v in xy)
    d.rectangle(xy, fill=fill, outline=outline, width=width)


def rounded_rect(d, xy, radius, fill, outline=C["text"], width=3):
    xy = tuple(int(v) for v in xy)
    d.rounded_rectangle(xy, radius=int(radius), fill=fill, outline=outline, width=int(width))


def text(d, xy, value, fill=C["text"], f=None, anchor=None):
    d.text(xy, value, fill=fill, font=f or FZ["body"], anchor=anchor)


def wrap_text(d, txt, max_w, f):
    lines = []
    for segment in txt.split("\n"):
        cur = ""
        for ch in segment:
            t = cur + ch
            if d.textlength(t, font=f) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
        lines.append("")
    return [l for l in lines if l is not None]


def base_bg(w, h):
    # Solid background (no dot/grid pattern — user found it visually busy)
    img = Image.new("RGB", (w, h), C["paper"])
    d = ImageDraw.Draw(img)
    return img, d


# ════════════════════════════════════════════════
# SMALL PROMO (440 x 280)
# ══════════════════════════════════════════════
def small_promo():
    W, H = 440, 280
    img, d = base_bg(W, H)

    # ── Top brand title (English only) ──
    text(d, (12, 4), "PinMate", fill=C["primary"], f=FE["h2"])
    text(d, (12, 28), "AI Pinterest Assistant", fill=C["sub"], f=font(10))

    # ── Left: mini PinMate panel mockup (real structure) ──
    px, py = 12, 46
    pw, ph = 196, 222
    # shadow
    rect(d, (px + 4, py + 4, px + pw + 4, py + ph + 4), "#e8d0d4", width=0)
    rounded_rect(d, (px, py, px + pw, py + ph), radius=12,
                 fill=C["bg"], outline=C["border"], width=1)

    # panel header
    hdr_h = 28
    rounded_rect(d, (px, py, px + pw, py + hdr_h), radius=12,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((px, py + 14, px + pw, py + hdr_h), fill=C["surface"])
    d.line([(px, py + hdr_h), (px + pw, py + hdr_h)], fill=C["border"], width=1)
    text(d, (px + 8, py + 6), "PinMate", f=FE["tiny"])
    text(d, (px + 8, py + 16), "AI Ready", fill=C["ok"], f=FE["tiny"])

    # Generate button
    gbtn_y = py + hdr_h + 4
    rounded_rect(d, (px + 6, gbtn_y, px + pw - 6, gbtn_y + 20), radius=6,
                 fill=C["primary"], width=0)
    text(d, (px + pw // 2, gbtn_y + 10), "Generate",
         fill="white", f=FE["tiny"], anchor="mm")

    # 3 field cards (compact): title + Copy mini (top-right) + 1 line + Insert
    cards = [
        ("Title", "Sage Green Living Room", "Copy"),
        ("Description", "Audience + keywords", "Copy"),
        ("Alt Text", "Cream chair with plants", "Copy"),
    ]
    cy = gbtn_y + 22
    ch = 44
    cgap = 5
    f_body = font_en(9)
    f_insert = font_en(8)
    for (ctitle, cbody, cbtn) in cards:
        rounded_rect(d, (px + 6, cy, px + pw - 6, cy + ch), radius=5,
                     fill=C["surface"], outline=C["border"], width=1)
        # title (red, left)
        text(d, (px + 10, cy + 5), ctitle, fill=C["primary"], f=font_en(9, bold=True))
        # Copy mini button (top-right)
        cbtn_w = 32
        bx1 = px + pw - 6 - cbtn_w
        bx2 = px + pw - 10
        rounded_rect(d, (bx1, cy + 3, bx2, cy + 14), radius=3,
                     fill=C["bg"], width=1)
        text(d, ((bx1 + bx2) // 2, cy + 9), cbtn,
             fill=C["sub"], f=font_en(8), anchor="mm")
        # body line
        text(d, (px + 10, cy + 18), cbody, f=f_body)
        # Insert button (bottom of card) — shortened for 440px canvas
        by1 = cy + ch - 15
        by2 = cy + ch - 4
        rounded_rect(d, (px + 10, by1, px + pw - 10, by2), radius=3,
                     fill=C["primary"], width=0)
        text(d, (px + pw // 2, (by1 + by2) // 2), "Insert",
             fill="white", f=f_insert, anchor="mm")
        cy += ch + cgap

    # ── Right: feature list (English only, colored dot icon) ──
    rx = 216
    features = [
        ("One-Click Gen", C["mint"]),
        ("AI-Powered", C["lavender"]),
        ("Smart SEO", C["cream"]),
        ("Auto-Fill", C["sky"]),
        ("Multilingual", C["secondary"]),
    ]
    fy0 = 48
    fh = 32
    fgap = 5
    f_feat = font_en(10)
    for i, (title, color) in enumerate(features):
        fy = fy0 + i * (fh + fgap)
        rounded_rect(d, (rx, fy, W - 12, fy + fh), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        # color dot as icon
        d.ellipse((rx + 10, fy + 10, rx + 22, fy + 22), fill=color,
                  outline=C["text"], width=1)
        text(d, (rx + 30, fy + fh // 2), title, f=f_feat, anchor="lm")

    # ── Bottom CTA (full width) — centered English text ──
    cta_y = 262
    cta_h = 14
    rounded_rect(d, (12, cta_y, W - 12, cta_y + cta_h), radius=6,
                 fill=C["primary"], width=0)
    text(d, (W // 2, cta_y + cta_h // 2), "Try It Now", fill="white",
         f=font_en(10), anchor="mm")

    img.save(OUT / "promo-small-440x280.png")
    print(f"  [OK] {OUT / 'promo-small-440x280.png'}")


# ════════════════════════════════════════════════
# LARGE PROMO (1400 x 560)
# ══════════════════════════════════════════════
def large_promo():
    W, H = 1400, 560
    img, d = base_bg(W, H)

    # ── Slogan directly on light-pink bg (English only) ──
    text(d, (40, 10), "Make Every Pin Discoverable",
         fill=C["primary"], f=font_en(36, bold=True))
    text(d, (40, 56), "Generate SEO titles, descriptions, tags & Alt Text in one click",
         fill=C["text"], f=font_en(15))
    text(d, (40, 82), "Analyze any Pin image and fill content into Pinterest instantly.",
         fill=C["sub"], f=font_en(12))

    # ── Content area: 3 columns ──

    # Col 1: PinMate panel mockup (left) — real structure
    pm_x, pm_y = 40, 150
    pm_w, pm_h = 380, 400
    # shadow
    rect(d, (pm_x + 6, pm_y + 6, pm_x + pm_w + 6, pm_y + pm_h + 6), "#e8d0d4", width=0)
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + pm_h), radius=16,
                 fill=C["bg"], outline=C["border"], width=1)

    # Panel header
    hdr_h = 56
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + hdr_h), radius=16,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((pm_x, pm_y + 26, pm_x + pm_w, pm_y + hdr_h), fill=C["surface"])
    d.line([(pm_x, pm_y + hdr_h), (pm_x + pm_w, pm_y + hdr_h)], fill=C["border"], width=1)
    text(d, (pm_x + 16, pm_y + 14), "PinMate", f=font_en(17, bold=True))
    text(d, (pm_x + 16, pm_y + 40), "AI Pinterest Assistant", fill=C["sub"], f=font_en(11))
    # status pill
    pill_text = "AI Ready"
    pf = font_en(12, bold=True)
    pill_w = d.textlength(pill_text, font=pf) + 28
    pill_x = pm_x + pm_w - pill_w - 14
    rounded_rect(d, (pill_x, pm_y + 20, pill_x + pill_w, pm_y + 44), radius=10,
                 fill="#e8f5e9", outline=C["ok"], width=1)
    text(d, (pill_x + pill_w // 2, pm_y + 32), pill_text, fill=C["ok"],
         f=pf, anchor="mm")

    # Big generate button
    gen_btn_y = pm_y + hdr_h + 12
    rounded_rect(d, (pm_x + 16, gen_btn_y, pm_x + pm_w - 16, gen_btn_y + 46), radius=14,
                 fill=C["primary"], width=0)
    text(d, (pm_x + pm_w // 2, gen_btn_y + 23), "Generate",
         fill="white", f=font_en(18, bold=True), anchor="mm")

    # 3 field cards: title + Copy mini (top-right) + 1 line + Insert to Pinterest
    cards = [
        ("Title", "Modern Minimalist Living Room Inspiration", "Copy"),
        ("Description", "Target: homeowners, DIY lovers", "Copy"),
        ("Tags", "homedecor, interiordesign, minimal", "Copy All"),
    ]
    card_y = gen_btn_y + 52
    ch = 82
    cgap = 8
    for (ctitle, cbody, cbtn) in cards:
        rounded_rect(d, (pm_x + 16, card_y, pm_x + pm_w - 16, card_y + ch), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (pm_x + 24, card_y + 10), ctitle, fill=C["primary"],
             f=font_en(12, bold=True))
        # Copy mini button (top-right)
        cbtn_w = 68 if cbtn == "Copy All" else 48
        bx1 = pm_x + pm_w - 16 - cbtn_w
        bx2 = pm_x + pm_w - 24
        rounded_rect(d, (bx1, card_y + 8, bx2, card_y + 28), radius=5,
                     fill=C["bg"], width=1)
        text(d, ((bx1 + bx2) // 2, card_y + 18), cbtn,
             fill=C["sub"], f=font_en(10), anchor="mm")
        # body line
        text(d, (pm_x + 24, card_y + 38), cbody, f=font_en(11))
        # Insert to Pinterest button (bottom of card)
        rounded_rect(d, (pm_x + 24, card_y + ch - 20, pm_x + pm_w - 24, card_y + ch - 6),
                     radius=5, fill=C["primary"], width=0)
        text(d, (pm_x + pm_w // 2, card_y + ch - 13), "Insert to Pinterest",
             fill="white", f=font_en(11, bold=True), anchor="mm")
        card_y += ch + cgap

    # ── Col 2: Feature highlights (center) ──
    cx = 450
    cy = 160

    # Section title
    text(d, (cx, cy), "Core Features", f=font_en(24, bold=True))

    feat_items = [
        ("One-Click Generation",
         "Analyze any Pin image and generate title + description instantly",
         C["mint"]),
        ("AI-Powered",
         "Use SiliconFlow, OpenAI or any custom endpoint you prefer",
         C["lavender"]),
        ("Smart SEO",
         "Auto-generates keywords & Alt Text for better discoverability",
         C["cream"]),
        ("Auto-Fill",
         "Insert generated content directly into Pinterest Create Pin page",
         C["sky"]),
        ("Multilingual",
         "Switch UI between Chinese/English and customize output language",
         C["secondary"]),
    ]

    item_h = 66
    item_gap = 8
    for i, (ten, den, color) in enumerate(feat_items):
        fy = cy + 36 + i * (item_h + item_gap)
        # Feature row container
        rounded_rect(d, (cx, fy, cx + 480, fy + item_h), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        # Color accent bar on left
        d.rectangle((cx, fy + 4, cx + 5, fy + item_h - 4), fill=color)
        # Icon circle
        d.ellipse((cx + 16, fy + 16, cx + 40, fy + 40), fill=color,
                  outline=C["text"], width=1)
        # Titles
        text(d, (cx + 52, fy + 14), ten, f=font_en(15, bold=True))
        text(d, (cx + 52, fy + 42), den, fill=C["sub"], f=font_en(11))

    # ── Col 3: CTA + highlights (right) ──
    rx = 960
    ry = 170

    # CTA box
    cta_box_w = 400
    cta_box_h = 228
    rounded_rect(d, (rx, ry, rx + cta_box_w, ry + cta_box_h), radius=16,
                 fill=C["surface"], outline=C["primary"], width=3)

    # CTA headline
    text(d, (rx + 30, ry + 22), "Install for Free", f=font_en(28, bold=True))
    text(d, (rx + 30, ry + 58), "PinMate for Chrome", fill=C["sub"], f=font_en(17, bold=True))

    # Sub-text
    sub_lines = [
        "No sign-up required",
        "All features free",
        "Bilingual UI (EN & CN)",
    ]
    sy = ry + 94
    for sl in sub_lines:
        text(d, (rx + 30, sy), sl, fill=C["sub"], f=font_en(12))
        sy += 23

    # Big CTA button — vertically & horizontally centered English text
    btn_h = 42
    btn_y = ry + cta_box_h - btn_h - 20  # 20px bottom safety margin
    rounded_rect(d, (rx + 30, btn_y, rx + cta_box_w - 30, btn_y + btn_h), radius=12,
                 fill=C["primary"], width=0)
    text(d, (rx + cta_box_w // 2, btn_y + btn_h // 2), "Try It Now",
         fill="white", f=font_en(16, bold=True), anchor="mm")

    # (Removed fabricated trust badges: no ratings, no active users, no
    # "Verified Publisher" claim — extension is not yet published.)

    img.save(OUT / "promo-large-1400x560.png")
    print(f"  [OK] {OUT / 'promo-large-1400x560.png'}")


if __name__ == "__main__":
    print("\nGenerating PinMate promo images...")
    print("=" * 45)
    small_promo()
    large_promo()
    print(f"\nDone! Output: {OUT}")
