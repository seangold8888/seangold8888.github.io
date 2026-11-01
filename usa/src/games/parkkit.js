// 디즈니랜드 놀이기구들이 함께 쓰는 작은 도구(크기 단위, 탈것에 앉은 아이, 시작·도착 글자).
import { text, emoji, clamp } from "../engine.js";

// 그림 글자(이모지)는 fillStyle의 투명도를 따라가므로 불투명하게 맞춰 그린다.
export function emo(ctx, ch, x, y, size) { ctx.fillStyle = "#000"; emoji(ctx, ch, x, y, size); }

export const unit = env => clamp(Math.min(env.W, env.H) / 820, 0.7, 1.3);

// 아이 그림의 윗부분만(탈것에 앉은 모습). bottom = 잘린 아랫선 위치.
export function upper(ctx, img, x, bottom, h, flip) {
  if (!img) return;
  const frac = 0.56, w = img.width * h / img.height;
  ctx.save();
  ctx.translate(x, bottom);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, img.width, img.height * frac, -w / 2, -h * frac, w, h * frac);
  ctx.restore();
}

// 놀이기구 시작/끝 큰 글자
export function bigTitle(ctx, env, str, st, U, color = "#fff", stroke = "#ff5fa2") {
  const s = Math.min(1, st * 4);
  ctx.globalAlpha = Math.min(1, st * 5);
  text(ctx, str, env.W / 2, env.H * 0.3, 76 * U * (0.7 + 0.3 * s), { color, stroke, lw: 14 * U });
  ctx.globalAlpha = 1;
}

// 0~1 쉬운 가속·감속
export const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// 정수로 정해지는 가짜 난수(배경 모양을 매 프레임 똑같이 그리기 위해)
export function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
