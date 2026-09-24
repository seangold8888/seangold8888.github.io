# 멀티버스 2 그림 다듬기: 초록 배경을 투명하게 빼고, 여백을 잘라, 게임 크기로 줄여 webp로 저장한다.
# 사용법: python tools/mv-sprites.py <원본폴더> [키...]
import sys, pathlib
import numpy as np
from PIL import Image

SITE = pathlib.Path(__file__).resolve().parents[1]
OUT = SITE / "multiverse" / "art"

# 게임에서 쓰는 높이(px). 아이패드 레티나에서도 흐리지 않게 화면 크기의 약 1.5배로 둔다.
HEIGHT = {"jaei": 460, "taeo": 460, "enemy": 280, "boss": 560}


def key_green(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    # 초록이 20 이하로 더 세면 캐릭터, 90 이상이면 배경. 그 사이는 가장자리라 반투명.
    alpha = np.clip(1.0 - (spill - 20.0) / 70.0, 0.0, 1.0)
    # 가장자리에 남은 초록빛을 걷어 낸다.
    g2 = np.where(spill > 0, np.maximum(r, b), g)
    rgb = np.stack([r, g2, b], axis=-1)
    rgba = np.concatenate([rgb, (alpha * 255.0)[..., None]], axis=-1)
    return Image.fromarray(rgba.clip(0, 255).astype(np.uint8), "RGBA")


def crop(img, pad=6):
    alpha = np.asarray(img)[..., 3]
    ys, xs = np.where(alpha > 24)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + pad + 1)
    return img.crop((x0, y0, x1, y1))


def process(src):
    key = src.stem
    OUT.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    if key.startswith("bg-"):
        img = img.convert("RGB").resize((1600, 900), Image.LANCZOS)
        img.save(OUT / (key + ".webp"), "WEBP", quality=80, method=6)
    else:
        sprite = crop(key_green(img))
        kind = key.split("-")[0]
        h = HEIGHT.get(kind, 400)
        w = max(1, round(sprite.width * h / sprite.height))
        sprite = sprite.resize((w, h), Image.LANCZOS)
        sprite.save(OUT / (key + ".webp"), "WEBP", quality=86, method=6)
    print(key, (OUT / (key + ".webp")).stat().st_size // 1024, "KB")


def main():
    raw = pathlib.Path(sys.argv[1])
    only = set(sys.argv[2:])
    for src in sorted(raw.glob("*.png")):
        if not only or src.stem in only:
            process(src)


if __name__ == "__main__":
    main()
