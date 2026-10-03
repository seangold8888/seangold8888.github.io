(function () {
  "use strict";
  const E = window.MathSwingStory, S = window.MathStore, storage = window.localStorage;
  const $ = id => document.getElementById(id);
  const main = S.load(storage);
  let state = E.load(storage, S.today(), main.climber), notice = "", showPreview = false;
  const name = () => state.character === "kitty" ? "키티" : "폼폼푸린";
  const dots = n => Array.from({ length:n }, (_,i) => '<span class="story-friend" aria-hidden="true" style="--friend-hue:'+((i*43+18)%360)+'deg"></span>').join("");
  const pairScene = (n, paired) => {
    const remaining = n - paired*2;
    const swings = Array.from({length:paired},(_,i)=>'<div class="story-swing" role="img" aria-label="'+(i+1)+'번째 그네에 친구 두 명"><i class="swing-bar"></i><i class="swing-rope left"></i><i class="swing-rope right"></i><div class="swing-seat">'+dots(2)+'</div></div>').join("");
    return '<div class="swing-land"><div class="swing-grid">'+swings+'</div><div class="waiting-friends" role="img" aria-label="아직 그네에 타지 않은 친구 '+remaining+'명">'+dots(remaining)+'</div></div><p class="board-caption">'+paired+'쌍이 탔어요 · 기다리는 친구 '+remaining+'명</p>';
  };
  function button(action,label,kind) { return '<button type="button" data-action="'+action+'" class="story-button '+(kind||'')+'">'+label+'</button>'; }
  function render() {
    const p = E.plan(state.date), phase = state.phase, leftover = p.count%2;
    const scene = $("storyBoard"), actions = $("storyActions");
    document.querySelectorAll(".story-steps span").forEach((el,i)=>{
      const active = phase === "pair" || phase === "paired" ? 0 : phase === "teach" ? 1 : 2;
      el.classList.toggle("active",i===active);el.classList.toggle("finished",i<active);
      if(i===active) el.setAttribute("aria-current","step"); else el.removeAttribute("aria-current");
    });
    $("switchFriend").textContent = (state.character === "kitty" ? "폼폼푸린" : "키티") + "와 함께하기";
    $("storyNotice").textContent = notice;
    if(phase==="pair" || phase==="paired") {
      $("sceneNumber").textContent="첫 번째 놀이";
      $("sceneTitle").textContent="친구 둘씩 그네에 태워 줘";
      $("sceneLine").textContent=phase==="pair" ? p.count+"명이 놀러 왔어. 아래 버튼을 누를 때마다 두 명이 한 그네에 앉아." : leftover ? "한 명이 남았네! 두 명씩 짝짓고 남으면 홀수야." : "아무도 남지 않았네! 모두 짝을 지으면 짝수야.";
      scene.innerHTML=pairScene(p.count,state.pairs);
      actions.innerHTML=phase==="pair" ? button("pair","친구 두 명 태우기","primary") : button("teach","재이 선생님 되기 →","primary");
    } else if(phase==="teach") {
      $("sceneNumber").textContent="두 번째 놀이";
      $("sceneTitle").textContent="재이 선생님, 알려 줘!";
      $("sceneLine").textContent=name()+": “"+p.count+"명은 "+(p.claimEven?"짝수":"홀수")+"야.” 맞을까?";
      scene.innerHTML=pairScene(p.count,state.pairs);
      actions.innerHTML=button("agree","응, 맞아")+button("disagree","다시 생각해 봐");
    } else if(phase==="transfer") {
      $("sceneNumber").textContent="세 번째 놀이";
      $("sceneTitle").textContent="이번에는 재이가 혼자 해볼까?";
      $("sceneLine").textContent="새 친구 "+p.transfer+"명이 왔어. 모두 두 명씩 그네에 타면 짝수일까, 홀수일까?";
      scene.innerHTML=showPreview ? pairScene(p.transfer,Math.floor(p.transfer/2)) : '<div class="new-friends" role="img" aria-label="새 친구 '+p.transfer+'명">'+dots(p.transfer)+'</div><p class="board-caption">처음과 다른 수야. 두 명씩 마음속으로 짝지어 봐.</p>';
      actions.innerHTML=button("even","짝수")+button("odd","홀수")+button("hint","그림으로 짝지어 보기","quiet");
    } else if(phase==="reason") {
      $("sceneNumber").textContent="마지막 생각";
      $("sceneTitle").textContent="어떻게 알았는지 알려 줘";
      $("sceneLine").textContent=p.transfer+"명이 두 명씩 그네를 탄 다음에는?";
      scene.innerHTML=pairScene(p.transfer,Math.floor(p.transfer/2));
      actions.innerHTML=button("none","아무도 남지 않아")+button("one","한 명이 남아");
    } else {
      $("sceneNumber").textContent="오늘의 이야기 끝";
      $("sceneTitle").textContent="재이 선생님 덕분에 다 탔어!";
      $("sceneLine").textContent="두 명씩 짝지어 보고, 처음 보는 수에도 같은 방법을 써 봤어.";
      scene.innerHTML='<div class="story-finish"><span aria-hidden="true">✦</span><strong>짝꿍 그네 완성!</strong><small>내일은 다른 수의 친구들이 놀러 와.</small></div>';
      actions.innerHTML=button("replay","다시 놀기","primary")+'<a class="story-button quiet" href="../">놀이터로 돌아가기</a>';
    }
  }
  $("storyActions").addEventListener("click",function(event) {
    const target=event.target.closest("[data-action]");if(!target)return;
    const action=target.dataset.action,p=E.plan(state.date);
    notice="";
    if(action==="pair") E.pair(state);
    else if(action==="teach") E.advance(state);
    else if(action==="agree" || action==="disagree") {
      if(E.judge(state,action==="agree")) notice="정확해! 이제 새로운 수에도 같은 방법을 써 보자.";
      else notice=p.count%2 ? "한 명이 남았어. 남으면 홀수야. "+name()+"에게 다시 알려 줄래?" : "모두 두 명씩 탔어. 남지 않으면 짝수야. 다시 알려 줄래?";
    } else if(action==="hint") {
      E.hint(state);showPreview=true;notice="그림에서 두 명씩 앉은 그네와 남은 친구를 살펴봐.";
    } else if(action==="even" || action==="odd") {
      if(E.transfer(state,action==="even")) notice="좋아! 어떤 모습이라서 그렇게 생각했어?";
      else { showPreview=true;notice="괜찮아. 친구를 두 명씩 짝지어 보고 다시 골라 봐."; }
    } else if(action==="none" || action==="one") {
      if(E.reason(state,action==="one")) notice="";
      else notice="그네에 모두 앉았는지, 기다리는 친구가 있는지 다시 봐 줘.";
    } else if(action==="replay") { state=E.create(S.today(),state.character);showPreview=false; }
    E.save(storage,state);render();
  });
  $("switchFriend").addEventListener("click",function() {
    state.character=state.character==="kitty"?"purin":"kitty";E.save(storage,state);render();
  });
  render();
})();
