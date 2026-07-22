"""Generate PinMate icon design proposals (non-letter) — pure Python, no dependencies.
Outputs individual 128px previews + comparison grid at assets/icons/proposals.png
"""
import math, os, zlib, struct

OUT = os.path.join(os.path.dirname(__file__), "icons", "proposals")
os.makedirs(OUT, exist_ok=True)

PRIMARY = (230, 0, 35, 255)
SECONDARY = (255, 107, 129, 255)
WHITE = (255, 255, 255, 255)
DARK = (180, 0, 28, 255)
LIGHT_PINK = (255, 220, 225, 255)

SIZE = 128
RADIUS = 26


# ── Low-level helpers ────────────────────────────────────────────────

def lerp(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def in_rounded(x, y, size, radius):
    r = radius
    if x >= r and x < size - r: return True
    if y >= r and y < size - r: return True
    cx = r if x < r else size - 1 - r
    cy = r if y < r else size - 1 - r
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def rounded_bg(size, radius):
    """Return [size][size] RGBA buffer with gradient rounded-rect background."""
    px = [[(0, 0, 0, 0)] * size for _ in range(size)]
    for y in range(size):
        t = y / max(1, size - 1)
        base = lerp(PRIMARY, SECONDARY, t)
        for x in range(size):
            if in_rounded(x, y, size, radius):
                px[y][x] = (base[0], base[1], base[2], 255)  # lerp already gives 3-tuple, add alpha
    return px


def fill_circle(px, cx, cy, r, color, size=None):
    """Fill a solid circle into px buffer."""
    if size is None:
        size = len(px)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                x, y = cx + dx, cy + dy
                if 0 <= x < size and 0 <= y < size:
                    px[y][x] = color


def fill_circle_aa(px, cx, cy, r, color, size=None):
    """Anti-aliased circle."""
    if size is None:
        size = len(px)
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            dist = math.sqrt(dx * dx + dy * dy)
            x, y = cx + dx, cy + dy
            if 0 <= x < size and 0 <= y < size:
                if dist <= r - 0.8:
                    px[y][x] = color
                elif dist <= r + 0.8:
                    alpha = int(255 * (r + 0.8 - dist) / 1.6)
                    bg = px[y][x]
                    a = alpha / 255.0
                    px[y][x] = (
                        int(bg[0] * (1 - a) + color[0] * a),
                        int(bg[1] * (1 - a) + color[1] * a),
                        int(bg[2] * (1 - a) + color[2] * a),
                        max(bg[3], int(alpha)),
                    )


def fill_polygon(px, pts, color, outline=None, ow=1, size=None):
    """Fill a triangle/polygon with optional outline."""
    if size is None:
        size = len(px)
    # bounding box
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    min_x, max_x = max(0, min(xs)), min(size - 1, max(xs))
    min_y, max_y = max(0, min(ys)), min(size - 1, max(ys))
    n = len(pts)

    def edge_func(a, b, py):
        return (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px_x - a[0])

    for py in range(min_y, max_y + 1):
        intersections = []
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            if a[1] > b[1]:
                a, b = b, a
            if a[1] <= py < b[1] or (py == b[1] and py == a[1]):
                if b[1] != a[1]:
                    t = (py - a[1]) / (b[1] - a[1])
                    intersections.append(int(a[0] + t * (b[0] - a[0])))
        intersections.sort()
        for i in range(0, len(intersections) - 1, 2):
            x0, x1 = intersections[i], intersections[i + 1]
            for px_x in range(max(min_x, x0), min(max_x, x1) + 1):
                if 0 <= px_x < size:
                    px[py][px_x] = color

    # Outline
    if outline:
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            _line(px, a, b, outline, ow, size)


def _line(px, p0, p1, color, thickness=1, size=None):
    """Draw line with Bresenham-style approach."""
    if size is None:
        size = len(px)
    x0, y0 = p0
    x1, y1 = p1
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    steps = max(dx, dy, 1)
    half = thickness // 2
    for i in range(steps + 1):
        t = i / steps
        x = int(x0 + (x1 - x0) * t)
        y = int(y0 + (y1 - y0) * t)
        for oy in range(-half, half + 1 - (-thickness % 2)):
            for ox in range(-half, half + 1 - (-thickness % 2)):
                nx, ny = x + ox, y + oy
                if 0 <= nx < size and 0 <= ny < size:
                    px[ny][nx] = color


def draw_star(px, cx, cy, outer_r, fill_color, outline=None, ow=0, size=None):
    """4-point sparkle star."""
    if size is None:
        size = len(px)
    inner_r = max(1, outer_r // 3)
    pts = []
    for i in range(8):
        angle = math.pi / 4 * i - math.pi / 2
        r = outer_r if i % 2 == 0 else inner_r
        pts.append((int(cx + r * math.cos(angle)),
                     int(cy + r * math.sin(angle))))
    fill_polygon(px, pts, fill_color, outline, ow, size)


def write_png(path, px, w, h=None):
    """Write RGBA buffer as PNG (supports non-square)."""
    if h is None:
        h = w
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r, g, b, a = px[y][x]
            raw += bytes((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        crc = zlib.crc32(typ + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


def supersample(design_fn, target_size, scale=4):
    """Render at `scale`× size then downsample for antialiasing."""
    big = target_size * scale
    # Override SIZE temporarily
    global SIZE, RADIUS
    old_size, old_radius = SIZE, RADIUS
    SIZE = big
    RADIUS = RADIUS * scale
    px = design_fn()
    SIZE, RADIUS = old_size, old_radius

    # Downsample with box filter
    out = [[(0, 0, 0, 0)] * target_size for _ in range(target_size)]
    for oy in range(target_size):
        for ox in range(target_size):
            sr, sg, sb, sa = 0, 0, 0, 0
            count = 0
            for sy in range(oy * scale, (oy + 1) * scale):
                for sx in range(ox * scale, (ox + 1) * scale):
                    r, g, b, a = px[sy][sx]
                    sr += r; sg += g; sb += b; sa += a
                    count += 1
            out[oy][ox] = (sr // count, sg // count, sb // count, sa // count)
    return out


# ── Design 1: Pushpin + Sparkle ─────────────────────────────────────
def design_1():
    px = rounded_bg(SIZE, RADIUS)
    cx, cy = SIZE // 2, SIZE // 2

    # Pin head
    fill_circle_aa(px, cx, cy - 8, 18, WHITE, SIZE)
    # Dark ring around head
    fill_circle_aa(px, cx, cy - 8, 18, DARK, SIZE)
    fill_circle_aa(px, cx, cy - 8, 16, WHITE, SIZE)

    # Needle
    nw_top, nh = 12, 36
    nty = (cy - 8) + 14
    fill_polygon(px,
                 [(cx - nw_top // 2, nty),
                  (cx + nw_top // 2, nty),
                  (cx, nty + nh)], WHITE, DARK, 2, SIZE)

    # Tip dot
    fill_circle_aa(px, cx, nty + nh - 5, 4, WHITE, SIZE)
    fill_circle_aa(px, cx, nty + nh - 5, 4, DARK, SIZE)
    fill_circle_aa(px, cx, nty + nh - 5, 3, WHITE, SIZE)

    # Main sparkle upper-right
    draw_star(px, cx + 22, cy - 24, 10, WHITE, DARK, 1, SIZE)
    # Tiny sparkles
    draw_star(px, cx - 26, cy + 10, 5, LIGHT_PINK, None, 0, SIZE)
    draw_star(px, cx + 22, cy + 22, 4, LIGHT_PINK, None, 0, SIZE)
    return px


# ── Design 2: Magic Glowing Pin ──────────────────────────────────────
def design_2():
    px = rounded_bg(SIZE, RADIUS)
    cx, cy = SIZE // 2, SIZE // 2

    # Glow halos (layered semi-transparent circles)
    head_cy = cy - 6
    for i in range(4):
        gr = 28 + i * 7
        alpha_val = 50 - i * 12
        glow_c = (255, 255, 255, max(alpha_val, 0))
        fill_circle_aa(px, cx, head_cy, gr, glow_c, SIZE)

    # Pin head
    fill_circle_aa(px, cx, head_cy, 16, WHITE, SIZE)

    # Needle
    nw_top, nh = 10, 32
    nty = head_cy + 13
    fill_polygon(px,
                 [(cx - nw_top // 2, nty),
                  (cx + nw_top // 2, nty),
                  (cx, nty + nh)], WHITE, None, 0, SIZE)

    # Tip dot
    fill_circle_aa(px, cx, nty + nh - 5, 3, WHITE, SIZE)

    # Orbiting sparkles
    angles = [25, 115, 200, 295]
    dist = 30
    for idx, a in enumerate(angles):
        rad = math.radians(a)
        sx = cx + int(dist * math.cos(rad))
        sy = head_cy + int(dist * math.sin(rad))
        sz = 6 if idx % 2 == 0 else 4
        draw_star(px, sx, sy, sz, WHITE, None, 0, SIZE)

    # Center accent on pin head
    draw_star(px, cx, head_cy - 2, 6, PRIMARY, None, 0, SIZE)
    return px


# ── Design 3: Neural / Circuit Pin ───────────────────────────────────
def design_3():
    px = rounded_bg(SIZE, RADIUS)
    cx, cy = SIZE // 2, SIZE // 2

    hw, hh = 30, 20
    hx0 = cx - hw // 2
    hy0 = cy - 16

    # Rounded rect head (simplified as rect + corner circles)
    hr = 8
    # Main body rect
    for y in range(hy0 + hr, hy0 + hh - hr):
        for x in range(hx0, hx0 + hw):
            if 0 <= x < SIZE and 0 <= y < SIZE:
                px[y][x] = WHITE
    # Top/bottom bars
    for x in range(hx0 + hr, hx0 + hw - hr):
        for dy in (hr, hh - hr - 1):
            y = hy0 + dy
            if 0 <= x < SIZE and 0 <= y < SIZE:
                px[y][x] = WHITE
    # Corner circles
    for ccx in (hx0 + hr, hx0 + hw - hr - 1):
        for ccy in (hy0 + hr, hy0 + hh - hr - 1):
            fill_circle_aa(px, ccx, ccy, hr, WHITE, SIZE)

    # Border
    # Just use dark pixels near edges — simplified

    # Needle
    nw_top, nh = 8, 34
    nty = hy0 + hh - 4
    fill_polygon(px,
                 [(cx - nw_top // 2, nty),
                  (cx + nw_top // 2, nty),
                  (cx, nty + nh)], WHITE, DARK, 2, SIZE)

    # Tip
    fill_circle_aa(px, cx, nty + nh - 5, 3, WHITE, SIZE)
    fill_circle_aa(px, cx, nty + nh - 5, 3, DARK, SIZE)
    fill_circle_aa(px, cx, nty + nh - 5, 2, WHITE, SIZE)

    # Circuit nodes on head
    nodes = [(hx0 + 9, hy0 + hh // 2, 3), (hx0 + hw - 10, hy0 + hh // 2, 3), (cx, hy0 + 6, 4)]
    for nx, ny, nr in nodes:
        fill_circle_aa(px, nx, ny, nr, PRIMARY, SIZE)

    # Connecting lines
    _line(px, (nodes[0][0], nodes[0][1]), (nodes[2][0], nodes[2][1]), DARK, 1, SIZE)
    _line(px, (nodes[1][0], nodes[1][1]), (nodes[2][0], nodes[2][1]), DARK, 1, SIZE)

    # Small sparkle
    draw_star(px, hx0 + hw + 4, hy0 - 6, 6, WHITE, None, 0, SIZE)
    return px


# ── Design 4: Pure Sparkle Cluster (optimized — no outline on center star) ──
def design_4():
    px = rounded_bg(SIZE, RADIUS)
    cx, cy = SIZE // 2, SIZE // 2

    # Large central star — pure white, NO outline
    draw_star(px, cx, cy, 18, WHITE, None, 0, SIZE)

    # Medium stars
    positions = [(cx - 26, cy - 18, 11), (cx + 24, cy - 14, 10),
                 (cx - 22, cy + 20, 9), (cx + 22, cy + 18, 9)]
    for px_, py_, sz in positions:
        draw_star(px, px_, py_, sz, WHITE, None, 0, SIZE)

    # Tiny accents
    tiny = [(cx - 10, cy - 28, 3), (cx + 14, cy + 28, 3),
            (cx - 30, cy + 4, 4), (cx + 30, cy + 2, 4), (cx, cy - 32, 3)]
    for px_, py_, sz in tiny:
        draw_star(px, px_, py_, sz, LIGHT_PINK, None, 0, SIZE)
    return px


# ── Design 5: Abstract Pin + Orbit ───────────────────────────────────
def design_5():
    px = rounded_bg(SIZE, RADIUS)
    cx, cy = SIZE // 2, SIZE // 2

    head_cy = cy - 4

    # Minimalist pin silhouette
    fill_circle_aa(px, cx, head_cy, 17, WHITE, SIZE)

    nw, nh = 8, 38
    nty = head_cy + 14
    fill_polygon(px,
                 [(cx - nw // 2, nty),
                  (cx + nw // 2, nty),
                  (cx, nty + nh)], WHITE, None, 0, SIZE)

    # Elliptical orbit arc (dashed)
    or_rx, or_ry = 36, 20
    for deg in range(-45, 135, 10):
        rad1 = math.radians(deg)
        rad2 = math.radians(deg + 5)
        x1 = cx + int(or_rx * math.cos(rad1))
        y1 = head_cy + int(or_ry * math.sin(rad1))
        x2 = cx + int(or_rx * math.cos(rad2))
        y2 = head_cy + int(or_ry * math.sin(rad2))
        _line(px, (x1, y1), (x2, y2), WHITE, 2, SIZE)

    # Sparkle on orbit
    sx = cx + int(or_rx * math.cos(math.radians(60)))
    sy = head_cy + int(or_ry * math.sin(math.radians(60)))
    draw_star(px, sx, sy, 7, WHITE, None, 0, SIZE)
    return px


# ── Generate all ─────────────────────────────────────────────────────
DESIGNS = [
    ("1-pin-sparkle",     "Pin + Star",      design_1),
    ("2-magic-pin",       "Magic Pin",       design_2),
    ("3-neural-pin",      "Neural Pin",      design_3),
    ("4-sparkle-cluster", "Sparkle Cluster", design_4),
    ("5-abstract-orbit",  "Abstract Orbit",  design_5),
]

for key, label, fn in DESIGNS:
    px = fn()
    write_png(os.path.join(OUT, f"{key}.png"), px, SIZE)
    print(f"  wrote {key}.png")


# ── Optimized Design 4 (supersampled, multi-size) ─────────────────────
OPT_DIR = os.path.join(os.path.dirname(__file__), "icons")
print("\nGenerating optimized Sparkle Cluster (Design 4) with supersampling...")
for sz in (16, 48, 128):
    px = supersample(design_4, sz, scale=4)
    write_png(os.path.join(OPT_DIR, f"icon{sz}.png"), px, sz)
    print(f"  wrote icon{sz}.png (supersampled)")

# Also write a 128px preview in proposals folder
px128 = supersample(design_4, 128, scale=4)
write_png(os.path.join(OUT, "4-sparkle-cluster-optimized.png"), px128, 128)
print("  wrote 4-sparkle-cluster-optimized.png (preview)")


# ── Comparison grid with numbers ─────────────────────────────────────
DIGITS = {
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
}

GRID_BG = (245, 245, 247, 255)
CELL_W, ICON_S = 160, 128
CELL_H = 220
NUM_COLOR = (90, 90, 98, 255)


def draw_digit(grid, ch, ox, oy, scale):
    rows = DIGITS[ch]
    for ry, row in enumerate(rows):
        for rx, c in enumerate(row):
            if c == "1":
                for sy in range(scale):
                    for sx in range(scale):
                        x, y = ox + rx * scale + sx, oy + ry * scale + sy
                        if 0 <= x < len(grid[0]) and 0 <= y < len(grid):
                            grid[y][x] = NUM_COLOR


def compose_grid():
    W = CELL_W * len(DESIGNS)
    H = CELL_H
    grid = [[GRID_BG] * W for _ in range(H)]
    for i, (key, label, fn) in enumerate(DESIGNS):
        ic = fn()
        ox = i * CELL_W + (CELL_W - ICON_S) // 2
        oy = 16
        for y in range(ICON_S):
            for x in range(ICON_S):
                if ic[y][x][3] > 0:        # only overwrite non-transparent
                    grid[oy + y][ox + x] = ic[y][x]
        # number below icon
        dscale = 9
        dw = 5 * dscale
        draw_digit(grid, str(i + 1), ox + (ICON_S - dw) // 2, oy + ICON_S + 18, dscale)
    return grid, W, H


grid_px, GW, GH = compose_grid()
grid_path = os.path.join(OUT, "proposals_grid.png")
# write_png() only handles square buffers; write the non-square grid directly
with open(grid_path, "wb") as f:
    raw = bytearray()
    for y in range(GH):
        raw.append(0)
        for x in range(GW):
            r, g, b, a = grid_px[y][x]
            raw += bytes((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        crc = zlib.crc32(typ + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", GW, GH, 8, 6, 0, 0, 0)
    f.write(sig)
    f.write(chunk(b"IHDR", ihdr))
    f.write(chunk(b"IDAT", compressed))
    f.write(chunk(b"IEND", b""))

print(f"  wrote proposals_grid.png ({GW}x{GH})")
print(f"\nAll proposals saved to {OUT}/")
print("Done!")
