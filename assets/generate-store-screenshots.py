"""
PinMate Store Screenshots Generator
Generates 3 tutorial-style screenshots per language (zh / en) at 1280x800.
Usage:
  python assets/generate-store-screenshots.py          # both languages
  python assets/generate-store-screenshots.py --lang zh # Chinese only
  python assets/generate-store-screenshots.py --lang en # English only
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys, argparse

ROOT = Path(__file__).resolve().parents[1]
OUT_BASE = ROOT / "store-assets" / "screenshots"

# ── Brand colors (from css/style.css) ──
C = {
    "primary":    "#E60023",   # Pinterest red
    "primary_h":  "#c60020",
    "secondary":  "#FF6B81",
    "bg":         "#FFF5F6",   # light pink bg
    "surface":    "#ffffff",
    "text":       "#1f1f24",
    "sub":        "#6b6b73",
    "border":     "#f0dfe1",
    "ok":         "#1a9d55",   # success green
    "err":        "#d3202b",
    "panel_bg":   "#FFF5F6",
    "paper":      "#fef7f8",
    "grid":       "#fce4e8",
    "dot":        "#f8c0cb",
    "pinterest":  "#E60023",
    "mint":       "#67d6bd",
    "cream":      "#fff0a8",
    "lavender":   "#b388ff",
    "sky":        "#75bfe8",
    "link":       "#0064c8",
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
    """English font — Segoe UI or Arial."""
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


F = {
    "h1":    font(42, bold=True),
    "h2":    font(30, bold=True),
    "h3":    font(22, bold=True),
    "body":  font(19),
    "small": font(15),
    "tiny":  font(13),
    "mono":  font_en(14),
}
FE = {
    "h1":   font_en(40, bold=True),
    "h2":   font_en(28, bold=True),
    "h3":   font_en(21, bold=True),
    "body": font_en(18),
    "small": font_en(14),
    "tiny": font_en(12),
}


W, H = 1280, 800


# ── Shared helpers ──
def rect(draw, xy, fill, outline=C["text"], width=3):
    draw.rectangle(xy, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fill=C["text"], f=None, anchor=None):
    draw.text(xy, value, fill=fill, font=f or F["body"], anchor=anchor)


def rounded_rect(draw, xy, radius, fill, outline=C["text"], width=3):
    """Approximate rounded rect with small radius."""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(draw, txt, max_w, f):
    lines = []
    for segment in txt.split("\n"):
        cur = ""
        for ch in segment:
            t = cur + ch
            if draw.textlength(t, font=f) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = ch
        if cur:
            lines.append(cur)
        lines.append("")  # preserve line break
    return [l for l in lines if l is not None]  # drop trailing empty from last \n


def paragraph(draw, xy, txt, max_w, f=None, fill=C["sub"], leading=8):
    f = f or F["body"]
    x, y = xy
    for line in wrap_text(draw, txt, max_w, f):
        text(draw, (x, y), line, fill=fill, f=f)
        y += f.size + leading
    return y


def base_canvas():
    img = Image.new("RGB", (W, H), C["paper"])
    d = ImageDraw.Draw(img)
    # subtle grid
    for x in range(0, W, 28):
        d.line([(x, 0), (x, H)], fill=C["grid"], width=1)
    for y in range(0, H, 28):
        d.line([(0, y), (W, y)], fill=C["grid"], width=1)
    for x in range(14, W, 28):
        for y in range(14, H, 28):
            d.rectangle((x, y, x+2, y+2), fill=C["dot"])
    return img, d


# ── Browser chrome (address bar etc.) ──
def browser_chrome(d, url_text="pinterest.com/pin-builder/..."):
    # title bar
    rect(d, (0, 0, W, 36), C["surface"])
    # window controls
    d.ellipse((12, 8, 22, 18), fill="#ff5f57", outline="#e0443e", width=1)
    d.ellipse((28, 8, 38, 18), fill="#ffbd2e", outline="#dea123", width=1)
    d.ellipse((44, 8, 54, 18), fill="#27ca40", outline="#1aab29", width=1)
    # address bar
    rect(d, (72, 5, W-16, 31), C["bg"], width=1)
    text(d, (84, 8), url_text, fill=C["sub"], f=F["tiny"])


# ── Pinterest page mockup (simplified) ──
def pinterest_page(d, has_image=True, filled_title="", filled_desc="", lang="zh"):
    """Draw simplified Pinterest Create Pin page below browser chrome.
    lang controls all in-page labels so the English screenshot is fully English."""
    T = {
        "zh": {
            "draft": "Pin 图草稿", "new": "新建", "choose": "选择文件或拖放",
            "create": "创建 Pin 图", "profile": "正在处理·你的个人资料",
            "preview": "Pin 图片预览", "save_site": "从网站收藏",
            "drop": "选择一个文件或拖放文件到此处",
            "title": "标题", "title_ph": "简要描述你的 Pin 图",
            "desc": "描述", "desc_ph": "描述你的 Pin 图",
            "link": "链接", "link_ph": "添加链接",
            "board": "板块", "board_val": "家居灵感",
            "tags": "标记主题 (0)", "tags_ph": "搜索标签",
        },
        "en": {
            "draft": "Pin Drafts", "new": "New", "choose": "Choose file or drop",
            "create": "Create Pin", "profile": "Your profile",
            "preview": "Pin Image Preview", "save_site": "Save from site",
            "drop": "Choose a file or drop it here",
            "title": "Title", "title_ph": "Describe your Pin",
            "desc": "Description", "desc_ph": "Describe your Pin",
            "link": "Link", "link_ph": "Add a link",
            "board": "Board", "board_val": "Home Decor Inspiration",
            "tags": "Add tags (0)", "tags_ph": "Search tags",
        },
    }[lang]
    f = F if lang == "zh" else FE

    # left sidebar — Pin draft panel
    rect(d, (8, 44, 228, H-8), C["surface"], width=1)
    text(d, (24, 56), T["draft"], f=f["h3"])
    rect(d, (24, 88, 212, 130), C["bg"], width=1)  # new pin btn area
    text(d, (68, 102), T["new"], fill=C["sub"], f=f["small"], anchor="mm")
    # upload area
    rect(d, (24, 152, 212, 480), C["bg"], width=1)
    if has_image:
        # simple text only (no triangle icon)
        text(d, (118, 300), T["choose"], fill=C["sub"], f=f["tiny"], anchor="mm")
    else:
        d.ellipse((100, 280, 136, 316), outline=C["border"], width=2)
        text(d, (118, 320), T["choose"], fill=C["sub"], f=f["tiny"], anchor="mm")

    # center — image preview area
    # x starts at 228 (flush with left sidebar) to hide the red hero-seam gap
    rect(d, (228, 44, 634, H-8), C["surface"], width=1)
    text(d, (260, 56), T["create"], f=f["h3"])
    text(d, (260, 82), T["profile"], fill=C["sub"], f=f["tiny"])
    # big image placeholder
    rect(d, (260, 108, 598, 620), C["bg"], width=1)
    if has_image:
        # single solid placeholder with photo icon — centered in preview area
        # preview area: (260, 108) to (598, 620), center = (429, 364)
        fw, fh = 156, 132
        fx0 = 429 - fw // 2   # 351
        fy0 = 364 - fh // 2   # 298
        d.rectangle((fx0, fy0, fx0 + fw, fy0 + fh), fill=C["surface"],
                    outline=C["border"], width=2)
        # sun circle (top-right)
        d.ellipse((fx0 + fw - 36, fy0 + 16, fx0 + fw - 16, fy0 + 36), fill=C["dot"])
        # mountains (bottom)
        mx_base = fy0 + fh - 16
        d.polygon([(fx0 + 16, mx_base),
                   (fx0 + 56, mx_base - 48),
                   (fx0 + 96, mx_base - 24),
                   (fx0 + 126, mx_base - 56),
                   (fx0 + fw - 16, mx_base)], fill=C["secondary"])
        text(d, (429, fy0 + fh + 18), T["preview"], fill=C["sub"], f=f["body"], anchor="mm")
    else:
        d.polygon([(429, 320), (400, 378), (458, 378)], fill=C["border"])
        text(d, (429, 396), T["drop"], fill=C["sub"], f=f["tiny"], anchor="mm")
    # bottom of center
    text(d, (380, 640), T["save_site"], fill=C["sub"], f=f["tiny"], anchor="mm")

    # right form fields
    fx = 632
    # cover the gap between center (ends 618) and right (starts 632) — hides red seam
    d.rectangle((617, 40, 634, H-8), fill=C["surface"])
    rect(d, (fx, 44, W-8, H-8), C["surface"], width=1)

    # Title field
    text(d, (fx+16, 60), T["title"], fill=C["sub"], f=f["tiny"])
    rect(d, (fx+16, 78, W-24, 132), C["bg"], width=1)
    if filled_title:
        paragraph(d, (fx+24, 86), filled_title, W-fx-40, f=f["small"])
    else:
        text(d, (fx+24, 96), T["title_ph"], fill=C["sub"], f=f["small"])

    # Description field
    dy_desc = 148
    text(d, (fx+16, dy_desc), T["desc"], fill=C["sub"], f=f["tiny"])
    rect(d, (fx+16, dy_desc+18, W-24, dy_desc+180), C["bg"], width=1)
    if filled_desc:
        paragraph(d, (fx+24, dy_desc+26), filled_desc, W-fx-40, f=f["small"], leading=4)
    else:
        text(d, (fx+24, dy_desc+32), T["desc_ph"], fill=C["sub"], f=f["small"])

    # Link field
    dy_link = dy_desc + 196
    text(d, (fx+16, dy_link), T["link"], fill=C["sub"], f=f["tiny"])
    rect(d, (fx+16, dy_link+18, W-24, dy_link+52), C["bg"], width=1)
    text(d, (fx+24, dy_link+28), T["link_ph"], fill=C["sub"], f=f["small"])

    # Board field
    dy_board = dy_link + 68
    text(d, (fx+16, dy_board), T["board"], fill=C["sub"], f=f["tiny"])
    rect(d, (fx+16, dy_board+18, W-24, dy_board+52), C["bg"], width=1)
    text(d, (fx+24, dy_board+28), T["board_val"], fill=C["text"], f=f["small"])

    # Topic tags
    dy_topic = dy_board + 68
    text(d, (fx+16, dy_topic), T["tags"], fill=C["sub"], f=f["tiny"])
    text(d, (fx+24, dy_topic+22), T["tags_ph"], fill=C["sub"], f=f["small"])

    # final cover: erase any red seam between center column and right form (drawn last)
    d.rectangle((615, 38, 638, H-8), fill=C["surface"])


# ── PinMate Settings page mockup (settings.html) ──
def settings_page(img, d, lang="zh"):
    """Draw the PinMate Settings page (settings.html) mockup below browser chrome.
    API Key / provider are configured here, NOT in the popup."""
    T = {
        "zh": {
            "title": "PinMate 设置", "sub": "AI Pinterest 助手",
            "lang_lbl": "语言", "lang_val": "中文",
            "ai_cfg": "AI 配置",
            "prov_lbl": "API 提供商", "prov_val": "硅基流动",
            "key_lbl": "API Key", "key_val": "sk-xxxxxxxxxxxxxx…xxxxxxxx",
            "show": "显示",
            "model_lbl": "模型", "model_val": "Qwen/Qwen3-Omni-30B-A3B-Captioner",
            "gen_lbl": "生成语言", "gen_val": "中文",
            "save": "保存", "test": "测试连接", "connected": "已连接",
            "guide": "使用教程", "howto": "如何获取 API Key？", "support": "支持作者",
        },
        "en": {
            "title": "PinMate Settings", "sub": "AI Pinterest Assistant",
            "lang_lbl": "Language", "lang_val": "English",
            "ai_cfg": "AI Configuration",
            "prov_lbl": "API Provider", "prov_val": "SiliconFlow",
            "key_lbl": "API Key", "key_val": "sk-xxxxxxxxxxxxxx…xxxxxxxx",
            "show": "Show",
            "model_lbl": "Model", "model_val": "Qwen/Qwen3-Omni-30B-A3B-Captioner",
            "gen_lbl": "Generation Language", "gen_val": "English",
            "save": "Save", "test": "Test Connection", "connected": "Connected",
            "guide": "Usage Guide", "howto": "How to get API Key?", "support": "Support Author",
        },
    }[lang]
    f = F if lang == "zh" else FE

    px0, py0 = 40, 200
    px1, py1 = W - 40, 688
    rounded_rect(d, (px0, py0, px1, py1), radius=16,
                 fill=C["surface"], outline=C["border"], width=2)
    inner_x = px0 + 20  # 60

    # Header: real extension logo + title (no red P box)
    # Chinese only: vertically center the text block against the icon and
    # keep the sub-title safely above the divider line.
    if lang == "zh":
        logo_y = py0 + 14
        title_y = py0 + 11
        sub_y = py0 + 41
        dy_div = py0 + 68
    else:
        logo_y = py0 + 18
        title_y = py0 + 20
        sub_y = py0 + 56
        dy_div = py0 + 72
    logo = Image.open(ROOT / "assets" / "icons" / "icon128.png").convert("RGBA")
    logo = logo.resize((36, 36), Image.LANCZOS)
    lmask = Image.new("L", (36, 36), 0)
    ImageDraw.Draw(lmask).rounded_rectangle((0, 0, 35, 35), radius=8, fill=255)
    img.paste(logo, (inner_x, logo_y), lmask)
    title_x = inner_x + 48
    text(d, (title_x, title_y), T["title"], f=f["h2"])
    text(d, (title_x, sub_y), T["sub"], fill=C["sub"], f=f["small"])

    d.line([(inner_x, dy_div), (px1 - 20, dy_div)], fill=C["border"], width=1)

    # ── Language section ──
    sy = dy_div + 16
    text(d, (inner_x, sy), T["lang_lbl"], f=f["h3"])
    sel_y = sy + 24
    rounded_rect(d, (inner_x, sel_y, inner_x + 280, sel_y + 34), radius=8,
                 fill=C["bg"], outline=C["border"], width=1)
    text(d, (inner_x + 14, sel_y + 17), T["lang_val"], fill=C["text"], f=f["small"], anchor="lm")

    # ── AI Configuration section ──
    ay = sel_y + 62
    text(d, (inner_x, ay), T["ai_cfg"], f=f["h3"])

    lbl_y = ay + 30
    # API Provider (left)
    text(d, (inner_x, lbl_y), T["prov_lbl"], fill=C["sub"], f=f["tiny"])
    prov_y = lbl_y + 18
    rounded_rect(d, (inner_x, prov_y, inner_x + 540, prov_y + 34), radius=8,
                 fill=C["bg"], outline=C["border"], width=1)
    text(d, (inner_x + 14, prov_y + 17), T["prov_val"], fill=C["text"], f=f["small"], anchor="lm")
    # API Key (right)
    text(d, (inner_x + 580, lbl_y), T["key_lbl"], fill=C["sub"], f=f["tiny"])
    key_y = lbl_y + 18
    key_box_r = px1 - 20 - 80
    rounded_rect(d, (inner_x + 580, key_y, key_box_r, key_y + 34), radius=8,
                 fill=C["bg"], outline=C["border"], width=1)
    text(d, (inner_x + 594, key_y + 17), T["key_val"], fill=C["text"], f=font_en(14), anchor="lm")
    # Show toggle button inside key box (right)
    show_x0 = px1 - 20 - 72
    rounded_rect(d, (show_x0, key_y + 4, px1 - 24, key_y + 30), radius=6,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (show_x0 + 36, key_y + 17), T["show"], fill=C["sub"], f=font(11), anchor="mm")

    # Model (left)
    mlbl_y = key_y + 50
    text(d, (inner_x, mlbl_y), T["model_lbl"], fill=C["sub"], f=f["tiny"])
    mod_y = mlbl_y + 18
    rounded_rect(d, (inner_x, mod_y, inner_x + 540, mod_y + 34), radius=8,
                 fill=C["bg"], outline=C["border"], width=1)
    text(d, (inner_x + 14, mod_y + 17), T["model_val"], fill=C["text"], f=f["small"], anchor="lm")
    # Generation Language (right)
    text(d, (inner_x + 580, mlbl_y), T["gen_lbl"], fill=C["sub"], f=f["tiny"])
    gen_y = mlbl_y + 18
    rounded_rect(d, (inner_x + 580, gen_y, px1 - 20, gen_y + 34), radius=8,
                 fill=C["bg"], outline=C["border"], width=1)
    text(d, (inner_x + 594, gen_y + 17), T["gen_val"], fill=C["text"], f=f["small"], anchor="lm")

    # Buttons row
    btn_y = gen_y + 50
    rounded_rect(d, (inner_x, btn_y, inner_x + 140, btn_y + 40), radius=10,
                 fill=C["primary"], width=0)
    text(d, (inner_x + 70, btn_y + 20), T["save"], fill="white", f=font(15, bold=True), anchor="mm")
    test_x0 = inner_x + 156
    rounded_rect(d, (test_x0, btn_y, test_x0 + 180, btn_y + 40), radius=10,
                 fill=C["surface"], outline=C["border"], width=1)
    text(d, (test_x0 + 90, btn_y + 20), T["test"], fill=C["text"], f=font(14, bold=True), anchor="mm")
    conn_x0 = test_x0 + 196
    rounded_rect(d, (conn_x0, btn_y + 6, conn_x0 + 124, btn_y + 34), radius=14,
                 fill="#e8f5e9", outline=C["ok"], width=1)
    d.ellipse((conn_x0 + 14, btn_y + 14, conn_x0 + 22, btn_y + 22), fill=C["ok"])
    text(d, (conn_x0 + 28, btn_y + 20), T["connected"], fill=C["ok"], f=font(12, bold=True), anchor="lm")

    # Footer links
    ft_y = btn_y + 56
    text(d, (inner_x, ft_y), T["guide"], fill=C["link"], f=f["small"])
    sep1 = inner_x + 80
    text(d, (sep1, ft_y), "·", fill=C["sub"], f=f["small"])
    howto_x = inner_x + 96
    text(d, (howto_x, ft_y), T["howto"], fill=C["link"], f=f["small"])
    howto_w = d.textlength(T["howto"], font=f["small"])
    sep2 = howto_x + howto_w + 16
    text(d, (sep2, ft_y), "·", fill=C["sub"], f=f["small"])
    text(d, (sep2 + 16, ft_y), T["support"], fill=C["link"], f=f["small"])


# ── PinMate floating panel mockup ──
def pinmate_panel(d, px, py, mode="empty", lang="zh"):
    """
    Draw the PinMate floating panel.
    mode: "empty" | "settings" | "result" | "filled"
    lang: "zh" | "en"
    """
    pw, ph = 360, 420
    # shadow
    rect(d, (px+6, py+6, px+pw+6, py+ph+6), "#e8d0d4", width=0)
    # panel body
    rounded_rect(d, (px, py, px+pw, py+ph), radius=16,
                 fill=C["surface"], outline=C["border"], width=1)

    # header
    hdr_h = 52
    rounded_rect(d, (px, py, px+pw, py+hdr_h), radius=16,
                 fill=C["panel_bg"], outline=C["border"], width=1)
    # cover bottom corners of header
    d.rectangle((px, py+20, px+pw, py+hdr_h), fill=C["panel_bg"])
    d.line([(px, py+hdr_h), (px+pw, py+hdr_h)], fill=C["border"], width=1)

    # brand name (no logo circle — cleaner look)
    bn = "PinMate"
    bt = "AI Pinterest 助手" if lang == "zh" else "AI Pinterest Assistant"
    text(d, (px+14, py+14), bn, f=font(15, bold=True))
    text(d, (px+14, py+34), bt, fill=C["sub"], f=font(10))

    # status pill
    pill_x = px + pw - 110
    pill_text = "AI 就绪" if lang == "zh" else "AI Ready"
    rounded_rect(d, (pill_x, py+16, px+pw-12, py+36), radius=10,
                 fill="#e8f5e9", outline=C["ok"], width=1)
    text(d, (pill_x+8, py+20), pill_text, fill=C["ok"], f=font(10, bold=True))

    # ── Body content by mode ──
    body_y = py + hdr_h + 12

    if mode == "empty":
        # Big primary button
        btn_txt = "一键生成标题描述" if lang == "zh" else "Generate Title & Description"
        btn_sub = "点击生成，即可从图片一键生成 SEO 标题与描述。" if lang == "zh" else \
                  "Click generate to create SEO titles from your Pin image."
        rounded_rect(d, (px+16, body_y, px+pw-16, body_y+48), radius=12,
                     fill=C["primary"], width=0)
        text(d, (px+pw//2, body_y+24), btn_txt, fill="white",
             f=font(16, bold=True), anchor="mm")
        # subtitle
        sub_lines = wrap_text(d, btn_sub, pw-50, F["tiny"])
        sy = body_y + 62
        for sl in sub_lines[:2]:
            text(d, (px+pw//2, sy), sl, fill=C["sub"], f=F["tiny"], anchor="mm")
            sy += 18

    elif mode == "settings":
        # Settings form
        set_title = "AI 配置" if lang == "zh" else "AI Configuration"
        text(d, (px+20, body_y), set_title, f=font(17, bold=True))

        fy = body_y + 32
        # Provider row
        prov_label = "API 提供商" if lang == "zh" else "API Provider"
        text(d, (px+20, fy), prov_label, fill=C["sub"], f=F["tiny"])
        rounded_rect(d, (px+20, fy+16, px+pw-20, fy+44), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        prov_val = "硅基流动 SiliconFlow" if lang == "zh" else "SiliconFlow"
        text(d, (px+28, fy+24), prov_val, fill=C["text"], f=F["small"])

        # API Key row
        fy += 56
        key_label = "API Key"
        text(d, (px+20, fy), key_label, fill=C["sub"], f=F["tiny"])
        rounded_rect(d, (px+20, fy+16, px+pw-20, fy+44), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (px+28, fy+26), "sk-xxxxxxxxxxxxxx...xxxxxxxx", fill=C["text"],
             f=F["mono"])

        # Model row
        fy += 56
        model_label = "模型" if lang == "zh" else "Model"
        text(d, (px+20, fy), model_label, fill=C["sub"], f=F["tiny"])
        rounded_rect(d, (px+20, fy+16, px+pw-20, fy+44), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (px+28, fy+26), "Qwen2.5-VL-72B-Instruct", fill=C["text"], f=F["small"])

        # Test connection button
        fy += 58
        test_txt = "测试连接" if lang == "zh" else "Test Connection"
        rounded_rect(d, (px+20, fy, px+140, fy+34), radius=8,
                     fill="#e8f5e9", outline=C["ok"], width=1)
        text(d, (px+80, fy+17), test_txt, fill=C["ok"], f=font(13, bold=True), anchor="mm")
        # connected badge
        conn_txt = "已连接" if lang == "zh" else "Connected"
        text(d, (px+152, fy+8), conn_txt, fill=C["ok"], f=font(13, bold=True))

    elif mode == "result":
        # Result cards
        res_title = "生成结果" if lang == "zh" else "Result"
        text(d, (px+20, body_y), res_title, f=font(17, bold=True))

        card_y = body_y + 28
        cw = pw - 40

        # Analysis card
        rounded_rect(d, (px+20, card_y, px+pw-20, card_y+64), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        ana_title = "图片分析" if lang == "zh" else "Image Analysis"
        text(d, (px+28, card_y+6), ana_title, fill=C["primary"], f=font(12, bold=True))
        ana_text_zh = "现代简约客厅布置，白色沙发、绿植、木质茶几，温馨家居氛围"
        ana_text_en = "Modern minimalist living room, white sofa, plants, wooden coffee table"
        ana_text = ana_text_zh if lang == "zh" else ana_text_en
        paragraph(d, (px+28, card_y+24), ana_text, cw-16, f=F["tiny"], fill=C["text"], leading=3)

        # Title card
        card_y += 72
        rounded_rect(d, (px+20, card_y, px+pw-20, card_y+72), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        t_title = "Pinterest 标题" if lang == "zh" else "Pinterest Title"
        text(d, (px+28, card_y+4), t_title, fill=C["primary"], f=font(12, bold=True))
        t_text_zh = "现代简约客厅灵感 | 10㎡小户型高级感家居"
        t_text_en = "Modern Minimalist Living Room | Premium Small Space Look"
        t_text = t_text_zh if lang == "zh" else t_text_en
        paragraph(d, (px+28, card_y+22), t_text, cw-16, f=F["tiny"], fill=C["text"], leading=3)
        # copy button
        copy_txt = "复制" if lang == "zh" else "Copy"
        rounded_rect(d, (px+pw-76, card_y+48, px+pw-24, card_y+68), radius=6,
                     fill=C["bg"], width=1)
        text(d, (px+pw-50, card_y+58), copy_txt, fill=C["sub"], f=font(10), anchor="mm")

        # Description card (compact)
        card_y += 80
        rounded_rect(d, (px+20, card_y, px+pw-20, card_y+96), radius=10,
                     fill=C["surface"], outline=C["border"], width=1)
        d_title = "Pinterest 描述" if lang == "zh" else "Pinterest Description"
        text(d, (px+28, card_y+4), d_title, fill=C["primary"], f=font(12, bold=True))
        d_text_zh = "目标受众：装修房主、DIY爱好者\n现代简约风客厅方案\n#家居灵感 #小户型 #简约风格"
        d_text_en = "Target: Homeowners, DIY renters\nModern minimalist setup...\n#HomeInspo #SmallSpace"
        d_text = d_text_zh if lang == "zh" else d_text_en
        paragraph(d, (px+28, card_y+20), d_text, cw-16, f=F["tiny"], fill=C["text"], leading=2)
        # copy button
        rounded_rect(d, (px+pw-76, card_y+72, px+pw-24, card_y+92), radius=6,
                     fill=C["bg"], width=1)
        text(d, (px+pw-50, card_y+82), copy_txt, fill=C["sub"], f=font(10), anchor="mm")

    elif mode == "filled":
        # Fill actions view
        fill_title = "填入操作" if lang == "zh" else "Fill Actions"
        text(d, (px+20, body_y), fill_title, f=font(17, bold=True))

        # Fill All button (compact primary) — text vertically centered
        fy = body_y + 28
        fill_all = "全部填入" if lang == "zh" else "Fill All"
        rounded_rect(d, (px+16, fy, px+pw-16, fy+36), radius=12,
                     fill=C["primary"], width=0)
        text(d, (px+pw//2, fy+18), fill_all, fill="white",
             f=font(15, bold=True), anchor="mm")

        # Secondary buttons
        fy += 46
        title_only = "仅标题" if lang == "zh" else "Title only"
        desc_only = "仅描述" if lang == "zh" else "Desc only"
        half_w = (pw - 40) // 2 - 6
        rounded_rect(d, (px+20, fy, px+20+half_w, fy+32), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (px+20+half_w//2, fy+16), title_only, fill=C["text"],
             f=font(12, bold=True), anchor="mm")
        rounded_rect(d, (px+28+half_w+6, fy, px+28+half_w*2+6, fy+32), radius=8,
                     fill=C["surface"], outline=C["border"], width=1)
        text(d, (px+28+half_w//2+half_w+6, fy+16), desc_only, fill=C["text"],
             f=font(12, bold=True), anchor="mm")

        # Success status
        fy += 44
        ok_txt = "已填入！" if lang == "zh" else "Inserted!"
        text(d, (px+pw//2, fy), ok_txt, fill=C["ok"], f=font(14, bold=True), anchor="mm")

        hint_txt = "标题已填入 描述若空白请刷新页面" if lang == "zh" else \
                   "Title inserted. Refresh if description is blank"
        text(d, (px+pw//2, fy+22), hint_txt, fill=C["sub"], f=F["tiny"], anchor="mm")

    # ── Footer ──
    ft_y = py + ph - 40
    settings_txt = "设置" if lang == "zh" else "Settings"
    text(d, (px+20, ft_y+8), settings_txt, fill=C["link"], f=F["small"])
    # language toggle
    lang_active = "中文" if lang == "zh" else "EN"
    rounded_rect(d, (px+pw-70, ft_y+4, px+pw-28, ft_y+28), radius=6,
                 fill=C["primary"], width=0)
    text(d, (px+pw-49, ft_y+16), lang_active, fill="white", f=font(11, bold=True), anchor="mm")


# ── Step indicator bar ──
def step_bar(d, step_num, total, title_zh, title_en, desc_zh, desc_en, lang="zh"):
    """Draw bottom step indicator."""
    bar_y = H - 90
    bar_h = 78
    rect(d, (40, bar_y, W-40, bar_y+bar_h), C["surface"], width=2)

    # Step number circle
    cx, cy = 74, bar_y + bar_h // 2
    d.ellipse((cx-22, cy-22, cx+22, cy+22), fill=C["primary"], outline=C["primary"])
    num_str = str(step_num)
    text(d, (cx, cy-2), num_str, fill="white", f=font(28, bold=True), anchor="mm")

    # Step title
    t = title_zh if lang == "zh" else title_en
    text(d, (112, bar_y+12), t, f=font(20, bold=True))

    # Step description
    desc = desc_zh if lang == "zh" else desc_en
    paragraph(d, (112, bar_y+42), desc, W-170, f=F["small"], fill=C["sub"], leading=4)


# ══════════════════════════════════════════════════════════
# SCREENSHOT GENERATORS
# ══════════════════════════════════════════════════════════

def screenshot_1(lang="zh"):
    """Step 1: Open PinMate Settings page and configure AI provider & API key."""
    img, d = base_canvas()
    url_text = "PinMate 设置" if lang == "zh" else "PinMate Settings"
    browser_chrome(d, url_text=url_text)

    # Hero banner
    rect(d, (40, 48, W-40, 140), C["primary"], width=4)
    hero_t = "设置页配置 AI" if lang == "zh" else "Configure AI in Settings"
    hero_s = "选择 AI 服务商 → 填入 API Key → 测试连接" if lang == "zh" else \
             "Choose provider → Enter API key → Test connection"
    text(d, (72, 52), hero_t, fill="white", f=F["h1"] if lang=="zh" else FE["h1"])
    text(d, (74, 102), hero_s, fill="white", f=F["body"] if lang=="zh" else FE["body"])

    # PinMate Settings page mockup
    settings_page(img, d, lang=lang)

    # Step bar
    step_bar(d, 1, 3,
             "第 1 步：在设置页配置 AI 服务商",
             "Step 1: Configure AI provider in Settings",
             "打开 PinMate 设置页，选择 AI 服务商（硅基流动 / OpenAI），填入 API Key 并测试连接，配置完成后保存即可。",
             "Open PinMate Settings, choose your AI provider (SiliconFlow / OpenAI), enter your API key and test the connection, then save.",
             lang=lang)

    fname = f"screenshot-1-setup.png"
    out_dir = OUT_BASE / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    img.save(out_dir / fname)
    print(f"  [OK] {out_dir / fname}")


def screenshot_2(lang="zh"):
    """Step 2: One-click generate title & description (Results)."""
    img, d = base_canvas()
    browser_chrome(d)

    # Hero banner
    rect(d, (40, 48, W-40, 140), C["primary"], width=4)
    hero_t = "一键生成 SEO 标题描述" if lang == "zh" else "One-Click SEO Generation"
    hero_s = "AI 分析图片 → 输出带关键词的优化标题与描述" if lang == "zh" else \
             "AI analyzes image → Outputs optimized titles with keywords"
    text(d, (72, 52), hero_t, fill="white", f=F["h1"] if lang=="zh" else FE["h1"])
    text(d, (74, 102), hero_s, fill="white", f=F["body"] if lang=="zh" else FE["body"])

    # Pinterest page
    pinterest_page(d, has_image=True, lang=lang)

    # PinMate panel — result mode
    pinmate_panel(d, 860, 90, mode="result", lang=lang)

    # Step bar
    step_bar(d, 2, 3,
             "第 2 步：一键生成标题描述",
             "Step 2: Generate title & description",
             "点击「一键生成标题描述」，AI 自动分析 Pin 图片，生成带有目标受众和关键词的 SEO 优化标题与描述。",
             'Click "Generate Title & Description" to analyze the Pin image with AI and get SEO-optimized titles with target audience & keywords.',
             lang=lang)

    fname = f"screenshot-2-generate.png"
    out_dir = OUT_BASE / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    img.save(out_dir / fname)
    print(f"  [OK] {out_dir / fname}")


def screenshot_3(lang="zh"):
    """Step 3: Fill into Pinterest (Fill actions)."""
    img, d = base_canvas()
    browser_chrome(d)

    # Hero banner
    rect(d, (40, 48, W-40, 140), C["primary"], width=4)
    hero_t = "一键填入 Pinterest" if lang == "zh" else "Auto-Fill into Pinterest"
    hero_s = "审核结果后一键写入标题和描述，直接发布" if lang == "zh" else \
             "Review results, then insert title & description in one click"
    text(d, (72, 52), hero_t, fill="white", f=F["h1"] if lang=="zh" else FE["h1"])
    text(d, (74, 102), hero_s, fill="white", f=F["body"] if lang=="zh" else FE["body"])

    # Pinterest page — WITH filled content
    filled_title_zh = "现代简约客厅灵感 | 10㎡小户型也能拥有的高级感家居布置"
    filled_title_en = "Modern Minimalist Living Room | Premium Look for Small Spaces Under 10m2"
    filled_desc_zh = "目标受众：正在装修或改造居住空间的房主、租房党 DIY 爱好者\n\n这套现代简约风客厅布置方案，用最少的预算打造高级感——白色布艺沙发搭配原木茶几，大型绿植点亮空间…\n\n关键词：#家居灵感 #小户型 #简约风格 #客厅设计 #DIY装修"
    filled_desc_en = "Target audience: Homeowners renovating their space, DIY renters\n\nThis modern minimalist living room setup delivers a premium look on a budget—white fabric sofa paired with raw wood coffee table, large plants bring life…\n\nKeywords: #HomeInspo #SmallSpace #Minimalism #LivingRoomDIY #InteriorDesign"

    pinterest_page(d, has_image=True,
                   filled_title=filled_title_zh if lang=="zh" else filled_title_en,
                   filled_desc=filled_desc_zh if lang=="zh" else filled_desc_en,
                   lang=lang)

    # PinMate panel — filled mode
    pinmate_panel(d, 860, 90, mode="filled", lang=lang)

    # Step bar
    step_bar(d, 3, 3,
             "第 3 步：全部填入并发布",
             "Step 3: Fill all & publish",
             "审核生成的内容后，点击「全部填入」将标题和描述一键写入 Pinterest 输入框，直接发布。",
             "Review the generated content, click \"Fill All\" to insert the title and description into Pinterest in one click, then publish.",
             lang=lang)

    fname = f"screenshot-3-fill.png"
    out_dir = OUT_BASE / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    img.save(out_dir / fname)
    print(f"  [OK] {out_dir / fname}")


# ── Main ──
def main():
    parser = argparse.ArgumentParser(description="Generate PinMate store screenshots")
    parser.add_argument("--lang", choices=["zh", "en", "both"], default="both",
                        help="Language(s) to generate (default: both)")
    args = parser.parse_args()

    langs = ["zh", "en"] if args.lang == "both" else [args.lang]
    for lang in langs:
        print(f"\n{'='*50}")
        print(f"  Generating {lang.upper()} screenshots...")
        print(f"{'='*50}")
        screenshot_1(lang)
        screenshot_2(lang)
        screenshot_3(lang)

    print(f"\nDone! Output: {OUT_BASE}")


if __name__ == "__main__":
    main()
