"""
PinMate Store Promo Images Generator
Generates BILINGUAL (Chinese + English) promo tiles for Chrome Web Store.
Output: store-assets/promo/promo-small-440x280.png, promo-large-1400x560.png

Notes:
- Bilingual by design: the store needs both languages present in the same image.
  Chinese runs through font_cjk() (Microsoft YaHei) — Segoe UI has no CJK glyphs.
- Information is deliberately sparse: 3 highlight rows, no bullet walls.
- No emoji anywhere (PIL CJK fonts render emoji as tofu boxes). Icons are dots.
- No promo/absolute wording ("free", "no sign-up", "best"): the store copy
  policy rejects it.
- Bottom safety line: every block stays >=12px above the canvas bottom edge.
- Buttons center their label with anchor="mm" at the button's mid-height.

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
    "cream":     "#e6b800",
    "lavender":  "#b388ff",
    "sky":       "#75bfe8",
}


def font_en(size, bold=False):
    """Latin-only font — used for the simulated UI text inside panel mockups."""
    cands = []
    if bold:
        cands.append(Path("C:/Windows/Fonts/seguisb.ttf"))
    cands += [
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for c in cands:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return font_cjk(size, bold)


def font_cjk(size, bold=False):
    """Microsoft YaHei — the only way Chinese renders (and it handles Latin too),
    so every bilingual string must go through this."""
    cands = [
        Path("C:/Windows/Fonts/msyhbd.ttc") if bold else Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]
    for c in cands:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default()


# FC = bilingual (CJK-capable) sizes, FE = Latin-only sizes for UI mockups.
FC = {
    "h1":   font_cjk(34, bold=True),
    "h2":   font_cjk(24, bold=True),
    "h3":   font_cjk(15, bold=True),
    "body": font_cjk(13),
    "small": font_cjk(12),
    "tiny": font_cjk(10),
    "micro": font_cjk(9),
}
FE = {
    "h1": font_en(24, bold=True),
    "h2": font_en(18, bold=True),
    "h3": font_en(15, bold=True),
    "body": font_en(13),
    "small": font_en(11),
    "tiny": font_en(10),
    "micro": font_en(9),
}


def rect(d, xy, fill, outline=C["text"], width=3):
    d.rectangle(tuple(int(v) for v in xy), fill=fill, outline=outline, width=width)


def rounded_rect(d, xy, radius, fill, outline=C["text"], width=3):
    d.rounded_rectangle(tuple(int(v) for v in xy), radius=int(radius),
                        fill=fill, outline=outline, width=int(width))


def text(d, xy, value, fill=C["text"], f=None, anchor=None):
    d.text(xy, value, fill=fill, font=f or FC["body"], anchor=anchor)


def base_bg(w, h):
    # Solid background (no dot/grid pattern — user found it visually busy)
    img = Image.new("RGB", (w, h), C["paper"])
    return img, ImageDraw.Draw(img)


# ════════════════════════════════════════════════
# SMALL PROMO (440 x 280) — bilingual, 3 highlights
# ══════════════════════════════════════════════
def small_promo():
    W, H = 440, 280
    img, d = base_bg(W, H)

    # ── Brand header (bilingual) ──
    text(d, (12, 2), "PinMate", fill=C["primary"], f=font_cjk(22, bold=True))
    text(d, (12, 31), "AI Pinterest 助手 · AI Pinterest Assistant", fill=C["sub"], f=FC["micro"])

    # ── Left: mini PinMate panel mockup (real structure, UI text in English) ──
    # py/ph sized so the panel clears the bottom CTA with the >=12px safe line.
    px, py = 12, 46
    pw, ph = 196, 200
    rect(d, (px + 4, py + 4, px + pw + 4, py + ph + 4), "#e8d0d4", width=0)
    rounded_rect(d, (px, py, px + pw, py + ph), radius=12,
                 fill=C["bg"], outline=C["border"], width=1)

    hdr_h = 28
    rounded_rect(d, (px, py, px + pw, py + hdr_h), radius=12,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((px, py + 14, px + pw, py + hdr_h), fill=C["surface"])
    d.line([(px, py + hdr_h), (px + pw, py + hdr_h)], fill=C["border"], width=1)
    text(d, (px + 8, py + 6), "PinMate", f=FE["tiny"])
    text(d, (px + 8, py + 16), "AI Ready", fill=C["ok"], f=FE["micro"])

    gbtn_y = py + hdr_h + 4
    rounded_rect(d, (px + 6, gbtn_y, px + pw - 6, gbtn_y + 20), radius=6,
                 fill=C["primary"], width=0)
    text(d, (px + pw // 2, gbtn_y + 10), "Generate",
         fill="white", f=FE["micro"], anchor="mm")

    cards = [
        ("Title", "Sage Green Living Room", "Copy"),
        ("Description", "Audience + keywords", "Copy"),
        ("Tags", "homedecor, sagegreen", "Copy All"),
    ]
    cy = gbtn_y + 22
    ch = 44
    cgap = 3
    for (ctitle, cbody, cbtn) in cards:
        rounded_rect(d, (px + 6, cy, px + pw - 6, cy + ch), radius=5,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (px + 10, cy + 5), ctitle, fill=C["primary"], f=font_en(9, bold=True))
        cbtn_w = 30 if cbtn == "Copy" else 42
        bx1 = px + pw - 6 - cbtn_w
        bx2 = px + pw - 10
        rounded_rect(d, (bx1, cy + 3, bx2, cy + 14), radius=3, fill=C["bg"], width=1)
        text(d, ((bx1 + bx2) // 2, cy + 9), cbtn, fill=C["sub"], f=FE["micro"], anchor="mm")
        text(d, (px + 10, cy + 18), cbody, f=font_en(9))
        by1 = cy + ch - 15
        by2 = cy + ch - 4
        rounded_rect(d, (px + 10, by1, px + pw - 10, by2), radius=3,
                     fill=C["primary"], width=0)
        text(d, (px + pw // 2, (by1 + by2) // 2), "Insert",
             fill="white", f=FE["micro"], anchor="mm")
        cy += ch + cgap

    # ── Right: 3 bilingual highlights (colored dot icon, no emoji) ──
    rx = 216
    highlights = [
        ("一键生成 · One-Click", "AI 读懂图片，写出标题与描述", C["mint"]),
        ("商品链接 · Product Links", "粘贴商品链接，自动填入", C["lavender"]),
        ("自动填入 · Auto-Fill", "内容一键写进 Pinterest", C["sky"]),
    ]
    fy0 = 52
    fh = 56
    fgap = 8
    for i, (title, desc, color) in enumerate(highlights):
        fy = fy0 + i * (fh + fgap)
        rounded_rect(d, (rx, fy, W - 12, fy + fh), radius=9,
                     fill=C["surface"], outline=C["border"], width=1)
        d.ellipse((rx + 10, fy + 20, rx + 26, fy + 36), fill=color,
                  outline=C["text"], width=1)
        text(d, (rx + 34, fy + 8), title, f=font_cjk(11, bold=True))
        text(d, (rx + 34, fy + 29), desc, fill=C["sub"], f=FC["micro"])

    # ── Bottom CTA (full width) — bilingual, centered ──
    # 252 + 16 = 268 → 12px bottom safe margin on a 280px canvas.
    cta_y = 252
    cta_h = 16
    rounded_rect(d, (12, cta_y, W - 12, cta_y + cta_h), radius=6,
                 fill=C["primary"], width=0)
    text(d, (W // 2, cta_y + cta_h // 2), "立即体验 · Try It Now", fill="white",
         f=FC["small"], anchor="mm")

    img.save(OUT / "promo-small-440x280.png")
    print(f"  [OK] {OUT / 'promo-small-440x280.png'}")


# ════════════════════════════════════════════════
# LARGE PROMO (1400 x 560) — bilingual, 3 highlights
# ══════════════════════════════════════════════
def large_promo():
    W, H = 1400, 560
    img, d = base_bg(W, H)

    # ── Slogan block (bilingual, Chinese leads) ──
    text(d, (40, 2), "让每张 Pin 都被看见", fill=C["primary"], f=FC["h1"])
    text(d, (40, 48), "Make Every Pin Discoverable", fill=C["text"], f=font_en(17, bold=True))
    text(d, (40, 76), "AI 读懂图片，生成标题、描述、标签与商品链接",
         fill=C["sub"], f=FC["small"])
    text(d, (40, 96), "Generate SEO content from your Pin image — filled into Pinterest in one click",
         fill=C["sub"], f=font_en(11))

    # ── Col 1: PinMate panel mockup (UI text in English) ──
    pm_x, pm_y = 40, 140
    pm_w, pm_h = 380, 390
    rect(d, (pm_x + 6, pm_y + 6, pm_x + pm_w + 6, pm_y + pm_h + 6), "#e8d0d4", width=0)
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + pm_h), radius=16,
                 fill=C["bg"], outline=C["border"], width=1)

    hdr_h = 56
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + hdr_h), radius=16,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((pm_x, pm_y + 26, pm_x + pm_w, pm_y + hdr_h), fill=C["surface"])
    d.line([(pm_x, pm_y + hdr_h), (pm_x + pm_w, pm_y + hdr_h)], fill=C["border"], width=1)
    text(d, (pm_x + 16, pm_y + 14), "PinMate", f=font_en(17, bold=True))
    text(d, (pm_x + 16, pm_y + 40), "AI Pinterest Assistant", fill=C["sub"], f=font_en(11))
    pill_text = "AI Ready"
    pf = font_en(12, bold=True)
    pill_w = d.textlength(pill_text, font=pf) + 28
    pill_x = pm_x + pm_w - pill_w - 14
    rounded_rect(d, (pill_x, pm_y + 20, pill_x + pill_w, pm_y + 44), radius=10,
                 fill="#e8f5e9", outline=C["ok"], width=1)
    text(d, (pill_x + pill_w // 2, pm_y + 32), pill_text, fill=C["ok"], f=pf, anchor="mm")

    gen_btn_y = pm_y + hdr_h + 12
    rounded_rect(d, (pm_x + 16, gen_btn_y, pm_x + pm_w - 16, gen_btn_y + 46), radius=14,
                 fill=C["primary"], width=0)
    text(d, (pm_x + pm_w // 2, gen_btn_y + 23), "Generate",
         fill="white", f=font_en(18, bold=True), anchor="mm")

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
        text(d, (pm_x + 24, card_y + 10), ctitle, fill=C["primary"], f=font_en(12, bold=True))
        cbtn_w = 68 if cbtn == "Copy All" else 48
        bx1 = pm_x + pm_w - 16 - cbtn_w
        bx2 = pm_x + pm_w - 24
        rounded_rect(d, (bx1, card_y + 8, bx2, card_y + 28), radius=5, fill=C["bg"], width=1)
        text(d, ((bx1 + bx2) // 2, card_y + 18), cbtn, fill=C["sub"], f=font_en(10), anchor="mm")
        text(d, (pm_x + 24, card_y + 38), cbody, f=font_en(11))
        rounded_rect(d, (pm_x + 24, card_y + ch - 20, pm_x + pm_w - 24, card_y + ch - 6),
                     radius=5, fill=C["primary"], width=0)
        text(d, (pm_x + pm_w // 2, card_y + ch - 13), "Insert to Pinterest",
             fill="white", f=font_en(11, bold=True), anchor="mm")
        card_y += ch + cgap

    # ── Col 2: 3 bilingual highlights ──
    cx = 450
    highlights = [
        ("一键生成 · One-Click Generation",
         "AI 读懂图片，写出 SEO 标题、描述与标签",
         "AI writes SEO titles, descriptions and tags from your image",
         C["mint"]),
        ("商品链接 · Product Links",
         "粘贴商品链接，链接与产品标签一起填好",
         "Paste a product link — the link and product tag fill themselves",
         C["lavender"]),
        ("中英双语 · Bilingual",
         "界面与生成内容随时切换语言",
         "Switch the interface and the generated text any time",
         C["sky"]),
    ]
    item_h = 96
    item_gap = 10
    fy0 = 176
    for i, (title, cn_desc, en_desc, color) in enumerate(highlights):
        fy = fy0 + i * (item_h + item_gap)
        rounded_rect(d, (cx, fy, cx + 480, fy + item_h), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        d.rectangle((cx, fy + 4, cx + 5, fy + item_h - 4), fill=color)
        d.ellipse((cx + 16, fy + 20, cx + 44, fy + 48), fill=color,
                  outline=C["text"], width=1)
        text(d, (cx + 58, fy + 14), title, f=font_cjk(15, bold=True))
        text(d, (cx + 58, fy + 44), cn_desc, fill=C["text"], f=FC["small"])
        text(d, (cx + 58, fy + 64), en_desc, fill=C["sub"], f=font_en(10))

    # ── Col 3: CTA box (bilingual) ──
    rx = 960
    ry = 170
    cta_w = 400
    cta_h = 228
    rounded_rect(d, (rx, ry, rx + cta_w, ry + cta_h), radius=16,
                 fill=C["surface"], outline=C["primary"], width=3)

    text(d, (rx + 30, ry + 24), "PinMate for Chrome", f=font_en(24, bold=True))
    text(d, (rx + 30, ry + 60), "AI Pinterest 助手", fill=C["sub"], f=font_cjk(15, bold=True))

    # Factual only — never promo/absolute wording ("free", "best", ...).
    sub_lines = [
        "一键生成 · 自动填入",
        "中英双语界面 · Bilingual UI",
    ]
    sy = ry + 96
    for sl in sub_lines:
        text(d, (rx + 30, sy), sl, fill=C["sub"], f=FC["small"])
        sy += 24

    btn_h = 42
    btn_y = ry + cta_h - btn_h - 20  # 20px bottom safety margin inside the box
    rounded_rect(d, (rx + 30, btn_y, rx + cta_w - 30, btn_y + btn_h), radius=12,
                 fill=C["primary"], width=0)
    text(d, (rx + cta_w // 2, btn_y + btn_h // 2), "立即体验 · Try It Now",
         fill="white", f=font_cjk(15, bold=True), anchor="mm")

    img.save(OUT / "promo-large-1400x560.png")
    print(f"  [OK] {OUT / 'promo-large-1400x560.png'}")


if __name__ == "__main__":
    print("\nGenerating PinMate promo images (bilingual)...")
    print("=" * 45)
    small_promo()
    large_promo()
    print(f"\nDone! Output: {OUT}")
