#!/usr/bin/env python3
"""Rebuild TSO 2.0 installed app icons with genuinely transparent outer corners.

Preserves the high-resolution owner-approved lettermark artwork. The current
source may have opaque near-black padding at the corners; only the exterior
connected background is removed, then a softly anti-aliased rounded clip
protects against residual square corners. No artwork is invented or redrawn.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "brand/identity/tso2-app-icon-master-approved.png"
DEST = ROOT / "brand/production"

image = Image.open(MASTER).convert("RGBA")
w, h = image.size
if w < 512 or h < 512 or abs(w - h) > 2:
    raise SystemExit(f"Unexpected approved square icon master: {image.size}")

# Find only near-black pixels connected to the OUTSIDE of the composition.
# A solid bright frame prevents flood fill from entering the dark icon center.
rgb = image.load()
visited = bytearray(w * h)
q = deque()
def offer(x, y):
    i = y * w + x
    if visited[i]:
        return
    r, g, b, a = rgb[x, y]
    if a == 0 or max(r, g, b) < 48:
        visited[i] = 1
        q.append((x, y))

for x in range(w):
    offer(x, 0)
    offer(x, h - 1)
for y in range(h):
    offer(0, y)
    offer(w - 1, y)

while q:
    x, y = q.popleft()
    if x > 0: offer(x - 1, y)
    if x + 1 < w: offer(x + 1, y)
    if y > 0: offer(x, y - 1)
    if y + 1 < h: offer(x, y + 1)

# Do not destroy artwork if a dark gap connects the background to the center.
if sum(visited) > (w * h * .40):
    raise SystemExit("Exterior selection reached too much of the artwork; refusing export")

new_alpha = image.getchannel("A")
p = new_alpha.load()
exterior = 0
for y in range(h):
    for x in range(w):
        if visited[y * w + x]:
            p[x, y] = 0
            exterior += 1

# A very small rounded perimeter trims any remaining old black square corners.
# The outer colored badge sits well inside the original image canvas.
scale = 4
high_mask = Image.new("L", (w * scale, h * scale), 0)
margin = round(min(w, h) * .018)
corner_radius = round(min(w, h) * .13)
ImageDraw.Draw(high_mask).rounded_rectangle(
    (margin * scale, margin * scale, (w - margin - 1) * scale, (h - margin - 1) * scale),
    radius=corner_radius * scale, fill=255
)
rounded = high_mask.resize((w, h), Image.Resampling.LANCZOS)
new_alpha = ImageChops.multiply(new_alpha, rounded)
image.putalpha(new_alpha)

DEST.mkdir(parents=True, exist_ok=True)
assets = {
    "tso2-app-icon-192.png": 192,
    "tso2-app-icon-512.png": 512,
    "tso2-apple-touch-icon-180.png": 180,
    "tso2-favicon-32.png": 32
}
for name, px in assets.items():
    out = image.resize((px, px), Image.Resampling.LANCZOS)
    out.save(DEST / name, format="PNG", optimize=True)
    for corner in ((0, 0), (0, px - 1), (px - 1, 0), (px - 1, px - 1)):
        assert out.getpixel(corner)[3] == 0, (name, corner, out.getpixel(corner))
    assert out.getchannel("A").getextrema() == (0, 255), name
    print(f"{name}: RGBA {px}x{px}, transparent corners verified")

image.resize((512, 512), Image.Resampling.LANCZOS).save(
    DEST / "tso2-app-icon-512.webp", format="WEBP", quality=92, method=6
)
image.save(
    DEST / "tso2-favicon.ico", format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print(f"Transparent exterior pixels removed: {exterior:,}; all variants exported.")
