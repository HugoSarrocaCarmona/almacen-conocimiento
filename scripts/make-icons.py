"""Genera los iconos de la app (tres barras ascendentes sobre azul tinta).
Uso: python3 scripts/make-icons.py  (necesita Pillow)"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (43, 69, 212)
FG = (255, 255, 255)
DIM = (255, 255, 255, 120)

def draw(size, safe=1.0):
    s = 1024
    img = Image.new("RGBA", (s, s), BG + (255,))
    d = ImageDraw.Draw(img)
    # tres barras, tamaño relativo a la zona segura
    unit = s * safe
    bar_w = unit * 0.13
    gap = unit * 0.075
    heights = [unit * 0.24, unit * 0.38, unit * 0.54]
    total_w = bar_w * 3 + gap * 2
    x0 = (s - total_w) / 2
    base = s / 2 + heights[-1] / 2
    r = bar_w * 0.22
    for i, h in enumerate(heights):
        x = x0 + i * (bar_w + gap)
        d.rounded_rectangle([x, base - h, x + bar_w, base], radius=r, fill=FG)
    return img.resize((size, size), Image.LANCZOS)

OUT.mkdir(parents=True, exist_ok=True)
draw(512).convert("RGB").save(OUT / "icon-512.png")
draw(192).convert("RGB").save(OUT / "icon-192.png")
draw(180).convert("RGB").save(OUT / "apple-touch-icon.png")  # iPhone, sin transparencia
draw(512, safe=0.78).convert("RGB").save(OUT / "icon-maskable-512.png")
print("Iconos generados en", OUT)
