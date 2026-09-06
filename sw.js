"use strict";

// Advance this generation whenever a shared shell or optional game's immutable assets change.
const CACHE_VERSION = "v43";
const CACHE_PREFIX = "adventure-box-";
const STATIC_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-runtime`;
const AUDIO_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-audio`;

// Resolve every relative asset against this worker's directory. On GitHub Pages
// that directory is the repository subpath, not the origin root.
const workerScriptUrl = typeof self === "undefined"
  ? new URL("http://localhost/sw.js")
  : new URL(self.location.href);
const SITE_ROOT_URL = new URL("./", workerScriptUrl);

const CORE_SHELL = [
  "./",
  "./index.html",
  "./assets/study/picnic-scene.jpg",
  "./assets/study/jaei.jpg",
  "./assets/study/english-reading.js?v=6",
  "./assets/study/praise/excellent.mp3",
  "./assets/study/praise/perfect.mp3",
  "./assets/study/praise/awesome.mp3",
  "./assets/study/praise/wonderful.mp3",
  "./assets/study/praise/great.mp3",
  "./assets/study/praise/verygood.mp3",
  "./assets/study/praise/youdidit.mp3",
  "./assets/study/praise/super.mp3",
  "./assets/study/praise/threeinarow.mp3",
  "./assets/study/words/i.mp3",
  "./assets/study/words/like.mp3",
  "./assets/study/words/apples.mp3",
  "./assets/study/words/see.mp3",
  "./assets/study/words/a.mp3",
  "./assets/study/words/cat.mp3",
  "./assets/study/words/this.mp3",
  "./assets/study/words/is.mp3",
  "./assets/study/words/my.mp3",
  "./assets/study/words/book.mp3",
  "./assets/study/words/can.mp3",
  "./assets/study/words/run.mp3",
  "./assets/study/words/the.mp3",
  "./assets/study/words/sun.mp3",
  "./assets/study/words/bright.mp3",
  "./assets/study/words/milk.mp3",
  "./assets/study/words/family.mp3",
  "./assets/study/words/have.mp3",
  "./assets/study/words/dog.mp3",
  "./assets/study/words/bird.mp3",
  "./assets/study/words/fly.mp3",
  "./assets/study/words/am.mp3",
  "./assets/study/words/happy.mp3",
  "./assets/study/words/red.mp3",
  "./assets/study/words/flower.mp3",
  "./assets/study/words/we.mp3",
  "./assets/study/words/play.mp3",
  "./assets/study/words/together.mp3",
  "./assets/study/words/wash.mp3",
  "./assets/study/words/hands.mp3",
  "./assets/study/words/please.mp3",
  "./assets/study/words/open.mp3",
  "./assets/study/words/door.mp3",
  "./assets/study/words/thank.mp3",
  "./assets/study/words/you.mp3",
  "./assets/study/words/very.mp3",
  "./assets/study/words/much.mp3",
  "./assets/study/words/love.mp3",
  "./assets/study/taeo.jpg",
  "./assets/study/mom.jpg",
  "./assets/study/dad.jpg",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./og-adventure-v3.png",
  "./icon-512.png",
  "./story/",
  "./story/index.html",
  "./cards/",
  "./cards/index.html",
  "./cards/styles.css?v=26",
  "./cards/cards.json",
  "./cards/js/engine.js?v=26",
  "./cards/js/audio.js?v=26",
  "./cards/js/card-view.js?v=26",
  "./cards/js/vfx-recipes.js?v=26",
  "./cards/js/story-gates.js?v=26",
  "./cards/js/app.js?v=26",
];

