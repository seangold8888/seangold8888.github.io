import sys, imageio_ffmpeg, subprocess, numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
ff = imageio_ffmpeg.get_ffmpeg_exe()
info = subprocess.run([ff, '-i', src], capture_output=True, text=True).stderr
import re; m = re.search(r'(\d{3,4})x(\d{3,4})', info); W, H = int(m.group(1)), int(m.group(2))
print(re.findall(r'Stream.*Video.*', info))
raw = subprocess.run([ff, '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
n = len(fr); print('frames', n, W, H)
np.save(out + '.npy', fr)
step = max(1, n // 40); idx = list(range(0, n, step))[:40]
tw, th = W // 5, H // 5
sheet = Image.new('RGB', (tw * 10, th * 4), 'white'); d = ImageDraw.Draw(sheet)
for k, i in enumerate(idx):
    im = Image.fromarray(fr[i]).resize((tw, th)); sheet.paste(im, ((k % 10) * tw, (k // 10) * th)); d.text(((k % 10) * tw + 4, (k // 10) * th + 4), str(i), fill='red')
sheet.save(out + '_sheet.jpg', quality=85)
