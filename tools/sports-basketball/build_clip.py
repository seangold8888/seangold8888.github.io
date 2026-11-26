# 영상 → 농구 아틀라스(shoot·shoot-idle·shoot-cheer). python build_clip.py <npy이름> <출력폴더> <설정json>
import sys, json, os, numpy as np, cv2
from PIL import Image
from balltrack import ball
name, OUT, cfg = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
fr = np.load(name + '.npy', mmap_mode='r'); N, Hh, Ww, _ = fr.shape
# 같은 그림 반복(24fps → 60fps) 빼기
sm = [fr[i][::8, ::8].astype(np.int16) for i in range(N)]
U = [0]
for i in range(1, N):
    if np.abs(sm[i] - sm[U[-1]]).mean() > 0.6: U.append(i)
def key(f):
    f = f.astype(np.float32) / 255; r, g, b = f[..., 0], f[..., 1], f[..., 2]
    gm = g - np.maximum(r, b)
    a = 1 - np.clip((gm - 0.04) / 0.10, 0, 1)
    a = cv2.GaussianBlur(a, (3, 3), 0)
    out = f.copy(); sp = np.clip(gm, 0, None); out[..., 1] = g - sp * 0.95   # 초록 번짐 빼기
    a[:6, :] *= np.linspace(0, 1, 6)[:, None]       # 맨 위 가장자리
    return np.dstack([np.clip(out, 0, 1), a])
REL = cfg['release']           # 이 원본 프레임부터 영상 공을 지운다(공이 손을 떠남)
def erase_ball(rgba, raw):
    bb = ball(fr[raw], 600)
    if not bb or bb[1] > cfg.get('eraseMaxY', 9999): return      # 공은 머리 위에만(빨간 반바지를 공으로 잘못 보지 않게)
    cx, cy, R = bb[0], bb[1], bb[2] * 1.5
    yy, xx = np.ogrid[:Hh, :Ww]; inside = (xx - cx) ** 2 + (yy - cy) ** 2 < R * R
    f = fr[raw].astype(np.int16); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    skin = (r > 150) & (g > 0.55 * r) & (g < 0.9 * r) & (b > 0.4 * r) & (b < 0.85 * r)          # 손가락은 남긴다
    kill = inside & ~skin
    rgba[..., 3][kill] = 0
    # 공 테두리 찌꺼기: 아이 몸(가장 큰 덩어리)과 떨어진 것은 다 지운다
    m = (rgba[..., 3] > 0.08).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n > 2:   # 몸에서 떨어진 덩어리 중 공 근처(공 반지름 2.6배 안)에 있는 것만
        keep = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
        for c in range(1, n):
            if c == keep: continue
            x, y, w, h, _ = st[c]
            if (x + w / 2 - cx) ** 2 + (y + h / 2 - cy) ** 2 < (bb[2] * 2.6) ** 2: rgba[..., 3][lab == c] = 0
SC = cfg['height'] / cfg['standH']                              # 원본 → 아틀라스 배율(키 기준)
AX, AY = cfg['anchor']                                          # 원본 발 기준점
ONLY = cfg.get('only')
def build(act, raws, fps, loop, events=None, keep_ball=True, pingpong=False):
    if ONLY and act not in ONLY: return None, None
    frames = []
    for raw in raws:
        k = key(fr[raw])
        if raw >= REL and raw <= REL + cfg.get('eraseFor', 40): erase_ball(k, raw)
        bb = ball(fr[raw]) if (keep_ball and raw < REL) else None
        frames.append((k, bb))
    A = np.max([k[..., 3] for k, _ in frames], axis=0)
    ys, xs = np.where(A > 0.35); pad = 8
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(Hh, ys.max() + pad), max(0, xs.min() - pad), min(Ww, xs.max() + pad)
    tw, th = int(round((x1 - x0) * SC)), int(round((y1 - y0) * SC))
    cols = min(len(frames), max(1, int(4000 // tw))); rows = (len(frames) + cols - 1) // cols
    atlas = Image.new('RGBA', (tw * cols, th * rows), (0, 0, 0, 0)); meta = []; balls = []
    for i, (k, bb) in enumerate(frames):
        im = Image.fromarray((k[y0:y1, x0:x1] * 255).astype(np.uint8), 'RGBA').resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * tw, (i // cols) * th; atlas.paste(im, (x, y)); meta.append({'x': x, 'y': y, 'w': tw, 'h': th})
        balls.append([round((bb[0] - x0) * SC, 1), round((bb[1] - y0) * SC, 1)] if bb else None)
    os.makedirs(OUT, exist_ok=True)
    atlas.save(f'{OUT}/{act}.webp', quality=cfg.get('q', 80), method=6)
    j = {'frames': meta, 'fps': fps, 'anchor': {'x': round((AX - x0) * SC, 1), 'y': round((AY - y0) * SC, 1)}, 'height': cfg['height'], 'loop': loop}
    if events: j['events'] = events
    if pingpong: j['pingpong'] = True
    if any(balls): j['ball'] = balls; j['ballR'] = round(cfg['ballR'] * SC, 1)
    json.dump(j, open(f'{OUT}/{act}.json', 'w'), separators=(',', ':'))
    print(act, len(frames), atlas.size, os.path.getsize(f'{OUT}/{act}.webp') // 1024, 'KB')
    return atlas, j
def ix(raw): return min(range(len(U)), key=lambda i: abs(U[i] - raw))
s0, s1 = ix(cfg['shoot'][0]), ix(cfg['shoot'][1])
ci, ri, li = ix(cfg['crouch']), ix(REL), ix(cfg['land'])
step = cfg.get('riseStep', 1)       # 웅크림 → 손 떠남 사이가 길면 건너뛰어 빠르게
sel = [i for i in range(s0, s1 + 1) if not (ci < i < ri and (i - ci) % step)]
raws = [U[i] for i in sel]
ev = {'crouch': sel.index(ci), 'release': sel.index(ri), 'land': sel.index(li)}
build('shoot', raws, 24, False, ev)
i0, i1 = ix(cfg['idle'][0]), ix(cfg['idle'][1]); r = U[i0:i1 + 1]; build('shoot-idle', r, 12, True, pingpong=True)
c0, c1 = ix(cfg['cheer'][0]), ix(cfg['cheer'][1]); r = U[c0:c1 + 1]
build('shoot-cheer', r, 24, True, keep_ball=False, pingpong=bool(cfg.get('pingpong')))
print('release raw', REL, 'ball', ball(fr[REL]))
