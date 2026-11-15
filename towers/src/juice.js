// Spell Towers — 화려한 효과용 부품: 입자 풀(그림)과 겹소리(Web Audio 합성). 게임 규칙과는 무관하다(보이는 것·들리는 것만).
// 입자는 화면 논리 좌표(main.js 의 SX/SY 결과, 회전 화면도 이미 반영된 좌표)에 산다. 그릴 때 main 이 (k, ox, oy) 를 넘긴다.
// 성능: 입자는 미리 잡아 둔 Float32Array 에 담고(프레임마다 새 객체 없음), 죽은 것은 맨 끝 것과 바꿔 지운다.
//       상한(cap)을 넘는 새 입자는 버린다. shadowBlur·filter 는 쓰지 않는다.
const TAU = Math.PI * 2;

// 입자 종류
export const P_GLOW = 0, P_STREAK = 1, P_SPIN = 2, P_RING = 3, P_GEM = 4;

export function createParticles(cap) {
  const N = cap;
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const g = new Float32Array(N), drag = new Float32Array(N), t = new Float32Array(N), life = new Float32Array(N);
  const s0 = new Float32Array(N), s1 = new Float32Array(N), rot = new Float32Array(N), vr = new Float32Array(N);
  const tx = new Float32Array(N), ty = new Float32Array(N), a0 = new Float32Array(N);
  const type = new Uint8Array(N), tex = new Uint8Array(N), add = new Uint8Array(N);
  const texList = [];               // 캔버스(그림) 또는 색 문자열(선·고리)
  let n = 0;
  const api = {
    cap: N, get count() { return n; },
    arrived: 0,                     // 수정 입자가 HUD 에 닿은 수(main 이 읽고 0 으로)
    reg(item) { texList.push(item); return texList.length - 1; },
    clear() { n = 0; },
    // 하나 만들기. 자리가 없으면 -1
    add(ty_, tex_, px, py, pvx, pvy, plife, ps0, ps1, pg = 0, pdrag = 0, padd = 0, prot = 0, pvr = 0, palpha = 1) {
      if (n >= N) return -1;
      const i = n++;
      type[i] = ty_; tex[i] = tex_; x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy; life[i] = plife; t[i] = 0;
      s0[i] = ps0; s1[i] = ps1; g[i] = pg; drag[i] = pdrag; add[i] = padd; rot[i] = prot; vr[i] = pvr; a0[i] = palpha;
      return i;
    },
    target(i, px, py) { if (i >= 0) { tx[i] = px; ty[i] = py; } },
    update(dt) {
      let i = 0;
      while (i < n) {
        t[i] += dt;
        if (t[i] >= life[i]) {
          if (type[i] === P_GEM) api.arrived++;
          n--; if (i !== n) copy(n, i); continue;
        }
        if (type[i] === P_GEM) {
          // 처음 0.28초는 튀어 나가고(속도·감속), 그다음 HUD 로 빨려 간다
          const k = t[i] / life[i];
          if (k < 0.3) { const d = Math.max(0, 1 - drag[i] * dt); vx[i] *= d; vy[i] *= d; x[i] += vx[i] * dt; y[i] += vy[i] * dt; }
          else { const q = (k - 0.3) / 0.7, e = q * q * 0.35 + 0.08; x[i] += (tx[i] - x[i]) * Math.min(1, e * 60 * dt * (1 + q * 3)); y[i] += (ty[i] - y[i]) * Math.min(1, e * 60 * dt * (1 + q * 3)); }
          rot[i] += vr[i] * dt;
        } else {
          if (drag[i]) { const d = Math.max(0, 1 - drag[i] * dt); vx[i] *= d; vy[i] *= d; }
          vy[i] += g[i] * dt; x[i] += vx[i] * dt; y[i] += vy[i] * dt; rot[i] += vr[i] * dt;
        }
        i++;
      }
    },
    // lite: 품질이 낮을 때 lighter 겹칠을 빼고 한 번에(빛 입자도 보통으로) 그린다
    draw(ctx, k, ox, oy, lite = false) {
      if (!n) return;
      if (lite) { pass(ctx, k, ox, oy, -1); ctx.globalAlpha = 1; ctx.setTransform(k, 0, 0, k, ox, oy); return; }
      pass(ctx, k, ox, oy, 0);
      ctx.globalCompositeOperation = "lighter";
      pass(ctx, k, ox, oy, 1);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1; ctx.setTransform(k, 0, 0, k, ox, oy);
    },
  };
  // 빛줄 그림: 색 문자열마다 한 번(꼬리는 투명 → 색 → 머리는 흰빛, 위아래 가장자리는 부드럽게)
  const streaks = new Map();
  function streakOf(ti) {
    let c = streaks.get(ti);
    if (!c) {
      const col = texList[ti]; c = document.createElement("canvas"); c.width = 64; c.height = 16;
      const x2 = c.getContext("2d"), gr = x2.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, col); gr.addColorStop(0.9, "#ffffff"); gr.addColorStop(1, "rgba(255,255,255,0.6)");
      x2.fillStyle = gr; x2.beginPath(); x2.ellipse(32, 8, 31, 6.5, 0, 0, TAU); x2.fill();
      x2.globalCompositeOperation = "destination-in"; const vg = x2.createLinearGradient(0, 0, 0, 16);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(0.5, "rgba(0,0,0,1)"); vg.addColorStop(1, "rgba(0,0,0,0)"); x2.fillStyle = vg; x2.fillRect(0, 0, 64, 16);
      streaks.set(ti, c);
    }
    return c;
  }
  function copy(a, b) {
    x[b] = x[a]; y[b] = y[a]; vx[b] = vx[a]; vy[b] = vy[a]; g[b] = g[a]; drag[b] = drag[a]; t[b] = t[a]; life[b] = life[a];
    s0[b] = s0[a]; s1[b] = s1[a]; rot[b] = rot[a]; vr[b] = vr[a]; tx[b] = tx[a]; ty[b] = ty[a]; a0[b] = a0[a];
    type[b] = type[a]; tex[b] = tex[a]; add[b] = add[a];
  }
  function pass(ctx, k, ox, oy, addPass) {
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.lineCap = "round";
    let rotTf = false;            // 도는 그림이 변환을 바꿨으면 다음 보통 입자 앞에서만 되돌린다
    for (let i = 0; i < n; i++) {
      if (addPass >= 0 && add[i] !== addPass) continue;
      const q = t[i] / life[i], tp = type[i];
      // 나타날 때 아주 짧게 커지고, 끝으로 갈수록 흐려진다
      const alpha = a0[i] * (q < 0.08 ? q / 0.08 : 1 - (q - 0.08) / 0.92);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      if (rotTf && (tp === P_GLOW || tp === P_RING)) { ctx.setTransform(k, 0, 0, k, ox, oy); rotTf = false; }
      if (tp === P_GLOW) {
        const e = 1 - (1 - q) * (1 - q), s = s0[i] + (s1[i] - s0[i]) * e, im = texList[tex[i]];
        ctx.drawImage(im, x[i] - s / 2, y[i] - s / 2, s, s);
      } else if (tp === P_STREAK) {
        // 속도 방향의 빛줄: 미리 그린 캡슐 그림을 늘려 붙인다(선 그리기보다 싸다). s0 = 굵기, s1 = 길이 배수
        const len = s1[i] * (1 - q * 0.6), sp = Math.hypot(vx[i], vy[i]) || 1, L = Math.max(4, sp * len), w = Math.max(1.5, s0[i] * (1 - q * 0.6) * 1.8);
        const c = vx[i] / sp * k, sn = vy[i] / sp * k;
        ctx.setTransform(c, sn, -sn, c, ox + x[i] * k, oy + y[i] * k);
        ctx.drawImage(streakOf(tex[i]), -L, -w / 2, L + w * 0.5, w);
        rotTf = true;
      } else if (tp === P_RING) {
        const e = 1 - (1 - q) * (1 - q) * (1 - q), r = s0[i] + (s1[i] - s0[i]) * e;
        ctx.strokeStyle = texList[tex[i]]; ctx.lineWidth = Math.max(1, vr[i] * (1 - q));
        ctx.beginPath(); ctx.arc(x[i], y[i], r, 0, TAU); ctx.stroke();
      } else {
        // 도는 그림(별·색종이·얼음 조각·수정)
        const s = s0[i] + (s1[i] - s0[i]) * q, c = Math.cos(rot[i]) * k, sn = Math.sin(rot[i]) * k;
        ctx.setTransform(c, sn, -sn, c, ox + x[i] * k, oy + y[i] * k);
        ctx.drawImage(texList[tex[i]], -s / 2, -s / 2, s, s);
        rotTf = true;
      }
    }
  }
  return api;
}

