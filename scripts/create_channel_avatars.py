from PIL import Image, ImageDraw
import math, os
OUT = "/home/ubuntu/webdev-static-assets/generated-avatars"
os.makedirs(OUT, exist_ok=True)
S = 640

def base():
    img = Image.new("RGB", (S, S), (5, 45, 36))
    px = img.load()
    for y in range(S):
        for x in range(S):
            d = math.hypot(x-S*.7, y-S*.25)
            glow = max(0, 1-d/500)
            px[x,y] = (int(5+3*glow), int(45+40*glow), int(36+35*glow))
    return img

def draw_avatar(name, kind):
    img = base(); d = ImageDraw.Draw(img, "RGBA"); c=(190,250,224,230); dark=(2,32,26,120)
    d.ellipse((28,28,S-28,S-28), fill=dark, outline=(103,215,181,110), width=5)
    cx=320; cy=330
    if kind == "finance":
        d.ellipse((cx-145,cy-38,cx+145,cy+38), outline=c, width=13)
        d.ellipse((cx-145,cy-100,cx+145,cy-25), outline=c, width=13)
        d.ellipse((cx-145,cy+25,cx+145,cy+100), outline=c, width=13)
        d.line((cx-145,cy-100,cx-145,cy+100), fill=c, width=13); d.line((cx+145,cy-100,cx+145,cy+100), fill=c, width=13)
        d.line((cx-85,cy-190,cx-85,cy-100), fill=c, width=11); d.line((cx+85,cy-190,cx+85,cy-100), fill=c, width=11)
    elif kind == "follow":
        d.rounded_rectangle((cx-132,cy-175,cx+132,cy+190), radius=28, outline=c, width=13)
        for yy in (cy-85, cy+5, cy+95):
            d.line((cx-75,yy,cx-40,yy+32), fill=c, width=13)
            d.line((cx-40,yy+32,cx+18,yy-35), fill=c, width=13)
            d.line((cx+55,yy,cx+100,yy), fill=c, width=11)
    else:
        d.rounded_rectangle((cx-160,cy-85,cx+160,cy+130), radius=35, outline=c, width=14)
        d.line((cx-95,cy-85,cx-95,cy-145), fill=c, width=13); d.line((cx+95,cy-85,cx+95,cy-145), fill=c, width=13)
        d.line((cx-160,cy-15,cx+160,cy-15), fill=c, width=11)
        d.arc((cx-75,cy+10,cx+75,cy+115), 0, 180, fill=c, width=11)
    img.save(os.path.join(OUT, name + ".png"), optimize=True)

draw_avatar("finance-avatar", "finance")
draw_avatar("follow-up-avatar", "follow")
draw_avatar("private-office-avatar", "office")
