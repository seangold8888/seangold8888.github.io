import sys, json
from PIL import Image, ImageDraw
d, act, idxs = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
j = json.load(open(f'{d}/{act}.json')); A = Image.open(f'{d}/{act}.webp').convert('RGBA')
f0 = j['frames'][0]; tw, th = f0['w'], f0['h']
out = Image.new('RGBA', (tw * len(idxs), th), (0, 0, 0, 0))
for k, i in enumerate(idxs):
    bg = Image.new('RGBA', (tw, th), (120, 150, 200, 255)); dd = ImageDraw.Draw(bg)
    for y in range(0, th, 16):
        for x in range(0, tw, 16):
            if (x // 16 + y // 16) % 2: dd.rectangle([x, y, x + 15, y + 15], fill=(230, 180, 120, 255))
    f = j['frames'][i]; bg.alpha_composite(A.crop((f['x'], f['y'], f['x'] + tw, f['y'] + th)))
    dd = ImageDraw.Draw(bg); b = j.get('ball', [None] * 999)[i]
    if b: r = j['ballR']; dd.ellipse([b[0] - r, b[1] - r, b[0] + r, b[1] + r], outline=(255, 0, 255, 255), width=2)
    ax, ay = j['anchor']['x'], j['anchor']['y']; dd.line([ax - 20, ay, ax + 20, ay], fill=(255, 0, 0, 255), width=2)
    dd.text((4, 4), str(i), fill=(0, 0, 0, 255)); out.paste(bg, (k * tw, 0))
out.convert('RGB').save(sys.argv[4], quality=88); print(j.get('events'), len(j['frames']), j['anchor'], j.get('ballR'))
