// 느린 화면 다시 보기(그림 방식과 무관). 종목은 프레임마다 "그릴 상태"(작은 평범한 객체)를 넣고,
// 멋진 순간에 mark() 하면 그 앞 seconds 초 + 뒤 tail 초를 클립으로 떼어 둔다(점수 weight 가 더 큰 순간만 바꾼다).
// 보여 주기는 view 가 한다: view.replay(clip, { speed: 0.4 }) — clip.frames 를 0.4배 속도로 다시 그린다.
// DOM 없음(Node 테스트).

export function createReplay({ seconds = 2, tail = 0.4, maxFrames = 600 } = {}) {
  let buf = [], best = null, pending = null;
  return {
    // t: 게임 시각(초), snap: 그릴 상태(복사본을 넣을 것)
    push(t, snap) {
      buf.push({ t, s: snap });
      while (buf.length > maxFrames || (buf.length > 2 && t - buf[0].t > seconds + tail + 0.2)) buf.shift();
      if (pending && t >= pending.until) {
        const from = pending.at - seconds;
        best = { weight: pending.weight, label: pending.label, at: pending.at, frames: buf.filter(f => f.t >= from && f.t <= pending.until).map(f => ({ t: f.t - from, s: f.s })) };
        pending = null;
      }
    },
    // 멋진 순간 표시. weight 가 지금 클립보다 크면 바꾼다.
    mark(t, weight = 1, label = "") {
      if ((best && best.weight >= weight) || (pending && pending.weight >= weight)) return false;
      pending = { at: t, until: t + tail, weight, label };
      return true;
    },
    get clip() { return best && best.frames.length > 4 ? best : null; },
    // clip 에서 시각 u(초)의 상태 — 두 프레임 사이는 가까운 앞 프레임(view 가 보간하고 싶으면 a,b,k 를 쓴다)
    sample(clip, u) {
      const f = clip.frames; let i = 0;
      while (i < f.length - 1 && f[i + 1].t <= u) i++;
      const a = f[i], b = f[Math.min(f.length - 1, i + 1)], k = b.t > a.t ? Math.min(1, Math.max(0, (u - a.t) / (b.t - a.t))) : 0;
      return { a: a.s, b: b.s, k };
    },
    reset() { buf = []; best = null; pending = null; },
  };
}
