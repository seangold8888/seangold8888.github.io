/**
 * 절차 배경 생성기.
 *
 * 스테이지마다 새 그림을 그려 넣을 수 없으므로(이미지 생성 파이프라인이
 * 프로젝트 밖에 있다) 배경을 코드로 만든다. 층마다 다른 속도로 흐르는
 * 시차(parallax) 실루엣 + 하늘 그라디언트 조합이라, 테마 하나만 바꾸면
 * 전혀 다른 장소가 된다.
 *
 * 각 층은 오프스크린 캔버스에 한 번만 그려두고 매 프레임 타일링만 한다 —
 * 매 프레임 수백 개 도형을 다시 그리면 배경 하나에 프레임을 다 쓴다.
 */

/** 결정적 난수. 같은 스테이지는 매번 같은 지형이어야 한다. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const SCENES = {
  // 삼국지 — 호로관: 마른 관문, 흙먼지, 봉화
  hulao: {
    sky: ['#2a1c14', '#6d3a1c', '#c9762f'],
    haze: 'rgba(201,118,47,.20)',
    layers: [
      { kind: 'ridge', depth: .06, color: '#1b1512', height: .40, rough: .55 },
      { kind: 'ridge', depth: .14, color: '#251a13', height: .32, rough: .75 },
      { kind: 'wall', depth: .30, color: '#2f2119', accent: '#4a3222' },
      { kind: 'banners', depth: .52, color: '#6d2018' },
    ],
    ground: ['#4b3421', '#2a1c12'],
  },
  // 서유기 — 화염산: 붉은 바위, 열기, 불티
  flamemountain: {
    sky: ['#2b0d08', '#8c2410', '#f0793a'],
    haze: 'rgba(255,110,40,.26)',
    ember: '#ff8b3a',
    layers: [
      { kind: 'ridge', depth: .05, color: '#2a0e08', height: .52, rough: .9 },
      { kind: 'ridge', depth: .13, color: '#3d150b', height: .40, rough: 1.1 },
      { kind: 'ridge', depth: .26, color: '#571c0d', height: .28, rough: 1.3 },
      { kind: 'crags', depth: .46, color: '#33110a' },
    ],
    ground: ['#6b2a13', '#33130a'],
  },
  // 서유기 — 천궁(하늘 궁전): 구름바다, 옥탑, 푸른 새벽
  heavenpalace: {
    sky: ['#101a3a', '#2f4d86', '#8fc0e8'],
    haze: 'rgba(150,200,240,.20)',
    layers: [
      { kind: 'clouds', depth: .05, color: 'rgba(214,232,248,.30)' },
      { kind: 'pagoda', depth: .18, color: '#1d2b4c', accent: '#d8b45a' },
      { kind: 'clouds', depth: .34, color: 'rgba(196,220,245,.42)' },
      { kind: 'pagoda', depth: .55, color: '#141d33', accent: '#b89440' },
    ],
    ground: ['#3d5686', '#1a2340'],
  },
  // 수호지 — 양산박 습지: 갈대, 안개, 물그림자
  liangshan: {
    sky: ['#16211d', '#33513f', '#8fae74'],
    haze: 'rgba(150,180,140,.22)',
    layers: [
      { kind: 'ridge', depth: .05, color: '#141c18', height: .30, rough: .4 },
      { kind: 'water', depth: .16, color: '#22362c' },
      { kind: 'reeds', depth: .40, color: '#1a2620' },
      { kind: 'reeds', depth: .62, color: '#111a15' },
    ],
    ground: ['#2f4133', '#16201a'],
  },
  // ── 삼국지 나머지 전장 ────────────────────────────────────
  // 황건적의 난 — 누런 들녘, 불타는 마을
  yellow: {
    sky: ['#3a2c10', '#8a6a1e', '#e6cb72'],
    haze: 'rgba(230,203,114,.20)',
    ember: '#ffc44a',
    layers: [
      { kind: 'ridge', depth: .05, color: '#2a2110', height: .30, rough: .45 },
      { kind: 'reeds', depth: .30, color: '#4a3a16' },
      { kind: 'banners', depth: .50, color: '#b8952a' },
      { kind: 'reeds', depth: .66, color: '#2e2410' },
    ],
    ground: ['#8a6545', '#4a3524'],
  },
  // 관도 — 군량 창고, 마른 벌판
  guandu: {
    sky: ['#1d2a1e', '#4c6340', '#d9bd83'],
    haze: 'rgba(176,199,180,.18)',
    layers: [
      { kind: 'ridge', depth: .06, color: '#1a2318', height: .34, rough: .5 },
      { kind: 'wall', depth: .26, color: '#2b3324', accent: '#5c6b45' },
      { kind: 'banners', depth: .52, color: '#6d7a3a' },
    ],
    ground: ['#806546', '#463726'],
  },
  // 장판 — 흙먼지 자욱한 추격로
  changban: {
    sky: ['#1a212b', '#4a5a6c', '#d4b995'],
    haze: 'rgba(142,166,183,.22)',
    layers: [
      { kind: 'ridge', depth: .05, color: '#161c24', height: .38, rough: .6 },
      { kind: 'ridge', depth: .14, color: '#222b36', height: .26, rough: .8 },
      { kind: 'deadtrees', depth: .42, color: '#141a21' },
      { kind: 'crags', depth: .60, color: '#1b232c' },
    ],
    ground: ['#6c5d52', '#3a3029'],
  },
  // 적벽 — 불타는 강, 붉은 절벽
  redcliff: {
    sky: ['#2a0f0c', '#8a3218', '#df815f'],
    haze: 'rgba(223,129,95,.26)',
    ember: '#ff9a3c',
    layers: [
      { kind: 'ridge', depth: .05, color: '#231010', height: .46, rough: .8 },
      { kind: 'water', depth: .18, color: '#4a2018' },
      { kind: 'crags', depth: .40, color: '#331410' },
      { kind: 'banners', depth: .62, color: '#c2451f' },
    ],
    ground: ['#9d6335', '#4e2f18'],
  },
  // 천리행 — 관문이 이어진 긴 길
  qianli: {
    sky: ['#1f272c', '#5a6a72', '#e3c894'],
    haze: 'rgba(168,188,198,.20)',
    layers: [
      { kind: 'ridge', depth: .05, color: '#1a2126', height: .36, rough: .55 },
      { kind: 'wall', depth: .22, color: '#2a3238', accent: '#5d6a5a' },
      { kind: 'wall', depth: .44, color: '#20272c', accent: '#4a5648' },
      { kind: 'banners', depth: .64, color: '#7a5a2a' },
    ],
    ground: ['#7b6248', '#423526'],
  },
  // 이릉 — 산을 태우는 불길
  yiling: {
    sky: ['#2e1109', '#8f3a1a', '#e9a06a'],
    haze: 'rgba(233,160,106,.24)',
    ember: '#ff7a2a',
    layers: [
      { kind: 'ridge', depth: .05, color: '#2a1410', height: .48, rough: .85 },
      { kind: 'ridge', depth: .15, color: '#3d1c12', height: .34, rough: 1.0 },
      { kind: 'deadtrees', depth: .44, color: '#2a1410' },
      { kind: 'crags', depth: .62, color: '#33170e' },
    ],
    ground: ['#7a4a33', '#3e251a'],
  },
  // 출사표 — 새벽 산길, 오장원
  chushi: {
    sky: ['#191f2b', '#4a5568', '#dcc79a'],
    haze: 'rgba(159,176,200,.20)',
    layers: [
      { kind: 'ridge', depth: .05, color: '#151a24', height: .42, rough: .65 },
      { kind: 'ridge', depth: .14, color: '#222836', height: .28, rough: .5 },
      { kind: 'pagoda', depth: .32, color: '#1b2130', accent: '#9a8450' },
      { kind: 'banners', depth: .58, color: '#5a6a8a' },
    ],
    ground: ['#6f6350', '#3a3328'],
  },
  // 동관 — 위수의 나루: 누런 흙먼지, 강물, 갈대, 관문 성벽
  dongguan: {
    sky: ['#241d18', '#6b563c', '#e2c58f'],
    haze: 'rgba(214,186,136,.26)',
    layers: [
      // 갈대를 전경에 두면 150줄기가 화면을 덮어 전투가 안 보인다.
      // 적벽과 같은 뼈대(능선 → 물 → 구조물 → 깃발)로 간다.
      { kind: 'ridge', depth: .05, color: '#1c1712', height: .40, rough: .55 },
      { kind: 'water', depth: .18, color: '#3f4c55' },
      { kind: 'wall', depth: .40, color: '#2b2318', accent: '#8a6c3e' },
      { kind: 'banners', depth: .62, color: '#7d6a44' },
    ],
    ground: ['#8a7250', '#4b3d2a'],
  },
  // 정군산 — 한중의 험한 산: 겹겹 능선, 소나무, 고지의 깃발
  dingjunshan: {
    sky: ['#151c26', '#41546b', '#c9b489'],
    haze: 'rgba(168,190,214,.22)',
    layers: [
      { kind: 'ridge', depth: .04, color: '#131922', height: .52, rough: .75 },
      { kind: 'ridge', depth: .13, color: '#1e2733', height: .38, rough: .9 },
      { kind: 'crags', depth: .34, color: '#232c38' },
      { kind: 'banners', depth: .60, color: '#7a6a52' },
    ],
    ground: ['#6a6353', '#3b352b'],
  },
  // 수호지 — 눈 덮인 산신묘: 설야, 마른 나무, 사당
  snowshrine: {
    sky: ['#161d2c', '#3b4a63', '#9fb3c9'],
    haze: 'rgba(200,215,235,.24)',
    snow: true,
    layers: [
      { kind: 'ridge', depth: .05, color: '#1b2331', height: .44, rough: .7 },
      { kind: 'ridge', depth: .14, color: '#26303f', height: .30, rough: .5 },
      { kind: 'shrine', depth: .34, color: '#1a212c', accent: '#7d4a3a' },
      { kind: 'deadtrees', depth: .58, color: '#131820' },
    ],
    ground: ['#c8d3e0', '#8592a5'],
  },
};

/** 층 하나를 오프스크린 타일로 굽는다. */
function bakeLayer(layer, w, h, seed) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const rand = rng(seed);
  g.fillStyle = layer.color;

  if (layer.kind === 'ridge') {
    // 능선 — 프랙탈 노이즈로 만든 산맥 실루엣.
    const base = h * (1 - layer.height);
    g.beginPath(); g.moveTo(0, h);
    const pts = 90;
    const o1 = rand() * 100, o2 = rand() * 100;
    for (let i = 0; i <= pts; i++) {
      const t = i / pts, x = t * w;
      const n = Math.sin(t * 7.1 + o1) * .55 + Math.sin(t * 17.3 + o2) * .28 + Math.sin(t * 39.7 + o1 * 2) * .13;
      g.lineTo(x, base + n * h * layer.height * .78 * layer.rough);
    }
    g.lineTo(w, h); g.closePath(); g.fill();
  } else if (layer.kind === 'crags') {
    // 뾰족한 바위 기둥들
    for (let i = 0; i < 26; i++) {
      const x = rand() * w, bw = 22 + rand() * 70, bh = h * (.18 + rand() * .42);
      g.beginPath(); g.moveTo(x - bw / 2, h);
      g.lineTo(x - bw * .3, h - bh * .75);
      g.lineTo(x + rand() * 10 - 5, h - bh);
      g.lineTo(x + bw * .32, h - bh * .68);
      g.lineTo(x + bw / 2, h); g.closePath(); g.fill();
    }
  } else if (layer.kind === 'wall') {
    // 성벽 + 총안
    const top = h * .42;
    g.fillRect(0, top, w, h - top);
    g.fillStyle = layer.accent;
    for (let x = 0; x < w; x += 46) g.fillRect(x, top - 20, 28, 22);
    g.globalAlpha = .35;
    for (let y = top + 26; y < h; y += 34) g.fillRect(0, y, w, 2);
    g.globalAlpha = 1;
    // 망루
    for (let i = 0; i < 3; i++) {
      const x = (i + .5) * (w / 3) + (rand() - .5) * 60;
      g.fillStyle = layer.color;
      g.fillRect(x - 34, top - 96, 68, 100);
      g.fillStyle = layer.accent;
      g.beginPath(); g.moveTo(x - 52, top - 96); g.lineTo(x + 52, top - 96); g.lineTo(x + 30, top - 124); g.lineTo(x - 30, top - 124); g.closePath(); g.fill();
    }
  } else if (layer.kind === 'banners') {
    // 늘어선 군기
    for (let i = 0; i < 14; i++) {
      const x = rand() * w, ph = h * (.30 + rand() * .22);
      g.fillStyle = 'rgba(20,14,11,.9)'; g.fillRect(x - 2, h - ph, 4, ph);
      g.fillStyle = layer.color;
      g.beginPath(); g.moveTo(x + 2, h - ph); g.lineTo(x + 40, h - ph + 8); g.lineTo(x + 34, h - ph + 46); g.lineTo(x + 2, h - ph + 40); g.closePath(); g.fill();
    }
  } else if (layer.kind === 'clouds') {
    // 층운 — 겹친 타원으로 만든 구름바다
    for (let i = 0; i < 22; i++) {
      const x = rand() * w, y = h * (.35 + rand() * .55), rx = 60 + rand() * 190, ry = 14 + rand() * 30;
      g.fillStyle = layer.color;
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + rx * .4, y - ry * .5, rx * .55, ry * .8, 0, 0, Math.PI * 2); g.fill();
    }
  } else if (layer.kind === 'pagoda') {
    // 다층 누각
    for (let i = 0; i < 5; i++) {
      const x = (i + .5) * (w / 5) + (rand() - .5) * 120;
      const tiers = 3 + Math.floor(rand() * 3), baseY = h * (.62 + rand() * .2), tierH = 34 + rand() * 12;
      for (let t = 0; t < tiers; t++) {
        const tw = 96 - t * 15, y = baseY - t * tierH;
        g.fillStyle = layer.color; g.fillRect(x - tw / 2, y - tierH, tw, tierH);
        g.fillStyle = layer.accent;
        g.beginPath(); g.moveTo(x - tw * .78, y - tierH); g.quadraticCurveTo(x, y - tierH - 20, x + tw * .78, y - tierH);
        g.lineTo(x + tw * .5, y - tierH - 3); g.lineTo(x - tw * .5, y - tierH - 3); g.closePath(); g.fill();
      }
      g.fillStyle = layer.accent; g.fillRect(x - 2, baseY - tiers * tierH - 26, 4, 26);
    }
  } else if (layer.kind === 'water') {
    // 잔잔한 물 + 수면 반짝임
    g.fillStyle = layer.color; g.fillRect(0, h * .55, w, h * .45);
    g.globalAlpha = .22; g.fillStyle = '#cfe4c8';
    for (let i = 0; i < 90; i++) {
      const y = h * (.58 + rand() * .40);
      g.fillRect(rand() * w, y, 12 + rand() * 40, 1.5);
    }
    g.globalAlpha = 1;
  } else if (layer.kind === 'reeds') {
    // 갈대밭
    for (let i = 0; i < 150; i++) {
      const x = rand() * w, rh = h * (.22 + rand() * .5), lean = (rand() - .5) * 26;
      g.strokeStyle = layer.color; g.lineWidth = 1.6 + rand() * 2;
      g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * .4, h - rh * .6, x + lean, h - rh); g.stroke();
      g.fillStyle = layer.color;
      g.beginPath(); g.ellipse(x + lean, h - rh - 4, 2.6, 9, lean * .02, 0, Math.PI * 2); g.fill();
    }
  } else if (layer.kind === 'shrine') {
    // 눈 덮인 사당
    for (let i = 0; i < 3; i++) {
      const x = (i + .5) * (w / 3) + (rand() - .5) * 140, baseY = h * .78, bw = 120 + rand() * 50;
      g.fillStyle = layer.color; g.fillRect(x - bw / 2, baseY - 76, bw, 80);
      g.fillStyle = layer.accent;
      g.beginPath(); g.moveTo(x - bw * .72, baseY - 76); g.lineTo(x, baseY - 122); g.lineTo(x + bw * .72, baseY - 76); g.closePath(); g.fill();
      // 지붕에 쌓인 눈
      g.fillStyle = 'rgba(226,236,248,.85)';
      g.beginPath(); g.moveTo(x - bw * .72, baseY - 76); g.lineTo(x, baseY - 122); g.lineTo(x + bw * .72, baseY - 76);
      g.lineTo(x + bw * .6, baseY - 80); g.lineTo(x, baseY - 114); g.lineTo(x - bw * .6, baseY - 80); g.closePath(); g.fill();
      // 문
      g.fillStyle = 'rgba(10,12,16,.7)'; g.fillRect(x - 18, baseY - 44, 36, 48);
    }
  } else if (layer.kind === 'deadtrees') {
    // 마른 나무
    for (let i = 0; i < 18; i++) {
      const x = rand() * w, th = h * (.3 + rand() * .38);
      g.strokeStyle = layer.color; g.lineCap = 'round';
      g.lineWidth = 5; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (rand() - .5) * 18, h - th); g.stroke();
      g.lineWidth = 2.4;
      for (let b = 0; b < 5; b++) {
        const by = h - th * (.45 + b * .12), dir = b % 2 ? 1 : -1;
        g.beginPath(); g.moveTo(x + (rand() - .5) * 8, by); g.lineTo(x + dir * (18 + rand() * 26), by - 16 - rand() * 20); g.stroke();
      }
    }
  }
  return c;
}

