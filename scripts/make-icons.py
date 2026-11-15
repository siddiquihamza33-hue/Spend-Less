"""Draws the Spend Lens app icons (run once; output is committed in apps/web/public/icons).
A white lens over three statement lines on the brand purple. `maskable` keeps the mark inside
the 80% safe zone so Android's round/squircle masks never clip it."""
from PIL import Image, ImageDraw
import os, sys

PURPLE, WHITE, SOFT = (91, 63, 217), (255, 255, 255), (217, 207, 248)
OUT = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'public', 'icons')

def draw(size, scale, rounded):
    S = 1024                                   # draw big, then shrink for smooth edges
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if rounded: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=PURPLE)
    else: d.rectangle([0, 0, S, S], fill=PURPLE)
    c = S / 2
    DX, DY = -57, -81                          # centres the mark's bounding box (x 300-838, y 348-838)
    def px(x): return c + (x + DX - c) * scale
    def py(y): return c + (y + DY - c) * scale
    # statement lines
    for i, (x0, x1) in enumerate([(300, 640), (300, 560), (300, 600)]):
        y = 370 + i * 110
        d.rounded_rectangle([px(x0), py(y - 22), px(x1), py(y + 22)], radius=22 * scale, fill=SOFT)
    # lens ring + handle
    cx, cy, r, w = 560, 480, 230, 64
    d.ellipse([px(cx - r), py(cy - r), px(cx + r), py(cy + r)], outline=WHITE, width=int(w * scale))
    d.line([px(cx + r * 0.71), py(cy + r * 0.71), px(800), py(800)], fill=WHITE, width=int(76 * scale))
    d.ellipse([px(800 - 38), py(800 - 38), px(800 + 38), py(800 + 38)], fill=WHITE)
    return im.resize((size, size), Image.LANCZOS)

os.makedirs(OUT, exist_ok=True)
draw(192, 1.0, True).save(f'{OUT}/icon-192.png')
draw(512, 1.0, True).save(f'{OUT}/icon-512.png')
draw(512, 0.78, False).save(f'{OUT}/icon-maskable-512.png')
draw(180, 0.86, False).convert('RGB').save(f'{OUT}/apple-touch-icon.png')
draw(64, 1.0, True).save(f'{OUT}/favicon-64.png')
print('icons written to', os.path.normpath(OUT))