// Existing games are precached as best-effort shells. A missing optional asset
// must never prevent the hub, stories, cards and 24 card images from installing.
const PRINCESS_STUDIO_ASSETS = Object.entries({
  dress: "ballgown aline party mermaidline hanbok tutu tail winter star rainbow summer rose adventure",
  hair: "bob bun braid wavy pigtails daenggi curls afro",
  shoes: "pumps glass boots sneakers sandals ballet rain slippers kkotsin",
  crown: "crown tiara flowers bow starclip pearls witch bunny catears hennin daenggi moon veil",
  neck: "pearls heart gem scarf choker star norigae flowerlei",
  hand: "wand fan bouquet umbrella bag balloon book lollipop sword mirror basket",
  back: "fairy butterfly cape angel bat backpack",
  pet: "cat dog rabbit bird frog unicorn deer butterfly dragon hamster mouse fish toad",
  bg: "plain castle forest sea night cherry ballroom snow rainbow candy tower meadow hanok rosecastle",
}).flatMap(([category, ids]) => ids.split(" ").map(id =>
  `./princess/assets/studio-v3/${category}-${id}.${category === "bg" ? "jpg" : "webp"}`
));
const OPTIONAL_SHELL = [
  "./avengers/",
  "./avengers/sw.js",
  "./avengers/manifest.webmanifest",
  "./avengers/assets/index-D_Krq1Fc.js",
  "./avengers/assets/index-uRBZKIPW.css",
  "./avengers/icons/apple-touch-icon-180.png",
  "./avengers/icons/multiverse-icon-192.png",
  "./avengers/icons/multiverse-icon-512.png",
  "./avengers/icons/multiverse-icon.svg",
  "./bori/",
  "./hogwarts/",
  "./hogwarts/icon.png",
  "./kart/",
  "./kart/src/music.js",
  "./kart/src/mode7.js",
  "./kart/src/track.js",
  "./kart/src/track-art.js",
  "./kart/src/sprites.js",
  "./kart/src/kart.js",
  "./kart/src/main.js",
  "./kart3d/",
  "./kart3d/src/game.js",
  "./kart3d/src/items.js",
  "./kart3d/src/karts.js",
  "./kart3d/src/music.js",
  "./kart3d/src/trackmesh.js",
  "./kart3d/src/tracks.js",
  "./kart3d/vendor/three.module.min.js",
  "./kedehun/",
  "./kedehun/attack-motion.js?v=1",
  "./kedehun/combat-v2.js?v=1",
  "./kedehun/combat-v2.css?v=1",
  "./kedehun/art/enemies/demon-roster-v1.png",
  "./kedehun/art/enemies/seoul-rooftop-v1.png",
  "./kedehun/art/characters/lumi-attacks-v1.png?v=1",
  "./kedehun/art/characters/mira-attacks-v1.png?v=1",
  "./kedehun/art/characters/joy-attacks-v1.png?v=1",
  "./kedehun/art/characters/lumi-v2.webp?v=28",
  "./kedehun/art/characters/mira-v2.webp?v=28",
  "./kedehun/art/characters/joy-v2.webp?v=28",
  "./odyssey/",
  "./princess/",
  "./princess/cover.svg",
  "./princess/cover.jpg?v=31",
  "./princess/studio.js?v=36",
  ..."frost sahara lotus sunny".split(" ").flatMap(id => ["body","grip"].map(part => `./princess/assets/characters-v36/${part}-${id}.webp`)),
  "./princess/assets/hair-v35/hair-bob.webp",
  ..."snow cinder rapunzel mermaid thumb kongjwi briar moon".split(" ").map(id => `./princess/assets/wear-v5/grip-${id}.webp`),
  ...PRINCESS_STUDIO_ASSETS,
  ..."snow cinder rapunzel mermaid thumb kongjwi briar moon".split(" ").map(id => `./princess/assets/bodies-v4/body-${id}.webp`),
  "./sanguo/",
  "./sanguo/index.html",
  "./sanguo/menu-v4.css",
  "./sanguo/game-controls.css",
  "./sanguo/mobile-hud.css",
  "./sanguo/src/main.js",
  "./sanguo/src/data.js",
  "./sanguo/src/data/works.js",
  "./sanguo/src/game/sideScroller.js",
  "./sanguo/src/game/hud.js",
  "./sanguo/src/game/dashSkills.js",
  "./sanguo/src/game/combatBounds.js",
  "./sanguo/src/game/scenery.js",
  "./sanguo/src/game/tint.js",
  "./sanguo/src/game/difficulty.js",
  "./sanguo/src/game/progression.js",
  "./sanguo/src/ui/result.js",
  "./sanguo/src/ui/title.js",
  "./sanguo/src/ui/storyIntro.js",
  "./sanguo/src/ui/workSelect.js",
  "./sanguo/assets/index-DnM9zJtq.js",
  "./sanguo/assets/index-BFRqmzM-.css",
  "./sanguo/mobile-hud.css",
  "./sanguo/data/gamedata.json",
  "./sanguo/fonts/pretendard/PretendardVariable.woff2",
  "./sanguo/fonts/gowun/GowunBatang-Regular.woff2",
  "./sanguo/fonts/gowun/GowunBatang-Bold.woff2",
];
const APP_SHELL = [...CORE_SHELL, ...OPTIONAL_SHELL];