/**
 * 스테이지 배경 한 벌을 만든다. 반환된 draw(ctx, cameraX, w, h) 를 매 프레임
 * 호출하면 된다 — 내부는 구운 타일을 붙이기만 하므로 값이 싸다.
 */
export function createScenery(sceneKey, width, height) {
  const scene = SCENES[sceneKey] || SCENES.hulao;
  const tileW = Math.max(1024, Math.round(width * 1.35));
  const seedBase = [...sceneKey].reduce((a, c) => a + c.charCodeAt(0), 0);
  const baked = scene.layers.map((layer, i) => ({
    layer,
    canvas: bakeLayer(layer, tileW, Math.round(height * .92), seedBase * 31 + i * 977),
  }));

  return {
    scene,
    draw(ctx, cameraX, w, h, now = 0, quality = 1) {
      // 하늘
      const sky = ctx.createLinearGradient(0, 0, 0, h * .9);
      sky.addColorStop(0, scene.sky[0]); sky.addColorStop(.55, scene.sky[1]); sky.addColorStop(1, scene.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      // 시차 층 — 뒤에서 앞으로
      const layerH = Math.round(h * .92);
      for (const { layer, canvas } of baked) {
        const shift = (cameraX * layer.depth) % tileW;
        const y = h - layerH;
        for (let k = -1; k <= Math.ceil(w / tileW); k++) {
          const x = k * tileW - shift;
          if (x > w || x + tileW < 0) continue;
          ctx.drawImage(canvas, x, y);
        }
      }

      // 대기 착색
      ctx.fillStyle = scene.haze;
      ctx.fillRect(0, h * .2, w, h * .7);

      // 테마 고유 입자 — 화염산 불티, 설야 눈발
      if (quality > .6 && (scene.ember || scene.snow)) {
        const count = scene.snow ? 46 : 30;
        ctx.save(); ctx.globalCompositeOperation = scene.snow ? 'source-over' : 'lighter';
        for (let i = 0; i < count; i++) {
          const sp = scene.snow ? .05 : -.09;
          const px = ((i * 137.5 + now * (scene.snow ? .03 : .05) - cameraX * .2) % (w + 80)) - 40;
          const py = ((i * 211.3 + now * sp * (scene.snow ? -1 : 1)) % (h * .9));
          const yy = scene.snow ? (now * .04 + i * 97) % (h * .95) : h * .9 - ((now * .06 + i * 83) % (h * .85));
          ctx.globalAlpha = scene.snow ? .5 : .42;
          ctx.fillStyle = scene.snow ? '#e8f0fb' : scene.ember;
          const size = scene.snow ? 1.6 + (i % 3) : 1.4 + (i % 3) * .8;
          ctx.beginPath(); ctx.arc(px, yy, size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    },
  };
}
