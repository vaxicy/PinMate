"""Preview: new Sparkle-Cluster icon placed in real PinMate contexts.
Pure Python (imports generate_icon_proposals for draw helpers + the icon).
Outputs assets/icons/proposals/logo-preview.png
"""
import os
import generate_icon_proposals as g

OUT = os.path.join(os.path.dirname(__file__), "icons", "proposals")
os.makedirs(OUT, exist_ok=True)

W, H = 440, 240
bg = [[(245, 245, 247, 255)] * W for _ in range(H)]

icon = g.supersample(g.design_4, 128, scale=4)  # 128x128 RGBA

def paste_scaled(buf, img, ox, oy, dsz):
    for yy in range(dsz):
        for xx in range(dsz):
            sy, sx = int(yy * 128 / dsz), int(xx * 128 / dsz)
            p = img[sy][sx]
            x, y = ox + xx, oy + yy
            if 0 <= x < W and 0 <= y < H:
                buf[y][x] = p

# ── 1) Settings-header style: rounded-square white frame with icon ──
fx, fy, fs = 60, 55, 130
for yy in range(fs):
    for xx in range(fs):
        if g.in_rounded(xx, yy, fs, 28):
            x, y = fx + xx, fy + yy
            if 0 <= x < W and 0 <= y < H:
                bg[y][x] = (255, 255, 255, 255)
paste_scaled(bg, icon, fx + 5, fy + 5, fs - 10)

# ── 2) Launcher style: gradient circle with icon inset ──
lx, ly, ls = 270, 45, 150
for yy in range(ls):
    for xx in range(ls):
        dx, dy = xx - ls / 2, yy - ls / 2
        if dx * dx + dy * dy <= (ls / 2) ** 2:
            t = yy / ls
            base = g.lerp(g.PRIMARY, g.SECONDARY, t)
            x, y = lx + xx, ly + yy
            if 0 <= x < W and 0 <= y < H:
                bg[y][x] = (base[0], base[1], base[2], 255)
isz = 86
paste_scaled(bg, icon, lx + (ls - isz) // 2, ly + (ls - isz) // 2, isz)

# ── number labels (1 / 2) ──
DIGITS = {
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
}
NUM = (90, 90, 98, 255)
def draw_digit(buf, ch, ox, oy, s):
    for ry, row in enumerate(DIGITS[ch]):
        for rx, c in enumerate(row):
            if c == "1":
                for sy in range(s):
                    for sx in range(s):
                        x, y = ox + rx * s + sx, oy + ry * s + sy
                        if 0 <= x < W and 0 <= y < H:
                            buf[y][x] = NUM

draw_digit(bg, "1", fx + (fs - 5 * 9) // 2, fy + fs + 14, 9)
draw_digit(bg, "2", lx + (ls - 5 * 9) // 2, ly + ls + 14, 9)

g.write_png(os.path.join(OUT, "logo-preview.png"), bg, W, H)
print("wrote logo-preview.png")
