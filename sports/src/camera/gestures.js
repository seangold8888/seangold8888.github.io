// 몸짓 감지(DOM·카메라 없음 — 관절 좌표 흐름만 받는다. Node 테스트로 검사).
// 좌표는 MediaPipe Pose 정규화 좌표(x 0~1 왼→오, y 0~1 위→아래, 화면 기준). 길이는 "몸통 길이"(어깨 중심~엉덩이 중심)로 나눠
// 아이 키·카메라 거리에 상관없이 같은 기준을 쓴다.
//
// 쓰는 몸짓: jump(제자리 뛰기) · hipCircle(훌라후프 엉덩이 돌리기) · swing(팔 휘두르기: 야구 배트·라켓)
//            kick(발차기: 축구) · throw(던지기: 농구·공 던지기)
// 각 감지기: d = createXxx(baseline, opts); 프레임마다 d.push(frame, tMs) → 감지되면 이벤트 객체, 아니면 null.

export const LM = Object.freeze({ nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 });

const vis = p => (p && (p.visibility == null ? 1 : p.visibility)) || 0;
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// 관절 33개 → 쓰기 쉬운 몸 요약. 어깨·엉덩이가 안 보이면 ok=false.
export function bodyFrame(lms, minVis = 0.5) {
  if (!Array.isArray(lms) || lms.length < 29) return { ok: false };
  const ls = lms[LM.lShoulder], rs = lms[LM.rShoulder], lh = lms[LM.lHip], rh = lms[LM.rHip];
  if (Math.min(vis(ls), vis(rs), vis(lh), vis(rh)) < minVis) return { ok: false };
  const sh = mid(ls, rs), hip = mid(lh, rh);
  const torso = Math.hypot(sh.x - hip.x, sh.y - hip.y);
  if (!(torso > 0.04)) return { ok: false };
  const la = lms[LM.lAnkle], ra = lms[LM.rAnkle];
  const feet = Math.min(vis(la), vis(ra)) >= minVis * 0.8;
  return {
    ok: true, torso, sh, hip, feet,
    ankleY: feet ? (la.y + ra.y) / 2 : null,
    lAnkle: la, rAnkle: ra, lKnee: lms[LM.lKnee], rKnee: lms[LM.rKnee],
    lWrist: lms[LM.lWrist], rWrist: lms[LM.rWrist], lShoulder: ls, rShoulder: rs,
    wristVis: [vis(lms[LM.lWrist]), vis(lms[LM.rWrist])],
  };
}

// 보정: "가만히 서 있어요" — needMs 동안 몸이 보이고 엉덩이가 거의 안 움직이면 기준(baseline) 완성.
export function createCalibrator({ needMs = 1200, still = 0.12 } = {}) {
  let start = -1, samples = [];
  return {
    // → { done, progress 0~1, reason, baseline }
    push(f, t) {
      if (!f || !f.ok) { start = -1; samples = []; return { done: false, progress: 0, reason: "body" }; }
      if (start < 0) start = t;
      samples.push({ t, hipY: f.hip.y, hipX: f.hip.x, torso: f.torso, ankleY: f.ankleY });
      const hy = samples.map(s => s.hipY), tor = samples.reduce((a, s) => a + s.torso, 0) / samples.length;
      if (Math.max(...hy) - Math.min(...hy) > still * tor) { start = t; samples = samples.slice(-1); return { done: false, progress: 0, reason: "move" }; }
      const progress = Math.min(1, (t - start) / needMs);
      if (progress < 1) return { done: false, progress, reason: "hold" };
      const n = samples.length, avg = k => samples.reduce((a, s) => a + (s[k] == null ? 0 : s[k]), 0) / n;
      return { done: true, progress: 1, baseline: { hipY: avg("hipY"), hipX: avg("hipX"), torso: tor, ankleY: samples.every(s => s.ankleY != null) ? avg("ankleY") : null } };
    },
    reset() { start = -1; samples = []; },
  };
}

// 제자리 뛰기: 엉덩이가 기준보다 rise×몸통 이상 올라가면 "jump". 뛰기 시작 시각(엉덩이가 처음 움직인 때)을 같이 준다.
// 땅에 다시 내려오면(arm 높이 아래) 다음 뛰기를 받는다. 서 있을 때 기준을 천천히 따라가 아이가 앞뒤로 움직여도 버틴다.
export function createJumpDetector(baseline, { rise = 0.16, start = 0.04, arm = 0.07, follow = 0.02 } = {}) {
  const b = { ...baseline };
  let armed = true, liftAt = -1, last = null;
  return {
    get baseline() { return { ...b }; },
    push(f, t) {
      if (!f || !f.ok) return null;
      const torso = b.torso || f.torso;
      const up = (b.hipY - f.hip.y) / torso;           // 위로 올라간 정도(몸통 단위)
      const vel = last ? (last.y - f.hip.y) / torso / Math.max(1, t - last.t) * 1000 : 0;   // 몸통/초(위로 +)
      last = { y: f.hip.y, t };
      if (up < arm) {
        if (!armed && up < arm * 0.6) armed = true;
        if (Math.abs(up) < arm) { b.hipY += (f.hip.y - b.hipY) * follow; b.torso += (f.torso - b.torso) * follow; }
        liftAt = up > start ? (liftAt < 0 ? t : liftAt) : -1;
        return null;
      }
      if (liftAt < 0) liftAt = t;
      if (armed && up >= rise && vel > -0.5) {
        armed = false;
        const ev = { type: "jump", t, takeoff: liftAt, height: up };
        liftAt = -1;
        return ev;
      }
      return null;
    },
  };
}

