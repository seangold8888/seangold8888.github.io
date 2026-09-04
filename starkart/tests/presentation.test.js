// 별빛 카트 배틀 — presentation (hud / vfx / audio) 테스트. node --test tests/presentation.test.js
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createHud, createTouchControls, formatTime, normalizeTimeMs, ordinalKo, rankColor,
  speedFraction, cssColor, resultTitle, manaStars, minimapTransform, HUD_PALETTE, MINIMAP_SIZE,
} from "../src/hud.js";
import {
  createVfx, createParticlePool, spawnParticle, killParticle, advanceParticles, driftColor, VFX_MAX, KIND,
} from "../src/vfx.js";
import {
  createAudio, makeSoftClipCurve, makePluckSamples, pentatonicFreq, stepSeconds, readMutedFrom,
  MUSIC_SCENES, MUTE_KEY, SCALE_PENTA,
} from "../src/audio.js";

const hasDom = typeof document !== "undefined";

// ---------- HUD 순수 헬퍼 ----------

test("formatTime: mm:ss.t", () => {
  assert.equal(formatTime(0), "00:00.0");
  assert.equal(formatTime(65432), "01:05.4");
  assert.equal(formatTime(599999), "09:59.9");
  assert.equal(formatTime(600000), "10:00.0");
  assert.equal(formatTime(-5), "00:00.0");
  assert.equal(formatTime(NaN), "00:00.0");
  assert.equal(formatTime(99 * 60000 + 120000), "99:00.0"); // 분 포화
});

test("normalizeTimeMs: 초/ms 혼용 정규화", () => {
  assert.equal(normalizeTimeMs(90), 90000);
  assert.equal(normalizeTimeMs(90000), 90000);
  assert.equal(normalizeTimeMs(0), 0);
  assert.equal(normalizeTimeMs(undefined), 0);
});

test("ordinalKo / rankColor", () => {
  assert.equal(ordinalKo(1), "1위");
  assert.equal(ordinalKo(6), "6위");
  assert.equal(ordinalKo(0), "－위");
  assert.equal(ordinalKo(undefined), "－위");
  assert.equal(rankColor(1), HUD_PALETTE.star);
  assert.equal(rankColor(2), HUD_PALETTE.silver);
  assert.equal(rankColor(3), HUD_PALETTE.bronze);
  assert.equal(rankColor(4), HUD_PALETTE.cream);
});

test("speedFraction clamps to 0..1 using boost speed", () => {
  assert.equal(speedFraction(0), 0);
  assert.equal(speedFraction(18, 36), 0.5);
  assert.equal(speedFraction(100), 1);
  assert.equal(speedFraction(-18, 36), 0.5);
});

test("cssColor / resultTitle / manaStars", () => {
  assert.equal(cssColor(0xf4b6c2), "#f4b6c2");
  assert.equal(cssColor(0x000010), "#000010");
  assert.equal(cssColor("#abc"), "#abc");
  assert.equal(cssColor(undefined), HUD_PALETTE.cream);
  assert.match(resultTitle(1), /1위/);
  assert.match(resultTitle(3), /3위/);
  assert.match(resultTitle(5), /5위/);
  assert.equal(resultTitle(null), "경주 끝!");
  assert.equal(manaStars(2), "★★☆☆☆");
  assert.equal(manaStars(9), "★★★★★");
  assert.equal(manaStars(-1), "☆☆☆☆☆");
});

test("minimapTransform fits every point inside the pad", () => {
  const pts = [];
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 80 + 30, y: 0, z: Math.sin(a) * 40 - 10 });
  }
  const pad = 14;
  const tf = minimapTransform(pts, MINIMAP_SIZE, pad);
  for (const p of pts) {
    const x = tf.toX(p.x), y = tf.toY(p.z);
    assert.ok(x >= pad - 1e-6 && x <= MINIMAP_SIZE - pad + 1e-6, `x ${x}`);
    assert.ok(y >= pad - 1e-6 && y <= MINIMAP_SIZE - pad + 1e-6, `y ${y}`);
  }
  // +Z 가 위쪽(작은 y)
  assert.ok(tf.toY(30) < tf.toY(-50));
  // 빈 입력도 안전
  const empty = minimapTransform([], 150, 10);
  assert.equal(empty.toX(0), 75);
});