// Filled from the checked-in files. These large assets never participate in
// install or activation; they warm in the background with bounded concurrency.
const SANGUO_RUNTIME_ASSETS = [
  "./sanguo/art/side-scroller/bajie-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-caimao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-caochun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-chunyuqiong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-erlangshen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-gaoqiu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-huaxiong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-luqian-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-luxun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-simayi-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-wumawang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-xiahoudun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/boss-zhangjiao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/caocao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/enemy-action-sheet-v2.png",
  "./sanguo/art/side-scroller/enemy-painted-sheet-v4.png",
  "./sanguo/art/side-scroller/enemy-pixel-sheet-v3.png",
  "./sanguo/art/side-scroller/guanyu-action-sheet-v2.png",
  "./sanguo/art/side-scroller/guanyu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/guanyu-painted-sheet-v4.png",
  "./sanguo/art/side-scroller/guanyu-pixel-sheet-v3.png",
  "./sanguo/art/side-scroller/huanggai-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/hulao-arcade-bg-v3.png",
  "./sanguo/art/side-scroller/hulao-boss-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/husanniang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/item-pickups-painted-atlas-v1.png",
  "./sanguo/art/side-scroller/jindouyun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/linchong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/liubei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/lizhishen-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-guanyu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mount-zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-bajie-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-bajie-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-guanyu-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-guanyu-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/mounted-guanyu-pixel-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-linchong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-linchong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-liubei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-liubei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-lizhishen-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-lizhishen-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wujing-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wukong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wukong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wusong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-zhangfei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/mounted-zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/red-hare-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/red-hare-painted-sheet-v3.png",
  "./sanguo/art/side-scroller/red-hare-pixel-sheet-v1.png",
  "./sanguo/art/side-scroller/reward-chest-painted-v1.png",
  "./sanguo/art/side-scroller/sunshangxiang-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/tieshangongzhu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/tieshangongzhu-painted-sheet-v2.png",
  "./sanguo/art/side-scroller/wujing-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wujing-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wukong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wukong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wusong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/wusong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangfei-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhangfei-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhaoyun-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/machao-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/huangzhong-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/huangzhong-bow-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhouyu-painted-sheet-v1.png",
  "./sanguo/art/side-scroller/zhugeliang-painted-sheet-v1.png",
  "./sanguo/audio/cinematic-breath/battle-inhale-deep-cc0-v1.ogg",
  "./sanguo/audio/cinematic-breath/battle-inhale-neutral-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-01-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-02-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-heavy-03-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-01-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-02-cc0-v1.ogg",
  "./sanguo/audio/cinematic-water/water-splash-light-03-cc0-v1.ogg",
  "./sanguo/audio/hero-callouts-ko-v6/bajie-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huangzhong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huangzhong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/machao-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/machao-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/bajie-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/caocao-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/caocao-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/guanyu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/guanyu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huanggai-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/huanggai-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/husanniang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/husanniang-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/linchong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/linchong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/liubei-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/liubei-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/lizhishen-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/lizhishen-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/sunshangxiang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/sunshangxiang-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/tieshangongzhu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/tieshangongzhu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wujing-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wujing-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wukong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wukong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wusong-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/wusong-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhangfei-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhangfei-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhaoyun-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhaoyun-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhouyu-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhouyu-special-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhugeliang-musou-v6.wav",
  "./sanguo/audio/hero-callouts-ko-v6/zhugeliang-special-v6.wav",
  "./sanguo/audio/kenney-impact/footstep_concrete_000.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_001.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_002.ogg",
  "./sanguo/audio/kenney-impact/footstep_concrete_003.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_000.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_001.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_heavy_002.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_000.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_001.ogg",
  "./sanguo/audio/kenney-impact/impactMetal_light_002.ogg",
  "./sanguo/audio/mount-sfx/boar-grunt-ccby-v1.ogg",
  "./sanguo/audio/mount-sfx/horse-neigh-pd-v1.ogg",
  "./sanguo/audio/the_final_battle.ogg",
];
const BACKGROUND_ASSETS = [...OPTIONAL_SHELL, ...SANGUO_RUNTIME_ASSETS];
const BACKGROUND_WARM_CONCURRENCY = 2;
const BACKGROUND_RETRY_MS = 5 * 60 * 1000;
const AUDIO_FETCH_TIMEOUT_MS = 45000;
const NAVIGATION_ROUTES = [
  "cards", "story", "avengers", "bori", "hogwarts", "kart", "kart3d",
  "kedehun", "odyssey", "princess", "sanguo",
];

