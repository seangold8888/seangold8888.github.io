// 알림 띠(배너) 차례 정하기 — 한 번에 하나만(DOM 없음, Node 테스트).
//  · 결과 배너(pri 2: 골·홈런·막았다·끝 …)는 바로 바꿔 띄운다(앞 배너·힌트·판정 글자를 지운다).
//  · 보통 배너(pri 1: 판 이름·콤보·보너스 타임 …)는 앞 배너가 MIN_SHOW 만큼 읽힐 때까지 기다렸다 띄운다(줄은 최대 2개, 오래된 것부터 버림).
//  · 배너가 떠 있는 동안 들어온 힌트(pri 0)는 버린다(배너와 겹치지 않게).
// show(item) 이 실제로 띄우고 hide() 가 지운다(juice.js 가 DOM 으로). now = 밀리초 시계.

export const MIN_SHOW = 650;
export const MAX_WAIT = 2;

export function createBannerQueue({ show, hide, now = () => Date.now(), minShow = MIN_SHOW } = {}) {
  let cur = null, queue = [];
  function put(item) {
    cur = { ...item, at: now(), until: now() + (item.ms || 1400) };
    if (show) show(cur);
  }
  return {
    // 새 배너. 돌려주는 값: "shown" | "queued" | "dropped"
    push(item) {
      const pri = item.pri != null ? item.pri : 1;
      const it = { ...item, pri };
      const t = now();
      if (cur && t >= cur.until) { if (hide) hide(cur); cur = null; }
      if (!cur || pri > cur.pri || (pri === cur.pri && pri >= 2) || t - cur.at >= minShow) { queue = queue.filter(q => q.pri > pri); put(it); return "shown"; }
      if (pri === 0) return "dropped";
      queue.push(it); while (queue.length > MAX_WAIT) queue.shift();
      return "queued";
    },
    // 프레임마다(또는 타이머로): 다 보인 배너를 지우고 기다리던 다음 배너를 띄운다
    tick() {
      const t = now();
      if (cur && t >= cur.until) { if (hide) hide(cur); cur = null; }
      if (queue.length && (!cur || t - cur.at >= minShow)) { const next = queue.shift(); put(next); }
      return cur;
    },
    get current() { return cur && now() < cur.until ? cur : null; },
    get pending() { return queue.length; },
    clear() { if (cur && hide) hide(cur); cur = null; queue = []; },
  };
}
