# 아틀라스 다시 굽기: python reatlas.py <src_dir> <out_dir> <kid/name> <scale> <quality> <alpha_quality> [method] [step]
# step>1 = 프레임 솎기(원래 round(j*step) 번째만, fps/step). release 는 '공이 손을 떠난 첫 프레임' 뜻을 지키게 원래 release 이상인 첫 프레임.
# 프레임마다 따로 줄여(이웃 프레임 번짐 없음) 같은 격자로 다시 붙이고, json 의 픽셀 값(frames·anchor·height·ball·ballR)을 같은 배율로.
import sys, json, os, io
from PIL import Image
src, out, name, s, q, aq = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
method = int(sys.argv[7]) if len(sys.argv) > 7 else 6
step = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
im = Image.open(f'{src}/{name}.webp').convert('RGBA')
meta = json.load(open(f'{src}/{name}.json', encoding='utf8'))
fr = meta['frames']
w0, h0 = fr[0]['w'], fr[0]['h']
assert all(f['w'] == w0 and f['h'] == h0 for f in fr)
orig = list(range(len(fr)))
if step != 1:
    n = len(fr); orig = []
    j = 0
    while True:
        i = int(j * step + 0.5)
        if i > n - 1: break
        orig.append(i); j += 1
    if orig[-1] != n - 1: orig.append(n - 1)
    ev = meta.get('events') or {}
    # 사건 프레임(웅크림·놓기·착지·닿기)은 꼭 남긴다: 가장 가까운(뒤쪽 먼저) 남긴 프레임을 그 프레임으로 바꾼다
    for v in sorted(set(ev.values())):
        if v in orig: continue
        cand = sorted(range(len(orig)), key=lambda j: (abs(orig[j] - v), orig[j] < v))
        for j in cand:
            lo = orig[j - 1] if j > 0 else -1; hi = orig[j + 1] if j + 1 < len(orig) else n
            if lo < v < hi and orig[j] not in ev.values(): orig[j] = v; break
    new_ev = {}
    for k, v in ev.items():
        new_ev[k] = orig.index(v) if v in orig else (next(j for j, i in enumerate(orig) if i >= v) if k == 'release' else min(range(len(orig)), key=lambda j: abs(orig[j] - v)))
    if ev: meta['events'] = new_ev
    meta['fps'] = round(meta['fps'] / step, 3)
    if 'ball' in meta: meta['ball'] = [meta['ball'][i] for i in orig]
    print(' frames', n, '->', len(orig), 'events', ev, '->', new_ev, 'orig', orig, flush=True)
if True:
    s = s if s != 1 else 1.0
    w1, h1 = round(w0 * s), round(h0 * s)
    sx, sy = w1 / w0, h1 / h0
    cols = sum(1 for f in fr if f['y'] == fr[0]['y'])
    rows = (len(orig) + cols - 1) // cols
    atlas = Image.new('RGBA', (cols * w1, rows * h1), (0, 0, 0, 0))
    nf = []
    for i, f in enumerate([fr[o] for o in orig]):
        c = im.crop((f['x'], f['y'], f['x'] + w0, f['y'] + h0))
        # 미리곱한 알파로 줄여 가장자리에 검은/초록 테가 안 생기게
        if (w1, h1) != (w0, h0): c = c.convert('RGBa').resize((w1, h1), Image.LANCZOS).convert('RGBA')
        x, y = (i % cols) * w1, (i // cols) * h1
        atlas.paste(c, (x, y)); nf.append({'x': x, 'y': y, 'w': w1, 'h': h1})
    meta['frames'] = nf
    k = (sx + sy) / 2
    if 'anchor' in meta: meta['anchor'] = {'x': round(meta['anchor']['x'] * sx, 1), 'y': round(meta['anchor']['y'] * sy, 1)}
    if 'height' in meta: meta['height'] = round(meta['height'] * sy, 2)
    if 'ballR' in meta: meta['ballR'] = round(meta['ballR'] * k, 2)
    if 'ball' in meta:
        def sc(b):
            if b is None: return None
            if isinstance(b, dict): return {'x': round(b['x'] * sx, 1), 'y': round(b['y'] * sy, 1)}
            return [round(b[0] * sx, 1), round(b[1] * sy, 1)]
        meta['ball'] = [sc(b) for b in meta['ball']]
    im = atlas
os.makedirs(os.path.dirname(f'{out}/{name}'), exist_ok=True)
im.save(f'{out}/{name}.webp', 'WEBP', quality=q, alpha_quality=aq, method=method)
json.dump(meta, open(f'{out}/{name}.json', 'w', encoding='utf8', newline='\n'), ensure_ascii=False, separators=(',', ':'))
print(name, s, q, aq, im.size, os.path.getsize(f'{out}/{name}.webp') // 1024, 'KB', flush=True)
