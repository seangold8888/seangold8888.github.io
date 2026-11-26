# 그림 한 장 → 농구 아틀라스(shoot·shoot-idle·shoot-cheer). 영상 클립이 없을 때의 대신(squash/stretch + 윗몸 휘기).
# python build_still.py <png> <출력폴더> <설정json>   — 클립이 오면 build_clip.py 로 같은 이름 파일을 덮어쓰면 된다.
import sys, json, os, math, numpy as np, cv2
from PIL import Image
from balltrack import ball
src, OUT, cfg = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
rgb = np.array(Image.open(src).convert('RGB')); Hh, Ww, _ = rgb.shape
f = rgb.astype(np.float32) / 255; r, g, b = f[..., 0], f[..., 1], f[..., 2]
gm = g - np.maximum(r, b); a = 1 - np.clip((gm - 0.06) / 0.12, 0, 1); a = cv2.GaussianBlur(a, (3, 3), 0)
col = f.copy(); col[..., 1] = g - np.clip(gm, 0, None) * 0.95
base = np.dstack([np.clip(col, 0, 1), a])
bx, by, bR = ball(rgb)[:3]
noball = base.copy()
yy, xx = np.ogrid[:Hh, :Ww]; inside = (xx - bx) ** 2 + (yy - by) ** 2 < (bR * 1.12) ** 2
i16 = rgb.astype(np.int16); R_, G_, B_ = i16[..., 0], i16[..., 1], i16[..., 2]; skin = (R_ > 150) & (G_ > 0.55 * R_) & (G_ < 0.9 * R_) & (B_ > 0.4 * R_) & (B_ < 0.85 * R_)
noball[..., 3][inside & ~skin] = 0
AX, AY = cfg['anchor']; WAIST = cfg['waist']
def warp(img, sx, sy, lift, lean, rot):
    """발(AX,AY) 기준 늘이기 + 위로 뜨기, 허리 위는 rot 만큼 뒤로 젖히고 lean 만큼 앞으로."""
    M1 = np.float32([[sx, 0, AX - sx * AX], [0, sy, AY - sy * AY - lift]])
    low = cv2.warpAffine(img, M1, (Ww, Hh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    wy = AY - sy * (AY - WAIST) - lift; wx = AX
    c, s = math.cos(rot), math.sin(rot)
    R = np.float32([[c, -s, wx - c * wx + s * wy + lean], [s, c, wy - s * wx - c * wy]])
    up = cv2.warpAffine(low, R, (Ww, Hh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    m = np.clip((wy + 40 - np.arange(Hh)) / 80, 0, 1)[:, None, None]
    out = up * m + low * (1 - m)
    def P(x, y):
        x1, y1 = M1[0, 0] * x + M1[0, 2], M1[1, 1] * y + M1[1, 2]
        return (R[0, 0] * x1 + R[0, 1] * y1 + R[0, 2], R[1, 0] * x1 + R[1, 1] * y1 + R[1, 2])
    return out, P
def ease(t): return t * t * (3 - 2 * t)
# 자세 열쇠: (sx, sy, lift, lean, rot)
def shoot_keys():
    k = []
    for i in range(9):  # 0..8 웅크리기(공이 조금 내려온다)
        t = ease(i / 8); k.append((1 + 0.05 * t, 1 - 0.12 * t, 0, 14 * t, 0.10 * t))
    for i in range(1, 6):  # 9..13 뛰어오르며 던지기(13 = 손을 떠남)
        t = ease(i / 5); k.append((1.05 - 0.09 * t, 0.88 + 0.2 * t, 55 * t, 14 - 30 * t, 0.10 - 0.28 * t))
    for i in range(1, 6):  # 14..18 공중 → 내려옴
        t = i / 5; k.append((0.96, 1.08 - 0.06 * t, 55 * (1 - t * t), -16, -0.18 + 0.06 * t))
    for i in range(1, 6):  # 19..23 착지 찌그러짐 → 바로 서기
        t = i / 5; q = math.sin(t * math.pi); k.append((1 + 0.06 * q, 1 - 0.08 * q, 0, -16 * (1 - t), -0.12 * (1 - t)))
    return k
REL, CROUCH, LAND = 13, 8, 19
def frames_for(keys, use_ball_until):
    out = []
    for i, kk in enumerate(keys):
        img = base if i < use_ball_until else noball
        im, P = warp(img, *kk)
        out.append((im, P(bx, by) if i < use_ball_until else None))
    return out
def save(act, frames, fps, loop, events=None):
    A = np.max([fr[0][..., 3] for fr in frames], axis=0); ys, xs = np.where(A > 0.35); pad = 8
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(Hh, ys.max() + pad), max(0, xs.min() - pad), min(Ww, xs.max() + pad)
    SC = cfg['height'] / cfg['standH']; tw, th = int(round((x1 - x0) * SC)), int(round((y1 - y0) * SC))
    cols = min(len(frames), max(1, 4000 // tw)); rows = (len(frames) + cols - 1) // cols
    atlas = Image.new('RGBA', (tw * cols, th * rows), (0, 0, 0, 0)); meta = []; balls = []
    for i, (im, bp) in enumerate(frames):
        p = Image.fromarray((np.clip(im[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8), 'RGBA').resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * tw, (i // cols) * th; atlas.paste(p, (x, y)); meta.append({'x': x, 'y': y, 'w': tw, 'h': th})
        balls.append([round((bp[0] - x0) * SC, 1), round((bp[1] - y0) * SC, 1)] if bp else None)
    os.makedirs(OUT, exist_ok=True); atlas.save(f'{OUT}/{act}.webp', quality=cfg.get('q', 76), method=6)
    j = {'frames': meta, 'fps': fps, 'anchor': {'x': round((AX - x0) * SC, 1), 'y': round((AY - y0) * SC, 1)}, 'height': cfg['height'], 'loop': loop, 'source': 'still'}
    if events: j['events'] = events
    if any(balls): j['ball'] = balls; j['ballR'] = round(bR * SC, 1)
    json.dump(j, open(f'{OUT}/{act}.json', 'w'), separators=(',', ':'))
    print(act, len(frames), atlas.size, os.path.getsize(f'{OUT}/{act}.webp') // 1024, 'KB')
save('shoot', frames_for(shoot_keys(), REL), 24, False, {'crouch': CROUCH, 'release': REL, 'land': LAND})
idle = [(1 - 0.006 * math.sin(i / 12 * 2 * math.pi), 1 + 0.014 * math.sin(i / 12 * 2 * math.pi), 0, 0, 0.015 * math.sin(i / 12 * 2 * math.pi)) for i in range(12)]
save('shoot-idle', frames_for(idle, 99), 12, True)
cheer = []
for i in range(16):
    t = i / 16; h = abs(math.sin(t * 2 * math.pi)); gq = max(0, 1 - h * 5)
    cheer.append((1 + 0.06 * gq, 1 - 0.08 * gq + 0.04 * h, 70 * h, 0, -0.1 + 0.08 * math.sin(t * 4 * math.pi)))
save('shoot-cheer', frames_for(cheer, 0), 24, True)
print('ball', bx, by, bR)
