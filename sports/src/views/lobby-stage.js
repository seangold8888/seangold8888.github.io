// 셸 뒤 경기장 장면(경기장·종목 카드·차례·결과·시상식 화면 뒤): 청군은 왼쪽, 백군은 오른쪽에 서서 응원한다.
// focus(id) = 그 아이가 앞으로 나와 크게(차례 넘기기), cheer(team) = 그 편이 폴짝(점수·우승).
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites } from "../render/sprites.js?v=1";
import { loadAtlas } from "../render/pose-card.js?v=1";
import { kidById } from "../kids.js?v=1";

const H = 250;

export function createLobby(root) {
  const st = createStage(root, { eventId: "lobby" });
  let kids = [], focusId = null, cheerTeam = null, cheerT = 0, empty = false;
  const actors = new Map();
  function actorFor(id) {
    // 체육복 그림(운동회 아틀라스): 가만히 = 응원 첫 프레임 + 숨쉬기, 응원 = 축구 응원 되풀이(공·방망이 없는 동작)
    if (!actors.has(id)) {
      actors.set(id, null);
      Promise.all([loadKidSprites(id, []), loadAtlas(id, "cheer"), loadAtlas(id, "shoot-cheer")]).then(([s, ch, sc]) => {
        if (ch) s.atlases.cheer = ch;
        if (sc) s.atlases.calm = sc; else if (ch) s.atlases.calm = ch;
        actors.set(id, createActor(s));
      });
    }
    return actors.get(id);
  }
  function flag(g, x, color, ink) {
    g.fillStyle = "#6b6f80"; g.fillRect(x - 3, -360, 6, 360);
    const w = Math.sin(st.t * 4 + x) * 10;
    g.fillStyle = color; g.strokeStyle = ink; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 3, -356); g.quadraticCurveTo(x + 60, -350 + w, x + 120, -340); g.lineTo(x + 120, -268); g.quadraticCurveTo(x + 60, -278 + w, x + 3, -284); g.closePath(); g.fill(); g.stroke();
  }
  return {
    setPlayers(players) { kids = players.map(p => ({ ...p })); kids.forEach(p => actorFor(p.id)); },
    focus(id) { focusId = id; empty = false; },
    empty() { focusId = null; empty = true; },          // 아이 없이 관중만(시상식: 아이는 시상대 위에)
    cheer(team = "all", sec = 2.5) { cheerTeam = team; cheerT = sec; st.cheerUp(1.2); },
    frame(dt) {
      cheerT = Math.max(0, cheerT - dt);
      const v = st.view();
      st.fit(1100); st.setKidHeight(H);
      st.lookAt(0, -(v.h / 2) + 70, 1);     // 땅이 화면 아래쪽에 오게
      st.begin(dt);
      const blue = kids.filter(k => k.team === "blue"), white = kids.filter(k => k.team === "white");
      const edge = Math.min(v.w / 2 - 140, 760);
      if (!empty) st.add({ z: -3, draw: g => { flag(g, -edge - 60, "#2f6bff", "#1a3fb0"); flag(g, edge + 60, "#ffffff", "#30364f"); } });
      const place = (list, side) => list.forEach((k, i) => {
        const a = actors.get(k.id); if (!a) return;
        const focused = focusId === k.id;
        const x = focused ? 0 : side * (edge - i * 150), h = (focused ? H * 1.5 : H) * ((kidById(k.id) || {}).scale || 1);
        const cheering = (cheerT > 0 && (cheerTeam === "all" || cheerTeam === k.team)) || focused;
        let sq = null;
        if (cheering && a.hasAtlas("cheer")) a.play("cheer");
        else if (a.hasAtlas("calm")) { a.scrubFrame("calm", 0); const b = Math.sin(st.t * 2.6 + side); sq = { x: 1 - b * 0.01, y: 1 + b * 0.014 }; }
        else a.play(cheering ? "cheer" : "idle");
        a.update(dt);
        st.add({ z: focused ? 5 : i, draw: g => a.draw(g, x, 0, h, { flip: side > 0, ground: 0, alpha: k.cpu ? 0.92 : 1, squash: sq }) });
      });
      if (!empty) { place(blue, -1); place(white, 1); }
      if (Math.random() < 0.02) st.cheerUp(0.4);
      st.flush(dt);
    },
    destroy() { st.destroy(); },
  };
}
