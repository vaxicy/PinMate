"""
PinMate Store Promo Images Generator
Generates bilingual (zh+en) promo tiles for Chrome Web Store.
Output: store-assets/promo/promo-small-440x280.png, promo-large-1400x560.png

Notes:
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
    cands = []
    if bold:
        cands += [
            Path("C:/Windows/Fonts/msyhbd.ttc"),
            Path("C:/Windows/Fonts/simhei.ttf"),
        ]
    cands += [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
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
    d.rectangle(xy, fill=fill, outline=outline, width=width)


def rounded_rect(d, xy, radius, fill, outline=C["text"], width=3):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


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

    # ── Top brand title (no red bar) ──
    text(d, (12, 4), "PinMate", fill=C["primary"], f=font(20, bold=True))
    text(d, (12, 30), "AI Pinterest Assistant", fill=C["sub"], f=FE["tiny"])

    # ── Left: mini PinMate panel mockup ──
    px, py = 12, 52
    pw, ph = 180, 192
    # shadow
    rect(d, (px + 4, py + 4, px + pw + 4, py + ph + 4), "#e8d0d4", width=0)
    rounded_rect(d, (px, py, px + pw, py + ph), radius=12,
                 fill=C["bg"], outline=C["border"], width=1)

    # panel header
    hdr_h = 34
    rounded_rect(d, (px, py, px + pw, py + hdr_h), radius=12,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((px, py + 16, px + pw, py + hdr_h), fill=C["surface"])
    d.line([(px, py + hdr_h), (px + pw, py + hdr_h)], fill=C["border"], width=1)
    # brand name only (no logo circle — too small at this scale)
    text(d, (px + 10, py + 10), "PinMate", f=font(12, bold=True))
    text(d, (px + 10, py + 24), "AI Ready", fill=C["ok"], f=font(7))

    # big button inside mockup — centered, bilingual
    btn_y = py + hdr_h + 10
    rounded_rect(d, (px + 8, btn_y, px + pw - 8, btn_y + 30), radius=8,
                 fill=C["primary"], width=0)
    text(d, (px + pw // 2, btn_y + 15), "一键生成 · Generate",
         fill="white", f=font(10, bold=True), anchor="mm")

    # result preview inside mockup — bilingual labels (4 real fields)
    res_y = btn_y + 34
    rounded_rect(d, (px + 8, res_y, px + pw - 8, res_y + 84), radius=6,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (px + 14, res_y + 3), "标题 Title", fill=C["primary"], f=font(8, bold=True))
    text(d, (px + 14, res_y + 14), "现代简约客厅灵感 | 10㎡...", f=font(7))
    text(d, (px + 14, res_y + 28), "描述 Desc.", fill=C["primary"], f=font(8, bold=True))
    text(d, (px + 14, res_y + 39), "目标受众... + 关键词", f=font(7))
    text(d, (px + 14, res_y + 53), "Alt 替代文字 Alt", fill=C["primary"], f=font(8, bold=True))
    text(d, (px + 14, res_y + 64), "白沙发配绿植与木质茶几", f=font(7))

    # footer of mockup — bilingual
    ft_y = py + ph - 26
    text(d, (px + 10, ft_y + 6), "设置 · Settings", fill="#0064c8", f=font(9))
    rounded_rect(d, (px + pw - 50, ft_y + 2, px + pw - 8, ft_y + 22), radius=4,
                 fill=C["primary"], width=0)
    text(d, (px + pw - 29, ft_y + 12), "中文/EN", fill="white", f=font(8, bold=True), anchor="mm")

    # ── Right: feature list (no emoji, colored dot only) ──
    rx = 204
    features = [
        ("一键生成", "One-Click Generate", C["mint"]),
        ("AI 驱动", "AI-Powered", C["lavender"]),
        ("智能 SEO", "Smart SEO", C["cream"]),
        ("自动填入", "Auto-Fill", C["sky"]),
        ("多语言", "Multilingual", C["secondary"]),
    ]
    fy0 = 54
    fh = 34
    fgap = 6
    for i, (title_zh, title_en, color) in enumerate(features):
        fy = fy0 + i * (fh + fgap)
        rounded_rect(d, (rx, fy, W - 12, fy + fh), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        # color dot as icon
        d.ellipse((rx + 10, fy + 11, rx + 24, fy + 25), fill=color,
                  outline=C["text"], width=1)
        text(d, (rx + 32, fy + 4), title_zh, f=FZ["small"])
        text(d, (rx + 32, fy + 20), title_en, fill=C["sub"], f=FE["tiny"])

    # ── Bottom CTA (full width) — centered text ──
    cta_y = 252
    cta_h = 20
    rounded_rect(d, (12, cta_y, W - 12, cta_y + cta_h), radius=8,
                 fill=C["primary"], width=0)
    cta_text = "立即体验 · Try It Now"
    text(d, (W // 2, cta_y + cta_h // 2), cta_text, fill="white",
         f=font(12, bold=True), anchor="mm")

    img.save(OUT / "promo-small-440x280.png")
    print(f"  [OK] {OUT / 'promo-small-440x280.png'}")


# ════════════════════════════════════════════════
# LARGE PROMO (1400 x 560)
# ══════════════════════════════════════════════
def large_promo():
    W, H = 1400, 560
    img, d = base_bg(W, H)

    # ── Slogan directly on light-pink bg (no red banner) ──
    text(d, (40, 14), "让每张 Pin 都被看见",
         fill=C["primary"], f=font(38, bold=True))
    text(d, (42, 78), "Make Every Pin Discoverable",
         fill=C["text"], f=font_en(22, bold=True))
    sub_text = ("AI 一键生成 SEO 标题 / 描述 / 关键词 / Alt 文字 · 中英文界面")
    text(d, (40, 116), sub_text, fill=C["text"], f=FZ["body"])

    # ── Content area: 3 columns ──

    # Col 1: PinMate panel mockup (left)
    pm_x, pm_y = 40, 156
    pm_w, pm_h = 380, 360
    # shadow
    rect(d, (pm_x + 6, pm_y + 6, pm_x + pm_w + 6, pm_y + pm_h + 6), "#e8d0d4", width=0)
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + pm_h), radius=16,
                 fill=C["bg"], outline=C["border"], width=1)

    # Panel header
    hdr_h = 54
    rounded_rect(d, (pm_x, pm_y, pm_x + pm_w, pm_y + hdr_h), radius=16,
                 fill=C["surface"], outline=C["border"], width=1)
    d.rectangle((pm_x, pm_y + 22, pm_x + pm_w, pm_y + hdr_h), fill=C["surface"])
    d.line([(pm_x, pm_y + hdr_h), (pm_x + pm_w, pm_y + hdr_h)], fill=C["border"], width=1)
    # brand name only (no logo circle — keep it clean at this scale)
    text(d, (pm_x + 16, pm_y + 16), "PinMate", f=font(18, bold=True))
    text(d, (pm_x + 16, pm_y + 40), "AI Pinterest 助手", fill=C["sub"], f=font(11))
    # status pill — width auto-sized to text, 14px padding on right edge
    pill_text = "AI 就绪"
    pf = font(12, bold=True)
    pill_w = d.textlength(pill_text, font=pf) + 28
    pill_x = pm_x + pm_w - pill_w - 14
    rounded_rect(d, (pill_x, pm_y + 18, pill_x + pill_w, pm_y + 42), radius=10,
                 fill="#e8f5e9", outline=C["ok"], width=1)
    text(d, (pill_x + pill_w // 2, pm_y + 30), pill_text, fill=C["ok"],
         f=pf, anchor="mm")

    # Big generate button
    gen_btn_y = pm_y + hdr_h + 14
    rounded_rect(d, (pm_x + 16, gen_btn_y, pm_x + pm_w - 16, gen_btn_y + 50), radius=14,
                 fill=C["primary"], width=0)
    text(d, (pm_x + pm_w // 2, gen_btn_y + 25), "一键生成标题描述",
         fill="white", f=font(18, bold=True), anchor="mm")

    # Result cards inside panel — 4 fields: 图片分析 / 标题 / 描述 / 关键词+Alt
    card_y = gen_btn_y + 56
    cw = pm_w - 32

    # Analysis card
    rounded_rect(d, (pm_x + 16, card_y, pm_x + pm_w - 16, card_y + 44), radius=10,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (pm_x + 24, card_y + 4), "图片分析", fill=C["primary"],
         f=font(12, bold=True))
    text(d, (pm_x + 24, card_y + 22),
         "现代简约客厅，白沙发、绿植、木质茶几",
         f=FZ["tiny"])

    # Title card
    card_y += 52
    rounded_rect(d, (pm_x + 16, card_y, pm_x + pm_w - 16, card_y + 44), radius=10,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (pm_x + 24, card_y + 4), "Pinterest 标题", fill=C["primary"],
         f=font(12, bold=True))
    text(d, (pm_x + 24, card_y + 22),
         "现代简约客厅灵感 | 10㎡高级感家居",
         f=FZ["tiny"])
    # copy button
    rounded_rect(d, (pm_x + pm_w - 72, card_y + 14, pm_x + pm_w - 20, card_y + 32),
                 radius=5, fill=C["bg"], width=1)
    text(d, (pm_x + pm_w - 46, card_y + 23), "复制", fill=C["sub"],
         f=font(9), anchor="mm")

    # Description card
    card_y += 52
    rounded_rect(d, (pm_x + 16, card_y, pm_x + pm_w - 16, card_y + 50), radius=10,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (pm_x + 24, card_y + 4), "Pinterest 描述", fill=C["primary"],
         f=font(12, bold=True))
    text(d, (pm_x + 24, card_y + 22), "目标受众：装修房主、DIY爱好者",
         f=FZ["tiny"])
    text(d, (pm_x + 24, card_y + 38), "#家居灵感 #小户型 #简约风格",
         f=FZ["tiny"])
    rounded_rect(d, (pm_x + pm_w - 72, card_y + 20, pm_x + pm_w - 20, card_y + 38),
                 radius=5, fill=C["bg"], width=1)
    text(d, (pm_x + pm_w - 46, card_y + 29), "复制", fill=C["sub"],
         f=font(9), anchor="mm")

    # Keywords + Alt Text card (combined)
    card_y += 58
    rounded_rect(d, (pm_x + 16, card_y, pm_x + pm_w - 16, card_y + 54), radius=10,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (pm_x + 24, card_y + 4), "关键词 Tags", fill=C["primary"],
         f=font(12, bold=True))
    text(d, (pm_x + 24, card_y + 22), "#家居灵感 #小户型 #简约风格",
         f=FZ["tiny"])
    text(d, (pm_x + 24, card_y + 38), "Alt 替代文字: 白沙发配绿植与木质茶几",
         f=FZ["tiny"])

    # ── Col 2: Feature highlights (center) ──
    cx = 450
    cy = 160

    # Section title
    text(d, (cx, cy), "核心功能", f=font(24, bold=True))

    feat_items = [
        ("一键生成", "One-Click Generation",
         "分析任意 Pin 图片，瞬间生成标题 + 描述",
         "Analyze any Pin image and generate title + description instantly",
         C["mint"]),
        ("AI 智能", "AI-Powered",
         "支持硅基流动、OpenAI 或自定义端点",
         "Powered by SiliconFlow, OpenAI or any custom endpoint",
         C["lavender"]),
        ("SEO 优化", "Smart SEO",
         "自动生成关键词与 Alt 替代文字，提升曝光率",
         "Auto-generates keywords & Alt Text for better discoverability",
         C["cream"]),
        ("自动填入", "Auto-Fill",
         "一键写入 Pinterest 创建页输入框",
         "Insert generated content directly into Pinterest Create Pin page",
         C["sky"]),
        ("多语言", "Multilingual",
         "中英文界面自由切换，生成语言可自定义",
         "Switch UI between Chinese/English; customize output language",
         C["secondary"]),
    ]

    item_h = 62
    item_gap = 8
    for i, (tzh, ten, dzh, den, color) in enumerate(feat_items):
        fy = cy + 38 + i * (item_h + item_gap)
        # Feature row container
        rounded_rect(d, (cx, fy, cx + 480, fy + item_h), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        # Color accent bar on left
        d.rectangle((cx, fy + 4, cx + 5, fy + item_h - 4), fill=color)
        # Icon circle
        d.ellipse((cx + 16, fy + 14, cx + 40, fy + 38), fill=color,
                  outline=C["text"], width=1)
        # Titles
        text(d, (cx + 52, fy + 6), tzh, f=FZ["h3"])
        text(d, (cx + 52, fy + 26), ten, fill=C["sub"], f=FE["small"])
        # Description (Chinese)
        text(d, (cx + 52, fy + 44), dzh, fill=C["sub"], f=FZ["tiny"])

    # ── Col 3: CTA + trust badges (right) ──
    rx = 960
    ry = 160

    # CTA box
    cta_box_w = 400
    cta_box_h = 220
    rounded_rect(d, (rx, ry, rx + cta_box_w, ry + cta_box_h), radius=16,
                 fill=C["surface"], outline=C["primary"], width=3)

    # CTA headline
    text(d, (rx + 30, ry + 20), "立即免费使用", f=font(28, bold=True))
    text(d, (rx + 30, ry + 56), "Free to Install", fill=C["sub"], f=FE["h2"])

    # Sub-text
    sub_lines = [
        "无需注册 · No sign-up required",
        "免费功能全部可用 · All features free",
        "中英文界面 · Bilingual UI",
    ]
    sy = ry + 92
    for sl in sub_lines:
        text(d, (rx + 30, sy), sl, fill=C["sub"], f=FZ["body"])
        sy += 26

    # Big CTA button — centered text
    btn_y = ry + cta_box_h - 54
    rounded_rect(d, (rx + 30, btn_y, rx + cta_box_w - 30, btn_y + 42), radius=12,
                 fill=C["primary"], width=0)
    cta_btn_text = "立即体验 · Try It Now"
    text(d, (rx + cta_box_w // 2, btn_y + 21), cta_btn_text, fill="white",
         f=font(18, bold=True), anchor="mm")

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
