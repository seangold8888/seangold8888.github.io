// 모든 게임 공용: 아이패드에서 사라진 "손가락 뗌" 신호를 대신 보내 준다.
//
// 아이패드는 버튼을 누른 채 손가락이 화면 모서리로 미끄러지면(홈·앱 전환 제스처 등)
// pointerup도 pointercancel도 보내지 않을 때가 있다. 그러면 게임은 버튼이 계속 눌린 줄 알고
// 캐릭터가 혼자 걸어간다(2026-09-25 케데헌 루미, 멀티버스에서 재현).
//
// 방법: 터치로 시작된 포인터를 기억해 두었다가, 화면에 손가락이 하나도 남지 않았는데
// 끝났다는 신호를 못 받은 것이 있으면 그 요소에 pointercancel을 대신 보낸다.
// 각 게임은 이미 pointercancel을 받으면 버튼을 놓도록 되어 있어서 게임 코드를 고치지 않아도 된다.
(function () {
  "use strict";
  if (window.__touchGuard) return;
  window.__touchGuard = true;

  var active = new Map(); // pointerId -> 처음 누른 요소
  var fingers = 0;

  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") active.set(e.pointerId, e.target);
  }, true);
  ["pointerup", "pointercancel"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (e.pointerType === "touch") active.delete(e.pointerId);
    }, true);
  });

  function releaseLost() {
    if (fingers !== 0 || active.size === 0) return;
    var lost = Array.from(active.entries());
    active.clear();
    lost.forEach(function (pair) {
      var target = pair[1];
      if (!target || !target.isConnected) return;
      try {
        target.dispatchEvent(new PointerEvent("pointercancel", {
          pointerId: pair[0], pointerType: "touch", isPrimary: true, bubbles: true, cancelable: false
        }));
      } catch (error) { /* PointerEvent를 못 만드는 옛 브라우저는 그냥 둔다. */ }
    });
  }

  document.addEventListener("touchstart", function (e) { fingers = e.touches.length; }, { capture: true, passive: true });
  ["touchend", "touchcancel"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      fingers = e.touches.length;
      // 진짜 pointerup이 먼저 도착할 시간을 주고, 그사이 새 손가락이 닿았으면 건드리지 않는다.
      if (fingers === 0) setTimeout(releaseLost, 80);
    }, { capture: true, passive: true });
  });
  // 앱을 벗어났다 돌아오면 남은 터치는 모두 끝난 것이다.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { fingers = 0; releaseLost(); }
  });
  window.__touchGuardState = function () { return { active: active.size, fingers: fingers }; };
})();