// 훌라후프: 엉덩이 중심이 기준점 둘레를 도는 각도를 모은다. 한 바퀴(2π)마다 "circle"(dir: 1 시계 / -1 반시계).
// 너무 작은 흔들림(minR×몸통 미만)은 각도에 넣지 않는다.
export function createHipCircleDetector(baseline, { minR = 0.035 } = {}) {
  let cx = baseline.hipX, cy = baseline.hipY, prevA = null, acc = 0, count = 0;
  return {
    get turns() { return count; },
    push(f, t) {
      if (!f || !f.ok) return null;
      const torso = baseline.torso || f.torso;
      cx += (f.hip.x - cx) * 0.03; cy += (f.hip.y - cy) * 0.03;     // 중심은 아주 천천히 따라간다
      const dx = (f.hip.x - cx) / torso, dy = (f.hip.y - cy) / torso;
      if (Math.hypot(dx, dy) < minR) return null;
      const a = Math.atan2(dy, dx);
      if (prevA != null) {
        let d = a - prevA; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) < Math.PI * 0.6) acc += d;
      }
      prevA = a;
      if (Math.abs(acc) >= Math.PI * 2) {
        const dir = Math.sign(acc); acc -= dir * Math.PI * 2; count++;
        return { type: "circle", t, dir, turns: count };
      }
      return null;
    },
  };
}

// 팔 휘두르기: 손목 속도가 speed(몸통/초) 이상이 된 순간 "swing". side: "any" | "left" | "right"
export function createSwingDetector(baseline, { speed = 4.5, side = "any", cooldown = 450 } = {}) {
  let prev = null, lastAt = -1e9;
  return {
    push(f, t) {
      if (!f || !f.ok) return null;
      const torso = baseline.torso || f.torso, cur = { l: f.lWrist, r: f.rWrist, t };
      let ev = null;
      if (prev && t - lastAt > cooldown) {
        const dt = Math.max(1, t - prev.t) / 1000;
        for (const k of side === "left" ? ["l"] : side === "right" ? ["r"] : ["l", "r"]) {
          const a = prev[k], c = cur[k]; if (!a || !c) continue;
          const v = Math.hypot(c.x - a.x, c.y - a.y) / torso / dt;
          if (v >= speed && (!ev || v > ev.speed)) ev = { type: "swing", t, side: k === "l" ? "left" : "right", speed: v, dx: c.x - a.x, dy: c.y - a.y };
        }
        if (ev) lastAt = t;
      }
      prev = cur;
      return ev;
    },
  };
}

// 발차기: 한쪽 발목이 빠르게 올라가 무릎 높이 근처까지 오면 "kick"
export function createKickDetector(baseline, { lift = 0.5, speed = 3, cooldown = 600 } = {}) {
  let prev = null, lastAt = -1e9;
  return {
    push(f, t) {
      if (!f || !f.ok || !f.feet) { prev = null; return null; }
      const torso = baseline.torso || f.torso, base = baseline.ankleY != null ? baseline.ankleY : f.hip.y + torso * 2;
      let ev = null;
      if (prev && t - lastAt > cooldown) {
        const dt = Math.max(1, t - prev.t) / 1000;
        for (const [k, a] of [["left", f.lAnkle], ["right", f.rAnkle]]) {
          const up = (base - a.y) / torso, v = (prev[k] - a.y) / torso / dt;
          if (up >= lift && v >= speed) { ev = { type: "kick", t, side: k, height: up, speed: v }; break; }
        }
        if (ev) lastAt = t;
      }
      prev = { left: f.lAnkle.y, right: f.rAnkle.y, t };
      return ev;
    },
  };
}

// 던지기: 손목이 어깨 위로 올라갔다가(준비) 빠르게 내려오거나 앞으로 나가면 "throw"
export function createThrowDetector(baseline, { speed = 4, cooldown = 700 } = {}) {
  let ready = { left: false, right: false }, prev = null, lastAt = -1e9;
  return {
    push(f, t) {
      if (!f || !f.ok) return null;
      const torso = baseline.torso || f.torso;
      let ev = null;
      const sides = [["left", f.lWrist, f.lShoulder], ["right", f.rWrist, f.rShoulder]];
      for (const [k, w, s] of sides) if (w && s && w.y < s.y - 0.15 * torso) ready[k] = true;
      if (prev && t - lastAt > cooldown) {
        const dt = Math.max(1, t - prev.t) / 1000;
        for (const [k, w] of sides) {
          const p = prev[k]; if (!ready[k] || !w || !p) continue;
          const v = Math.hypot(w.x - p.x, w.y - p.y) / torso / dt;
          if (v >= speed) { ev = { type: "throw", t, side: k, speed: v }; ready[k] = false; break; }
        }
        if (ev) lastAt = t;
      }
      prev = { left: f.lWrist && { ...f.lWrist }, right: f.rWrist && { ...f.rWrist }, t };
      return ev;
    },
  };
}

export const DETECTORS = Object.freeze({
  jump: createJumpDetector, hipCircle: createHipCircleDetector, swing: createSwingDetector,
  kick: createKickDetector, throw: createThrowDetector,
});