/* ---------- 겹소리: 낮은 쿵 + 몸통 + 반짝 꼬리 ----------
   getAc() 가 null 이면(소리 끔·오디오 없음) 아무것도 안 한다. 모든 소리는 압축기 하나를 거쳐 너무 커지지 않게. */
export function createSynth(getAc) {
  let bus = null, busAc = null, noiseBuf = null;
  function out() {
    const a = getAc(); if (!a) return null;
    if (busAc !== a) {
      busAc = a;
      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      const master = a.createGain(); master.gain.value = 0.9;
      master.connect(comp); comp.connect(a.destination); bus = master;
      const len = Math.floor(a.sampleRate * 0.8); noiseBuf = a.createBuffer(1, len, a.sampleRate);
      const d = noiseBuf.getChannelData(0); let s = 7; for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    }
    return a;
  }
  function tone(f0, f1, dur, type = "sine", vol = 0.1, delay = 0, attack = 0.004) {
    const a = out(); if (!a) return;
    const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + attack); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(bus); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, ftype = "bandpass", f0 = 1000, f1 = 0, q = 1, delay = 0, attack = 0.004) {
    const a = out(); if (!a) return;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + delay;
    src.buffer = noiseBuf; src.loop = true;
    f.type = ftype; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + attack); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(bus); src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.03);
  }
  const L = lv => 0.6 + lv * 0.14;       // 단계가 오르면 커진다
  const S = {
    tone, noise,
    fire(lv, br) {
      const k = L(lv);
      tone(150, 55, 0.12, "sine", 0.11 * k);                           // 쿵
      noise(0.14, 0.05 * k, "bandpass", 1600, 500, 0.9);               // 휙(불꽃 바람)
      tone(520, 300, 0.07, "triangle", 0.03 * k);
      if (lv >= 3) noise(0.08, 0.03 * k, "highpass", 4000, 0, 0.7, 0.03);  // 타닥
      if (br === "b") tone(90, 40, 0.25, "sine", 0.12 * k, 0.02);
    },
    fireHit(lv, big) {
      const k = L(lv);
      tone(big ? 110 : 180, big ? 40 : 70, big ? 0.3 : 0.12, "sine", (big ? 0.16 : 0.07) * k);
      noise(big ? 0.35 : 0.12, (big ? 0.09 : 0.04) * k, "lowpass", big ? 1800 : 2600, 300, 0.7);
      if (big) noise(0.25, 0.03 * k, "highpass", 5000, 0, 0.7, 0.05);
    },
    ice(lv) {
      const k = L(lv);
      tone(110, 60, 0.18, "sine", 0.07 * k);
      noise(0.3, 0.035 * k, "highpass", 3000, 7000, 0.7);               // 서리 쏴아
      [1568, 2093, 2637].slice(0, 1 + Math.min(2, lv >> 1)).forEach((f, i) => tone(f, f * 0.98, 0.18, "sine", 0.025 * k, 0.03 + i * 0.05));
    },
    freeze() { tone(2400, 1800, 0.12, "square", 0.02); tone(3136, 3000, 0.25, "sine", 0.04, 0.03); noise(0.15, 0.03, "highpass", 6000, 0, 0.8); },
    bolt(lv, br) {
      const k = L(lv);
      tone(br === "b" ? 70 : 120, 40, br === "b" ? 0.35 : 0.15, "sine", 0.13 * k);
      noise(br === "b" ? 0.4 : 0.18, 0.07 * k, "bandpass", 2500, 900, 0.6);   // 지지직
      tone(1800, 500, 0.08, "sawtooth", 0.02 * k);
      if (lv >= 3) tone(2600, 2200, 0.12, "square", 0.012 * k, 0.04);
    },
    wind(lv) {
      const k = L(lv);
      noise(0.42, 0.07 * k, "bandpass", 400, 1600, 1.2, 0, 0.06);        // 휘이잉
      tone(200, 420, 0.3, "sine", 0.04 * k, 0, 0.05);
      tone(90, 60, 0.15, "sine", 0.06 * k, 0.05);
    },
    light(lv, br) {
      const k = L(lv);
      tone(140, 70, 0.14, "sine", 0.08 * k);
      tone(880, 1760, 0.22, "sine", 0.04 * k);
      tone(1320, 2640, 0.22, "triangle", 0.02 * k, 0.02);
      noise(0.28, 0.025 * k, "highpass", 6000, 0, 0.6, 0.04);            // 반짝 꼬리
      if (br === "b") tone(60, 50, 0.4, "sine", 0.1 * k);
    },
    pop(step) {
      // 비눗방울 퐁 — 연속일수록 음이 올라간다
      const f = 620 * Math.pow(1.06, Math.min(14, step));
      tone(f, f * 2.1, 0.09, "sine", 0.07); tone(f * 2, f * 3, 0.06, "triangle", 0.025, 0.02);
      noise(0.05, 0.02, "highpass", 5000, 0, 0.8);
    },
    multi(n) { [784, 988, 1175, 1568, 1976].slice(0, Math.min(5, n)).forEach((f, i) => tone(f, f, 0.12, "triangle", 0.06, i * 0.05)); tone(100, 50, 0.25, "sine", 0.12); },
    levelUp(lv, evo) {
      tone(90, 45, 0.4, "sine", 0.14);
      noise(0.5, 0.04, "bandpass", 500, 4000, 0.8, 0, 0.1);              // 쏴아 올라가는 소리
      const notes = evo ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(f, f, 0.18, "triangle", 0.08, 0.08 + i * 0.07));
      tone(2093, 2093, 0.6, "sine", 0.03, 0.08 + notes.length * 0.07);
    },
    bossPhase() { tone(80, 40, 0.5, "sine", 0.16); noise(0.4, 0.06, "lowpass", 1200, 200, 0.7); tone(330, 220, 0.3, "square", 0.03, 0.05); },
    bossDown() {
      [0, 0.25, 0.5, 0.8].forEach((d, i) => { tone(120 - i * 15, 35, 0.45, "sine", 0.17, d); noise(0.4, 0.07, "lowpass", 2400, 300, 0.7, d); });
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.22, "triangle", 0.07, 0.9 + i * 0.08));
      noise(1.2, 0.03, "highpass", 6000, 9000, 0.6, 0.9, 0.2);
    },
    // 대마법: 끌어올림(0~0.5초) → 쿵 + 화음 → 반짝 꼬리
    stinger(big = true, hit = 0.5) {
      noise(hit + 0.05, 0.06, "bandpass", 300, 3500, 1.4, 0, hit * 0.9);
      tone(110, 440, hit + 0.05, "sawtooth", 0.025, 0, hit * 0.8);
      tone(70, 30, 0.9, "sine", big ? 0.22 : 0.14, hit);
      noise(0.6, big ? 0.09 : 0.05, "lowpass", 2400, 200, 0.7, hit);
      const chord = big ? [523, 659, 784, 1047, 1319, 1568, 2093] : [659, 784, 1047, 1319];
      chord.forEach((f, i) => tone(f, f, 0.5, "triangle", 0.05, hit + i * 0.045));
      if (big) { tone(2637, 2637, 1.2, "sine", 0.025, hit + 0.3, 0.05); noise(1.3, 0.025, "highpass", 7000, 10000, 0.5, hit + 0.2, 0.2); }
    },
    comet(i) { const f = 900 + (i % 8) * 90; tone(f * 2, f, 0.18, "sine", 0.03); },
    cardFly() { noise(0.4, 0.05, "bandpass", 600, 3000, 1.2, 0, 0.05); tone(400, 1200, 0.35, "sine", 0.04); },
    tap() { tone(880, 880, 0.06, "sine", 0.05); },
  };
  return S;
}
