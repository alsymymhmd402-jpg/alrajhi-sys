from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from PIL import Image, ImageDraw

archive = Path('/home/ubuntu/webdev-static-assets/icon-pack.zip')
output = Path('/home/ubuntu/webdev-static-assets/icon-pack-review.png')

candidates = []
with ZipFile(archive) as bundle:
    for member in bundle.infolist():
        name = member.filename.lower()
        if not name.endswith(('.png', '.webp', '.jpg', '.jpeg')) or member.file_size < 1500:
            continue
        try:
            with Image.open(BytesIO(bundle.read(member))) as image:
                width, height = image.size
                if width >= 32 and height >= 32:
                    candidates.append((width * height, member.filename, width, height, image.convert('RGBA').copy()))
        except Exception:
            continue

candidates.sort(key=lambda item: item[0], reverse=True)
selected = candidates[:36]
canvas = Image.new('RGBA', (960, 720), '#0f172a')
draw = ImageDraw.Draw(canvas)
for index, (_, name, width, height, image) in enumerate(selected):
    column, row = index % 6, index // 6
    x, y = column * 160, row * 120
    image.thumbnail((88, 76))
    card = Image.new('RGBA', (144, 104), '#ffffff')
    card.alpha_composite(image, ((144 - image.width) // 2, 8))
    canvas.alpha_composite(card, (x + 8, y + 8))
    draw.text((x + 12, y + 90), f'{Path(name).stem} · {width}×{height}', fill='#0f172a')

canvas.convert('RGB').save(output, quality=92)
print(f'Created {output} from {len(candidates)} eligible assets; reviewed {len(selected)}.')
