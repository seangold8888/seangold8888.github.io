/* Optional concept exploration. Never changes party progress or learning records. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const dialog = $("parityDialog");
  let count = 4, pairs = 0;
  function cookie() { return '<i class="parity-cookie" aria-hidden="true"></i>'; }
  function render() {
    const remaining = count - pairs * 2, finished = remaining < 2;
    const topic = count + ([2, 4, 5, 9].includes(count) ? "는" : "은");
    $("parityCount").textContent = "쿠키 " + count + "개";
    $("parityLess").disabled = count === 0;
    $("parityMore").disabled = count === 10;
    $("parityPair").disabled = finished;
    $("parityPair").textContent = finished ? "짝짓기 끝!" : "두 개씩 짝짓기";
    $("parityBoard").innerHTML =
      Array.from({length: pairs}, () => '<span class="cookie-pair" role="img" aria-label="쿠키 두 개가 한 쌍">' + cookie() + cookie() + '</span>').join("") +
      (remaining ? '<span class="cookie-unpaired' + (finished ? ' leftover' : '') + '" role="img" aria-label="아직 짝짓지 않은 쿠키 ' + remaining + '개">' + cookie().repeat(remaining) + '</span>' : '');
    $("parityBoard").classList.toggle("is-odd", finished && remaining === 1);
    $("parityResult").textContent = !finished
      ? "두 개씩 짝지어 보자. 아직 " + remaining + "개가 있어."
      : count === 0
        ? "0개도 남는 쿠키가 없으니까 0은 짝수야."
        : remaining === 0
          ? pairs + "쌍! 남는 쿠키가 없어서 " + topic + " 짝수야."
          : (pairs ? pairs + "쌍을 만들고 " : "짝을 만들지 못한 쿠키 ") + "한 개가 남아서 " + topic + " 홀수야.";
    $("parityResult").dataset.kind = finished ? (remaining ? "odd" : "even") : "pending";
    document.querySelectorAll("[data-parity-example]").forEach(button =>
      button.setAttribute("aria-pressed", String(Number(button.dataset.parityExample) === count)));
  }
  document.querySelectorAll("[data-open-parity]").forEach(button => {
    button.addEventListener("click", () => { render(); dialog.showModal(); });
  });
  $("parityClose").addEventListener("click", () => dialog.close());
  $("parityLess").addEventListener("click", () => { if (count > 0) { count--; pairs = 0; render(); } });
  $("parityMore").addEventListener("click", () => { if (count < 10) { count++; pairs = 0; render(); } });
  $("parityPair").addEventListener("click", () => {
    if (count - pairs * 2 >= 2) {
      pairs++; render();
      if ($("parityPair").disabled) $("parityResult").focus({preventScroll: true});
    }
  });
  $("parityResult").tabIndex = -1;
  document.querySelectorAll("[data-parity-example]").forEach(button => {
    button.addEventListener("click", () => { count = Number(button.dataset.parityExample); pairs = 0; render(); });
  });
})();