const CARD_ART_FILES = [
  "arthur", "beanstalkgiant", "bremen", "cinderella", "fairygodmother", "genie",
  "heracles", "honggildong", "jack", "medusa", "mermaid", "midas", "odysseus",
  "perseus", "pinocchio", "polyphemus", "redhood", "snowqueen", "sunwukong",
  "threepigs", "tiger", "tortoisehare", "witch", "wolf",
].map((id) => `./cards/art/${id}.webp`);

const VFX_ART_FILES = [
  "frost-needle",
  "gold-blade",
  "monster-impact",
  "stone-arc",
].map((id) => `./cards/art/vfx/${id}.webp`);

const AUDIO_FILES = [
  ["cinderella", "신데렐라"],
  ["odyssey_cyclops", "오디세이 1화"],
  ["jack_story", "잭과 콩나무"],
  ["redhood_story", "빨간 모자"],
  ["threepigs", "아기돼지 삼형제"],
  ["tortoisehare", "토끼와 거북"],
  ["pinocchio", "피노키오"],
  ["witch", "헨젤과 그레텔"],
  ["bremen", "브레멘 음악대"],
  ["snowqueen", "눈의 여왕"],
  ["mermaid", "인어공주"],
  ["genie", "알라딘과 요술 램프"],
  ["heracles", "영웅 헤라클레스"],
  ["perseus", "페르세우스와 메두사"],
  ["midas", "미다스 왕의 황금 손"],
  ["sunwukong", "손오공"],
  ["honggildong", "홍길동전"],
  ["sunmoon", "해와 달이 된 오누이"],
  ["arthur", "아서왕과 전설의 검"],
  ["bongi", "봉이 김선달"],
].map(([id, title]) => ({ id, title, path: `./story/audio/${id}.mp3` }));

const audioWarmups = new Map();

function scopedUrl(path) {
  return new URL(path, SITE_ROOT_URL).href;
}

function navigationCacheKey(request) {
  const url = new URL(request.url);
  const rootPath = SITE_ROOT_URL.pathname.endsWith("/")
    ? SITE_ROOT_URL.pathname
    : `${SITE_ROOT_URL.pathname}/`;
  const rootIndex = `${rootPath}index.html`;
  if (url.pathname === rootIndex) {
    url.pathname = rootPath;
  } else {
    for (const route of NAVIGATION_ROUTES) {
      const routePath = `${rootPath}${route}`;
      if (
        url.pathname === routePath
        || url.pathname === `${routePath}/`
        || url.pathname === `${routePath}/index.html`
      ) {
        url.pathname = `${routePath}/`;
        break;
      }
    }
  }
  url.search = "";
  url.hash = "";
  return new Request(url.href, { method: "GET", credentials: "same-origin" });
}

function canCache(response) {
  return Boolean(response && (response.status === 200 || response.type === "opaque"));
}

async function putIfCacheable(cache, request, response) {
  if (!canCache(response)) return response;
  try {
    await cache.put(request, response.clone());
  } catch (_) {
    // Quota, private-mode and eviction failures must not replace a successful
    // network response with an application error.
  }
  return response;
}

async function openCacheSafely(cacheName) {
  try {
    return await caches.open(cacheName);
  } catch (_) {
    return null;
  }
}

