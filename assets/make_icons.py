"""Generate PinMate icons (16/48/128 px) into assets/icons/ with NO dependencies.
Pure-Python PNG encoder. Draws a Pinterest-red rounded-square gradient with a white 'P'."""
import os
import zlib
import struct

OUT = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT, exist_ok=True)

PRIMARY = (230, 0, 35)      # #E60023
SECONDARY = (255, 107, 129)  # #FF6B81
WHITE = (255, 255, 255)

# 7x9 bitmap for letter 'P'
P_GLYPH = [
    "1111100",
    "1000110",
    "1000010",
    "1000110",
    "1111100",
    "1000000",
    "1000000",
    "1000000",
    "1000000",
]
GW, GH = 7, 9


def lerp(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def in_rounded(x, y, size, radius):
    r = radius
    if x >= r and x < size - r:
        return True
    if y >= r and y < size - r:
        return True
    # corners
    cx = r if x < r else size - 1 - r
    cy = r if y < r else size - 1 - r
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def make(size):
    radius = max(2, size // 5)
    # pixel buffer RGBA
    px = [[(0, 0, 0, 0)] * size for _ in range(size)]

    for y in range(size):
        t = y / max(1, size - 1)
        base = lerp(PRIMARY, SECONDARY, t)
        for x in range(size):
            if in_rounded(x, y, size, radius):
                px[y][x] = (base[0], base[1], base[2], 255)

    # draw 'P' centered
    scale = max(1, int(size * 0.62 / GH))
    gw, gh = GW * scale, GH * scale
    ox = (size - gw) // 2
    oy = (size - gh) // 2
    for gy in range(GH):
        for gx in range(GW):
            if P_GLYPH[gy][gx] == "1":
                for sy in range(scale):
                    for sx in range(scale):
                        x = ox + gx * scale + sx
                        y = oy + gy * scale + sy
                        if 0 <= x < size and 0 <= y < size:
                            px[y][x] = (255, 255, 255, 255)

    write_png(os.path.join(OUT, f"icon{size}.png"), px, size)
    print("wrote", f"icon{size}.png")


def write_png(path, px, size):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            r, g, b, a = px[y][x]
            raw += bytes((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        crc = zlib.crc32(typ + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


for s in (16, 48, 128):
    make(s)
print("done")
