from PIL import Image, ImageDraw, ImageFilter
import math, os

OUT = "/home/ubuntu/webdev-static-assets/generated-covers"
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 800


def make_cover(name, motif):
    img = Image.new("RGB", (W, H), (4, 35, 29))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = x / W
            glow = max(0.0, 1 - math.hypot(x - W * 0.72, y - H * 0.28) / 700)
            px[x, y] = (int(4 + 4 * t + 3 * glow), int(35 + 35 * t + 54 * glow), int(29 + 28 * t + 38 * glow))
    draw = ImageDraw.Draw(img, "RGBA")
    for i in range(10):
        y = int(H * (0.08 + i * 0.105))
        pts = []
        for x in range(-30, W + 40, 24):
            yy = y + int(20 * math.sin(x / 125 + i * 0.7))
            pts.append((x, yy))
        draw.line(pts, fill=(125, 239, 207, 24 if i % 2 else 18), width=3)
    for r in range(6):
        margin = 70 + r * 34
        draw.rounded_rectangle((margin, margin, W - margin, H - margin), radius=42, outline=(117, 222, 190, max(5, 20-r*2)), width=2)
    cx, cy = 830, 400
    c = (183, 250, 224, 180)
    if motif == "institution":
        draw.rectangle((cx-110, cy-55, cx+110, cy+95), outline=c, width=8)
        draw.polygon([(cx-135, cy-55), (cx, cy-150), (cx+135, cy-55)], outline=c, width=8)
        for xx in range(cx-75, cx+90, 45): draw.rectangle((xx, cy-15, xx+22, cy+45), outline=c, width=6)
        draw.ellipse((cx-30, cy+42, cx+30, cy+102), outline=c, width=6)
    elif motif == "finance":
        draw.ellipse((cx-130, cy-30, cx+130, cy+30), outline=c, width=8)
        draw.ellipse((cx-130, cy-75, cx+130, cy-15), outline=c, width=8)
        draw.ellipse((cx-130, cy+15, cx+130, cy+75), outline=c, width=8)
        draw.line((cx-130, cy-75, cx-130, cy+75), fill=c, width=8); draw.line((cx+130, cy-75, cx+130, cy+75), fill=c, width=8)
        draw.line((cx-75, cy-165, cx-75, cy-75), fill=c, width=7); draw.line((cx+75, cy-165, cx+75, cy-75), fill=c, width=7)
    elif motif == "follow":
        draw.rounded_rectangle((cx-115, cy-145, cx+115, cy+155), radius=24, outline=c, width=8)
        for yy in (cy-75, cy, cy+75):
            draw.line((cx-55, yy, cx-28, yy+24), fill=c, width=8)
            draw.line((cx-28, yy+24, cx+10, yy-20), fill=c, width=8)
            draw.line((cx+35, yy, cx+80, yy), fill=c, width=7)
    else:
        draw.rounded_rectangle((cx-135, cy-75, cx+135, cy+105), radius=28, outline=c, width=9)
        draw.line((cx-75, cy-75, cx-75, cy-125), fill=c, width=8); draw.line((cx+75, cy-75, cx+75, cy-125), fill=c, width=8)
        draw.line((cx-135, cy-15, cx+135, cy-15), fill=c, width=7)
        draw.arc((cx-55, cy+8, cx+55, cy+88), 0, 180, fill=c, width=7)
    img = img.filter(ImageFilter.GaussianBlur(0.15))
    img.save(os.path.join(OUT, f"{name}.png"), optimize=True)

make_cover("institution-cover-final", "institution")
make_cover("finance-cover-final", "finance")
make_cover("follow-up-cover-final", "follow")
make_cover("private-office-cover-final", "office")