async function matchCacheSafely(cacheName, request) {
  const cache = await openCacheSafely(cacheName);
  if (!cache) return null;
  try {
    return await cache.match(request, { ignoreVary: true });
  } catch (_) {
    return null;
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await openCacheSafely(STATIC_CACHE);
  const key = request.mode === "navigate" ? navigationCacheKey(request) : request;
  let cached = null;
  if (cache) {
    try {
      cached = await cache.match(key, { ignoreVary: true });
    } catch (_) {
      cached = null;
    }
  }
  const refresh = fetch(request)
    .then((response) => cache ? putIfCacheable(cache, key, response) : response)
    .catch(() => null);
  if (cached) {
    if (event && typeof event.waitUntil === "function") event.waitUntil(refresh);
    return cached;
  }
  const network = await refresh;
  if (network) return network;
  if (request.mode === "navigate") {
    const fallback = cache
      ? await cache.match(scopedUrl("./index.html"), { ignoreVary: true }).catch(() => null)
      : null;
    return fallback || Response.error();
  }
  return Response.error();
}

async function cacheFirst(request, cacheName = RUNTIME_CACHE) {
  const cache = await openCacheSafely(cacheName);
  let cached = null;
  if (cache) {
    try {
      cached = await cache.match(request, { ignoreVary: true });
    } catch (_) {
      cached = null;
    }
  }
  if (!cached && cacheName !== STATIC_CACHE) {
    cached = await matchCacheSafely(STATIC_CACHE, request);
  }
  if (cached) return cached;
  const response = await fetch(request);
  return cache ? putIfCacheable(cache, request, response) : response;
}

function parseByteRange(header, totalLength) {
  if (typeof header !== "string" || !/^bytes=/i.test(header) || header.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || totalLength <= 0) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalLength - suffixLength);
    end = totalLength - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalLength - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (start >= totalLength || end < start) return null;
    end = Math.min(end, totalLength - 1);
  }
  return { start, end };
}