test("createHud / createTouchControls: DOM 없으면 no-op", { skip: hasDom }, () => {
  const hud = createHud(null);
  assert.doesNotThrow(() => hud.update({ time: 3 }, { state: { lap: 1 } }, {}));
  assert.doesNotThrow(() => hud.showCountdown(3));
  assert.doesNotThrow(() => hud.showResults([], () => {}, () => {}));
  assert.doesNotThrow(() => hud.showToast("안녕"));
  assert.equal(hud.handRoot, null);
  const tc = createTouchControls(null, () => {});
  assert.deepEqual(tc.state, { steer: 0, drift: false, hop: false });
  assert.doesNotThrow(() => tc.destroy());
});

test("createHud renders and updates (DOM only)", { skip: !hasDom }, () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const hud = createHud(root);
  assert.ok(hud.handRoot);
  hud.update({ time: 65.4, track: null, vehicles: [] }, { state: { lap: 2, rank: 3, speed: 18 } }, { mana: 2 });
  assert.equal(root.querySelector(".sk-lap").textContent, "2/3 바퀴");
  assert.equal(root.querySelector(".sk-rank").textContent, "3위");
  assert.equal(root.querySelector(".sk-timer").textContent, "01:05.4");
  hud.destroy();
});

// ---------- VFX 풀 ----------

test("particle pool: spawn until full, then -1; kill frees", () => {
  const pool = createParticlePool(4);
  assert.equal(pool.capacity, 4);
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push(spawnParticle(pool, 0, 0, 0, 0, 0, 0, 1, 0.3, 1, 1, 1, KIND.CIRCLE, 0, 0));
  assert.deepEqual(ids, [0, 1, 2, 3]);
  assert.equal(pool.alive, 4);
  assert.equal(spawnParticle(pool, 0, 0, 0, 0, 0, 0, 1, 0.3, 1, 1, 1), -1);
  assert.equal(killParticle(pool, 2), true);
  assert.equal(killParticle(pool, 2), false);
  assert.equal(pool.alive, 3);
  assert.equal(pool.size[2], 0);
  assert.equal(spawnParticle(pool, 0, 0, 0, 0, 0, 0, 1, 0.3, 1, 1, 1), 2);
});

test("advanceParticles: moves, applies gravity, expires", () => {
  const pool = createParticlePool(8);
  const a = spawnParticle(pool, 0, 0, 0, 2, 0, 0, 1.0, 0.3, 1, 1, 1, KIND.CIRCLE, 10, 0);
  const b = spawnParticle(pool, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 1, 1, 1, KIND.STAR, 0, 0);
  assert.equal(advanceParticles(pool, 0.5), 1); // b 만료
  assert.equal(pool.live[b], 0);
  assert.equal(pool.live[a], 1);
  assert.ok(Math.abs(pool.pos[a * 3] - 1.0) < 1e-6);
  assert.ok(pool.vel[a * 3 + 1] < 0, "gravity pulls down");
  assert.ok(pool.alpha[a] > 0 && pool.alpha[a] <= 1);
  advanceParticles(pool, 1.0);
  assert.equal(pool.alive, 0);
  assert.equal(pool.freeCount, 8);
  assert.equal(advanceParticles(pool, 0), 0);
});

test("driftColor: orange at 0, blue at 1, reuses out", () => {
  const c0 = driftColor(0);
  const c1 = driftColor(1);
  assert.ok(c0[0] > 0.9 && c0[2] < 0.2, "orange");
  assert.ok(c1[2] > 0.95 && c1[0] < 0.5, "blue");
  const out = [0, 0, 0];
  assert.equal(driftColor(0.5, out), out);
  assert.ok(out[0] > c1[0] && out[0] < c0[0]);
  assert.deepEqual(driftColor(-3), c0);
  assert.deepEqual(driftColor(9), c1);
});