async function rangeResponse(fullResponse, rangeHeader) {
  const bytes = await fullResponse.arrayBuffer();
  const range = parseByteRange(rangeHeader, bytes.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${bytes.byteLength}`, "Accept-Ranges": "bytes" },
    });
  }
  const headers = new Headers(fullResponse.headers);
  headers.delete("Content-Encoding");
  headers.delete("Content-Length");
  headers.delete("Content-Range");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(range.end - range.start + 1));
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  return new Response(bytes.slice(range.start, range.end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers,
  });
}

async function cachedAudioResponse(url) {
  const request = new Request(url, { method: "GET", credentials: "same-origin" });
  // Praise MP3s are installed in the core static cache, including Safari ranges.
  return await matchCacheSafely(AUDIO_CACHE, request)
    || await matchCacheSafely(STATIC_CACHE, request);
}

async function fetchWithTimeout(request, timeoutMs = AUDIO_FETCH_TIMEOUT_MS) {
  if (typeof AbortController === "undefined") return fetch(request);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("오디오 저장 시간이 초과됐어요");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fullAudioResponse(url) {
  const cached = await cachedAudioResponse(url);
  if (cached) return cached;
  const key = new Request(url, { method: "GET", credentials: "same-origin" });
  const response = await fetchWithTimeout(key);
  if (!response.ok || response.status !== 200) {
    throw new Error(`오디오 저장 실패 (${response.status})`);
  }
  const cache = await openCacheSafely(AUDIO_CACHE);
  if (cache) await putIfCacheable(cache, key, response);
  return response;
}

function warmFullAudio(url) {
  if (!audioWarmups.has(url)) {
    const warmup = fullAudioResponse(url).finally(() => audioWarmups.delete(url));
    audioWarmups.set(url, warmup);
  }
  return audioWarmups.get(url);
}

async function handleAudioRequest(request, event) {
  const rangeHeader = request.headers.get("Range");
  const cached = await cachedAudioResponse(request.url);
  if (cached) {
    if (rangeHeader && rangeHeader.includes(",")) return fetch(request);
    return rangeHeader ? rangeResponse(cached, rangeHeader) : cached;
  }
  if (rangeHeader) {
    // Safari gets its first network range immediately while a complete 200
    // response warms the offline cache in the background.
    event.waitUntil(warmFullAudio(request.url).catch(() => null));
    return fetch(request);
  }
  return fullAudioResponse(request.url);
}

async function handleGenericRangeRequest(request) {
  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader || rangeHeader.includes(",")) return fetch(request);
  let cached = null;
  for (const cacheName of [RUNTIME_CACHE, STATIC_CACHE, AUDIO_CACHE]) {
    cached = await matchCacheSafely(cacheName, request);
    if (cached) break;
  }
  if (cached && cached.status === 200) {
    return rangeResponse(cached, rangeHeader);
  }
  // A network 206 is deliberately passed through and never cache.put().
  return fetch(request);
}

function reply(target, payload) {
  if (target && typeof target.postMessage === "function") target.postMessage(payload);
}

function safeAudioList(items) {
  if (!Array.isArray(items) || items.length === 0) return AUDIO_FILES.map((item) => ({
    ...item,
    url: scopedUrl(item.path),
  }));
  const safe = [];
  for (const item of items) {
    if (!item || typeof item.url !== "string") continue;
    const url = new URL(item.url, SITE_ROOT_URL);
    if (url.origin !== SITE_ROOT_URL.origin || !/\/story\/audio\/[^/]+\.mp3$/i.test(url.pathname)) continue;
    safe.push({ id: String(item.id || ""), title: String(item.title || ""), url: url.href });
  }
  return safe;
}

async function audioCacheCount(items) {
  const cache = await openCacheSafely(AUDIO_CACHE);
  if (!cache) return 0;
  const found = await Promise.all(items.map((item) => (
    cache.match(item.url, { ignoreVary: true }).catch(() => null)
  )));
  return found.filter(Boolean).length;
}

async function cacheAllAudio(target, requestId, requestedItems) {
  const items = safeAudioList(requestedItems);
  const total = items.length;
  let completed = 0;
  let saved = await audioCacheCount(items);
  const failures = [];
  reply(target, { type: "AUDIO_CACHE_START", requestId, completed, saved, total });
  for (const item of items) {
    try {
      await warmFullAudio(item.url);
      if (!(await cachedAudioResponse(item.url))) {
        throw new Error("기기 저장 공간이 부족해요");
      }
      saved = await audioCacheCount(items);
    } catch (error) {
      failures.push(item.id);
      reply(target, {
        type: "AUDIO_CACHE_ERROR",
        requestId,
        completed,
        saved,
        total,
        id: item.id,
        title: item.title,
        message: error && error.message ? error.message : "저장할 수 없어요",
      });
    }
    completed += 1;
    reply(target, {
      type: "AUDIO_CACHE_PROGRESS",
      requestId,
      completed,
      saved,
      total,
      id: item.id,
      title: item.title,
    });
  }
  reply(target, {
    type: "AUDIO_CACHE_COMPLETE",
    requestId,
    completed,
    saved,
    total,
    failed: failures.length,
    failures,
  });
}

function backgroundCacheName(path) {
  const shellLike = path.endsWith("/")
    || /\.(?:html?|js|css|json)(?:[?#]|$)/i.test(path);
  return shellLike ? STATIC_CACHE : RUNTIME_CACHE;
}

async function warmBackgroundAsset(path) {
  const cache = await openCacheSafely(backgroundCacheName(path));
  if (!cache) return false;
  const url = scopedUrl(path);
  try {
    if (await cache.match(url, { ignoreVary: true })) return true;
    const response = await fetch(url);
    if (!canCache(response)) return false;
    await putIfCacheable(cache, url, response);
    return Boolean(await cache.match(url, { ignoreVary: true }));
  } catch (_) {
    return false;
  }
}

async function runBounded(items, concurrency, worker) {
  let nextIndex = 0;
  let failures = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        if (!(await worker(item))) failures += 1;
      }
    },
  );
  await Promise.all(workers);
  return failures;
}

let backgroundWarmupPromise = null;
let backgroundWarmupFinished = false;

async function readBackgroundWarmupState() {
  const cache = await openCacheSafely(RUNTIME_CACHE);
  if (!cache) return null;
  try {
    const response = await cache.match(scopedUrl(`./__pwa/${CACHE_VERSION}-warmup.json`));
    return response ? await response.json() : null;
  } catch (_) {
    return null;
  }
}

async function writeBackgroundWarmupState(state) {
  const cache = await openCacheSafely(RUNTIME_CACHE);
  if (!cache) return;
  const response = new Response(JSON.stringify(state), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  await putIfCacheable(
    cache,
    scopedUrl(`./__pwa/${CACHE_VERSION}-warmup.json`),
    response,
  );
}

async function performBackgroundWarmup() {
  const previous = await readBackgroundWarmupState();
  if (previous && previous.complete) {
    backgroundWarmupFinished = true;
    return 0;
  }
  if (previous && Number(previous.retryAt) > Date.now()) {
    return Number(previous.failures) || 1;
  }
  const failures = await runBounded(
    BACKGROUND_ASSETS,
    BACKGROUND_WARM_CONCURRENCY,
    warmBackgroundAsset,
  );
  backgroundWarmupFinished = failures === 0;
  await writeBackgroundWarmupState({
    complete: backgroundWarmupFinished,
    failures,
    retryAt: failures ? Date.now() + BACKGROUND_RETRY_MS : 0,
  });
  return failures;
}

function warmBackgroundAssets() {
  if (backgroundWarmupFinished) return Promise.resolve(0);
  if (!backgroundWarmupPromise) {
    backgroundWarmupPromise = performBackgroundWarmup().finally(() => {
      backgroundWarmupPromise = null;
    });
  }
  return backgroundWarmupPromise;
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([
        ...CORE_SHELL,
        ...CARD_ART_FILES,
        ...VFX_ART_FILES,
      ].map(scopedUrl));
      await self.skipWaiting();
    })());
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
      const current = new Set([STATIC_CACHE, RUNTIME_CACHE, AUDIO_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !current.has(key))
        .map((key) => caches.delete(key)));
      // Retire removed games only; preserve family art and downloaded stories.
      const retiredRoots = ["./starkart/", "./picnic/", "./keycap/"].map(path => new URL(path, SITE_ROOT_URL));
      for (const name of [STATIC_CACHE, RUNTIME_CACHE]) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(requests.filter((request) => {
          const url = new URL(request.url);
          return retiredRoots.some(retiredRoot => url.origin === retiredRoot.origin &&
            (url.pathname === retiredRoot.pathname.slice(0, -1) ||
             url.pathname.startsWith(retiredRoot.pathname)));
        }).map((request) => cache.delete(request)));
      }
      await self.clients.claim();
    })());
    // Do not hold activation open for the optional 100MB+ game library.
    void warmBackgroundAssets();
  });
  self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== SITE_ROOT_URL.origin) return;
    if (!backgroundWarmupFinished) {
      event.waitUntil(warmBackgroundAssets().catch(() => null));
    }
    if (/\.mp3$/i.test(url.pathname)) {
      event.respondWith(handleAudioRequest(request, event));
      return;
    }
    if (request.headers.has("Range")) {
      event.respondWith(handleGenericRangeRequest(request));
      return;
    }
    if (request.mode === "navigate" || /\.(?:html?|js|css|json)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, event));
      return;
    }
    if (/\/cards\/art\/(?:[^/]+\/)*[^/]+\.(?:webp|png)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    event.respondWith(cacheFirst(request));
  });
  self.addEventListener("message", (event) => {
    const data = event.data || {};
    const target = event.ports && event.ports[0] ? event.ports[0] : event.source;
    const items = safeAudioList(data.episodes);
    if (data.type === "CACHE_ALL_AUDIO") {
      event.waitUntil(cacheAllAudio(target, data.requestId || "", items));
    } else if (data.type === "CACHE_AUDIO") {
      event.waitUntil(Promise.allSettled(items.map((item) => warmFullAudio(item.url))));
    } else if (data.type === "GET_AUDIO_CACHE_STATUS") {
      event.waitUntil(audioCacheCount(items).then((saved) => reply(target, {
        type: "AUDIO_CACHE_STATUS",
        requestId: data.requestId || "",
        saved,
        total: items.length,
      })));
    } else if (data.type === "SKIP_WAITING") {
      event.waitUntil(self.skipWaiting());
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CACHE_VERSION,
    CACHE_PREFIX,
    STATIC_CACHE,
    RUNTIME_CACHE,
    AUDIO_CACHE,
    CORE_SHELL,
    OPTIONAL_SHELL,
    APP_SHELL,
    SANGUO_RUNTIME_ASSETS,
    BACKGROUND_ASSETS,
    BACKGROUND_WARM_CONCURRENCY,
    BACKGROUND_RETRY_MS,
    AUDIO_FETCH_TIMEOUT_MS,
    NAVIGATION_ROUTES,
    CARD_ART_FILES,
    VFX_ART_FILES,
    AUDIO_FILES,
    navigationCacheKey,
    canCache,
    putIfCacheable,
    staleWhileRevalidate,
    cacheFirst,
    parseByteRange,
    rangeResponse,
    handleGenericRangeRequest,
    handleAudioRequest,
    safeAudioList,
    runBounded,
    backgroundCacheName,
    matchCacheSafely,
    fetchWithTimeout,
  };
}