test("createVfx without Three/scene returns a no-op", () => {
  for (const vfx of [createVfx(null, null), createVfx({}, undefined), createVfx({ add() {} }, {})]) {
    assert.doesNotThrow(() => {
      vfx.driftSparks({ state: { drifting: true } }, 0.016);
      vfx.boostTrail({ state: { boostTimer: 1 } }, 0.016);
      vfx.hit({ x: 0, y: 0, z: 0 }, "spin");
      vfx.shield({ id: "a" }, true);
      vfx.spin({ state: { x: 0, z: 0 } });
      vfx.update(0.016, null);
      vfx.destroy();
    });
    assert.equal(vfx.pool, null);
  }
  assert.equal(VFX_MAX, 600);
});

// ---------- 오디오 순수 헬퍼 ----------

test("makeSoftClipCurve: odd-symmetric, ends at ±1", () => {
  const c = makeSoftClipCurve(1025, 1.3);
  assert.equal(c.length, 1025);
  assert.ok(Math.abs(c[0] + 1) < 1e-6);
  assert.ok(Math.abs(c[1024] - 1) < 1e-6);
  assert.ok(Math.abs(c[512]) < 1e-6);
  assert.ok(Math.abs(c[300] + c[724]) < 1e-6);
});

test("makePluckSamples: Karplus-Strong decays and stays bounded", () => {
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const s = makePluckSamples(44100, 440, 0.4, rng);
  assert.equal(s.length, Math.floor(44100 * 0.4));
  let maxAbs = 0, headEnergy = 0, tailEnergy = 0;
  for (let i = 0; i < s.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(s[i]));
    if (i < 2000) headEnergy += s[i] * s[i];
    if (i >= s.length - 2000) tailEnergy += s[i] * s[i];
  }
  assert.ok(maxAbs <= 1, "bounded");
  assert.ok(headEnergy > tailEnergy * 4, "decays");
});

test("pentatonicFreq / stepSeconds", () => {
  assert.ok(Math.abs(pentatonicFreq(0) - 261.63) < 1e-6);
  assert.ok(Math.abs(pentatonicFreq(5) - 523.26) < 1e-6);
  assert.ok(Math.abs(pentatonicFreq(1) - 261.63 * Math.pow(2, 2 / 12)) < 1e-6);
  assert.ok(Math.abs(pentatonicFreq(-1) - 261.63 * Math.pow(2, -3 / 12)) < 1e-6); // 아래 옥타브의 라
  assert.deepEqual([...SCALE_PENTA], [0, 2, 4, 7, 9]);
  assert.ok(Math.abs(stepSeconds(128, 2) - 0.234375) < 1e-9);
  assert.ok(Math.abs(stepSeconds(92, 2) - 60 / 92 / 2) < 1e-9);
  assert.equal(MUSIC_SCENES.race.bpm, 128);
  assert.equal(MUSIC_SCENES.menu.bpm, 92);
  for (const def of Object.values(MUSIC_SCENES)) {
    assert.equal(def.melody.length % 8, 0);
    assert.ok(def.bass.length >= 4);
  }
});

test("readMutedFrom tolerates missing/throwing storage", () => {
  assert.equal(readMutedFrom(null), false);
  assert.equal(readMutedFrom({ getItem: () => "1" }), true);
  assert.equal(readMutedFrom({ getItem: () => "0" }), false);
  assert.equal(readMutedFrom({ getItem: () => { throw new Error("blocked"); } }), false);
  assert.equal(MUTE_KEY, "starkart_muted");
});

test("createAudio without window/AudioContext returns a no-op with mute state", { skip: typeof window !== "undefined" }, () => {
  const audio = createAudio();
  assert.doesNotThrow(() => {
    audio.prime();
    audio.engine(0.5, true);
    audio.drift(true);
    audio.hit("spin");
    audio.card("attack");
    audio.countdown(3);
    audio.countdown(0);
    audio.fanfare(1);
    audio.music("race");
    audio.music(null);
    audio.destroy();
  });
  assert.equal(audio.isMuted(), false);
  audio.mute(true);
  assert.equal(audio.isMuted(), true);
  audio.mute(false);
  assert.equal(audio.isMuted(), false);
});
