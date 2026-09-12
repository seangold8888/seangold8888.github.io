(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CardCampaign = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STORAGE_KEY = "card_campaign";
  const STARTERS = ["jaei", "taeo"];
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  // Simulation fallback; S3 tests keep it aligned with the published card.
  const FINAL_BOSS = freeze({
    id: "sseugumi", name: "쓰구미 대마왕", type: "monster", element: null,
    rarity: 3, hp: 100,
    passive: {name: "쿠션 엉덩이", fx: "reduce_dmg_10", desc: "엉덩이에 방귀 쿠션이 있어 받는 피해가 10 줄어요"},
    attacks: [
      {name: "방귀 쿠션", cost: 1, dmg: 20, fx: null},
      {name: "사탕 훔치기", cost: 2, dmg: 10, fx: "steal_star_1"},
      {name: "간지럼 깃털", cost: 3, dmg: 30, fx: "skip_next_enemy"},
      {name: "대왕 장난", cost: 4, dmg: 60, fx: null}
    ]
  });

  // §4 chapter identities. Bonuses apply to copies, never cards.json.
  const CHAPTERS = freeze([
    {id: 0, name: "우리 집", enemies: ["jack"], boss: null, recruit: "redhood", hpBonuses: [0]},
    {id: 1, name: "동화 나라", enemies: ["wolf", "witch", "beanstalkgiant"], boss: "snowqueen", recruit: "cinderella", hpBonuses: [0, 0, 0, 30]},
    {id: 2, name: "옛이야기 나라", enemies: ["euljimundeok", "ganggamchan", "kwonyul"], boss: "tiger", recruit: "honggildong", hpBonuses: [0, 0, 0, 20]},
    {id: 3, name: "신들의 산", enemies: ["medusa", "hydra", "minotaur"], boss: "cerberus", recruit: "heracles", hpBonuses: [0, 0, 0, 40]},
    {id: 4, name: "오디세우스의 바다", enemies: ["circe", "siren", "scylla"], boss: "polyphemus", recruit: "odysseus", hpBonuses: [0, 0, 0, 20]},
    {id: 5, name: "세 나라 전장", enemies: ["zhangfei", "caocao", "simayi"], boss: "guanyu", recruit: "zhaoyun", hpBonuses: [0, 0, 0, 20]},
    {id: 6, name: "서쪽으로 가는 길", enemies: ["honghaier", "baigujing", "erlangshen"], boss: "wumawang", recruit: "sunwukong", hpBonuses: [0, 0, 0, 20]},
    {id: 7, name: "쓰구미 왕궁", enemies: ["hydra", "scylla", "wumawang"], boss: "sseugumi", recruit: "sseugumi", hpBonuses: [0, 0, 0, 40]}
  ]);

  // S3 uses the supplied appendix verbatim, including its ending.
  const SCENES = freeze({
    0: {
      intro: ["밤이에요. 책이 혼자 펄럭거려요.", "펼쳐 보니 글자가 하나도 없어요.", "어디선가 \"쓰구미~\" 소리가 났어요.", "책이 두 아이를 쏙 빨아들였어요."],
      beforeBattle: ["콩나무 잭이 콩나무를 거꾸로 오르고 있어요.", "\"누가 위아래를 바꿔 놨어!\"", "장난에 걸렸어요. 이기면 풀려요.", "재이가 먼저 나섰어요."],
      restore: ["잭이 제대로 섰어요. \"휴, 고마워!\"", "저쪽에서 빨간 모자가 달려왔어요.", "\"쓰구미 대마왕 짓이야. 나도 갈래.\"", "원정대가 셋이 됐어요."]
    },
    1: {
      intro: ["동화 나라가 뒤죽박죽이에요.", "늑대는 딸꾹질, 마녀는 재채기, 거인은 킥킥.", "\"다 장난에 걸렸어.\" 재이가 말했어요.", "태오는 방귀를 준비했어요."],
      beforeBoss: ["눈의 여왕이 성문을 막고 있어요.", "\"누가 내 얼음성에 낙서를 했지?\"", "성벽에 삐뚤어진 왕관이 그려져 있어요.", "\"얼음은 불로 녹여요.\" 빨간 모자가 속삭였어요."],
      restore: ["낙서가 지워지고 색이 돌아왔어요.", "신데렐라가 절뚝이며 왔어요.", "\"구두에 방귀 쿠션이 들어 있었어요!\"", "지도의 스티커가 하나 떨어졌어요."]
    }
  });

  const LATER_SCENES = freeze({
    2: {"intro":["산 너머 옛이야기 나라예요.","장군들이 투구를 거꾸로 쓰고 있어요.","\"앞이 안 보여!\" \"누구야!\"","재이는 조심스럽게 다가갔어요."],"beforeBoss":["호랑이가 어흥 하고 나타났어요.","\"떡 하나 주면… 에취! 겨자 떡이잖아!\"","태오가 말했어요. \"방귀 하나 줄게!\""],"restore":["호랑이가 물을 벌컥벌컥 마시고 물러났어요.","홍길동이 바람처럼 나타났어요.","\"동에 번쩍, 서에 번쩍. 그 왕, 내가 잡을게.\""]},
    3: {"intro":["구름 위로 올라왔어요. 신들의 산이에요.","괴물들이 서로 \"네가 웃었지?\" 하며 싸워요.","\"헤라클레스가 여기 어딘가에 있을 거야.\""],"beforeBoss":["머리가 셋인 개가 문을 지켜요.","머리마다 분홍 리본이 묶여 있어요.","\"쓰구미 대마왕이 묶었대.\" 재이가 웃음을 참았어요.","\"물은 불을 이겨요. 잘 골라.\""],"restore":["케르베로스가 리본을 떼고 꼬리를 흔들었어요.","헤라클레스가 사자 가죽을 털며 웃었어요.","\"그 꼬마 왕, 힘으로는 안 되겠지. 같이 가자.\""]},
    4: {"intro":["배를 타고 바다로 나왔어요.","세이렌이 노래 대신 딸꾹질을 해요.","\"노래를 못 하게 장난쳤나 봐.\""],"beforeBoss":["동굴에 깃털이 가득해요.","폴리페모스가 간지러워서 데굴데굴 굴러요.","\"저번에 아빠랑 게임에서 봤어!\" 태오가 말했어요."],"restore":["거인이 깃털을 털고 양을 세기 시작했어요.","오디세우스가 배에서 손을 흔들었어요.","\"장난꾸러기는 꾀로 잡는 거야. 내가 있어.\""]},
    5: {"intro":["깃발이 펄럭이는 전장이에요.","장군들 깃발이 전부 뒤집혀 있어요.","\"누가 우리 편인지 모르겠어!\""],"beforeBoss":["붉은 얼굴의 장군이 청룡언월도를 들었어요.","관우예요. 수염이 삼각형으로 묶여 있어요.","\"웃으면 안 돼.\" 재이가 말했어요. 태오가 웃었어요."],"restore":["관우가 수염을 풀고 고개를 끄덕였어요.","조운이 하얀 말을 타고 달려왔어요.","\"일곱 번 들어갔다 일곱 번 나온 나야. 같이 가자.\""]},
    6: {"intro":["화염산이 보여요. 뜨거워요.","요괴들이 서로 발을 걸고 넘어져요.","\"손오공은 어디 있을까?\""],"beforeBoss":["우마왕이 쇠몽둥이를 들고 서 있어요.","코에 방울이 달려 딸랑딸랑 울려요.","\"화가 많이 났나 봐. 불은 물로.\""],"restore":["우마왕이 방울을 떼고 킁 하며 물러났어요.","근두운을 타고 손오공이 내려왔어요.","\"다 모였네. 이제 그 꼬마 왕 잡으러 가자!\""]},
    7: {"intro":["쓰구미 왕궁이에요. 장난감이 굴러다녀요.","히드라, 스킬라, 우마왕이 또 장난에 걸렸어요.","\"우리가 풀어 줬던 애들이야. 다시 풀자.\""],"beforeBoss":["삐뚤어진 왕관을 쓴 꼬마가 사탕을 먹고 있어요.","\"드디어 왔네, 쓰구미~. 심심했단 말이야, 쓰구미~.\"","\"책 돌려줘.\" 재이가 말했어요.","태오가 앞으로 나섰어요. \"나랑 방귀 대결 해.\""]}
  });
  const ALL_SCENES = freeze({...SCENES, ...LATER_SCENES});
  const ENDING = freeze([["쓰구미 대마왕이 엉덩방아를 찧었어요.","왕관이 데굴데굴 굴렀어요.","대마왕이 훌쩍였어요.","\"아무도 나랑 안 놀아 줬어.\""],["태오가 손을 내밀었어요.","\"우리랑 놀자. 방귀 대결 매일 하자.\"","대마왕이 눈을 크게 떴어요. \"…쓰구미?\"","책이 펄럭이며 글자가 채워졌어요."],["창문이 열리고 아침이에요.","아빠와 엄마가 방문을 열었어요.","\"둘 다 여기 있었네. 밥 먹자.\"","책 사이에서 작은 \"쓰구미~\" 소리가 났어요."],["\"이야기는 우리가 지켰어. 쓰구미 대마왕도 같이.\""]]);

  function chapterAt(index) {
    if (!Number.isInteger(index) || !CHAPTERS[index]) throw new RangeError("없는 원정 장입니다.");
    return CHAPTERS[index];
  }
  function encounterIds(chapter) {
    const row = chapterAt(chapter);
    return row.enemies.concat(row.boss ? [row.boss] : []);
  }
  function candidatesForChapter(chapter) {
    chapterAt(chapter);
    return STARTERS.concat(CHAPTERS.slice(0, chapter).map(row => row.recruit));
  }
  function createProgress() {
    return {version: 1, chapter: 0, stage: 0, party: STARTERS.slice(), resting: [],
      recruited: [], cleared: [], ending: 0, endingScene: 0, phase: "intro", activeCard: null, battleSerial: 0};
  }
  function uniqueStrings(value) {
    return Array.isArray(value) && value.every(item => typeof item === "string") && new Set(value).size === value.length;
  }
  function normaliseProgress(raw, resume) {
    const fresh = createProgress();
    if (!raw || typeof raw !== "object" || (raw.version !== undefined && raw.version !== 1)) return fresh;
    if (!Number.isInteger(raw.chapter) || raw.chapter < 0 || raw.chapter > 7 ||
        !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > 4 ||
        !Number.isSafeInteger(raw.ending) || raw.ending < 0 ||
        !uniqueStrings(raw.party) || !uniqueStrings(raw.resting) || !uniqueStrings(raw.recruited) ||
        !Array.isArray(raw.cleared)) return fresh;
    // S4 will define repeat runs. In S1 an ending belongs to a finished run.
    if (raw.ending > 0 && raw.chapter !== 7) return fresh;
    const last = raw.chapter === 7 && raw.ending >= 1;
    const cleared = Array.from({length: raw.chapter + (last ? 1 : 0)}, (_, i) => i);
    const recruited = cleared.map(i => CHAPTERS[i].recruit);
    if (JSON.stringify(raw.cleared) !== JSON.stringify(cleared) ||
        JSON.stringify(raw.recruited) !== JSON.stringify(recruited)) return fresh;
    const available = STARTERS.concat(recruited);
    const size = raw.chapter === 0 ? 2 : 3;
    const phase = raw.phase || (last ? "complete" : raw.stage === 4 ? "restore" : "encounter");
    if (!["intro", "party", "encounter", "battle", "restore", "complete"].includes(phase) ||
        raw.party.length < 2 || raw.party.length > size ||
        raw.party.some(id => !available.includes(id)) ||
        raw.resting.some(id => !raw.party.includes(id)) || raw.resting.length === raw.party.length ||
        (raw.party.length !== size && !["intro", "party"].includes(phase)) ||
        (phase === "complete") !== last ||
        (phase === "restore" || last ? raw.stage !== 4 : raw.stage >= encounterIds(raw.chapter).length) ||
        (["intro", "party"].includes(phase) && (raw.stage !== 0 || raw.resting.length > 0))) return fresh;
    const serial = raw.battleSerial === undefined ? 0 : raw.battleSerial;
    const endingScene = raw.endingScene === undefined ? (last ? 3 : 0) : raw.endingScene;
    if (!Number.isInteger(endingScene) || endingScene < 0 || endingScene > 3 ||
        (endingScene !== 0 && !(raw.chapter === 7 && (phase === "restore" || last))) ||
        (last && endingScene !== 3)) return fresh;
    if (!Number.isSafeInteger(serial) || serial < 0 ||
        (phase === "battle" && (!raw.party.includes(raw.activeCard) || raw.resting.includes(raw.activeCard) || serial === 0))) return fresh;
    return {version: 1, chapter: raw.chapter, stage: raw.stage, party: raw.party.slice(),
      resting: raw.resting.slice(), recruited, cleared, ending: raw.ending, endingScene,
      phase: resume && phase === "battle" ? "encounter" : phase,
      activeCard: !resume && phase === "battle" ? raw.activeCard : null, battleSerial: serial};
  }
  function storageOrDefault(storage) {
    return storage === undefined ? globalThis.localStorage : storage;
  }
  function load(storage) {
    try { return normaliseProgress(JSON.parse(storageOrDefault(storage).getItem(STORAGE_KEY)), true); }
    catch (error) { return createProgress(); }
  }
  function save(progress, storage) {
    try {
      storageOrDefault(storage).setItem(STORAGE_KEY, JSON.stringify(normaliseProgress(progress, false)));
      return true;
    } catch (error) { return false; }
  }
  function finishIntro(progress) {
    const next = normaliseProgress(progress, false);
    if (next.phase === "intro") next.phase = next.chapter === 0 ? "encounter" : "party";
    return next;
  }
  function selectParty(progress, ids) {
    const next = normaliseProgress(progress, false);
    if (next.phase !== "party" || !uniqueStrings(ids) || ids.length !== 3 ||
        ids.some(id => !STARTERS.concat(next.recruited).includes(id))) return next;
    next.party = ids.slice();
    next.phase = "encounter";
    return next;
  }
  function availableParty(progress) {
    return progress.party.filter(id => !progress.resting.includes(id));
  }
  function beginBattle(progress, cardId) {
    const next = normaliseProgress(progress, false);
    if (next.phase !== "encounter" || !availableParty(next).includes(cardId)) return next;
    next.activeCard = cardId;
    next.battleSerial += 1;
    next.phase = "battle";
    return next;
  }
  // Results carry beginBattle's serial: repeat/stale callbacks do not advance.
  function finishBattle(progress, serial, winner) {
    const next = normaliseProgress(progress, false);
    if (next.phase !== "battle" || next.battleSerial !== serial || !["player", "enemy"].includes(winner)) return next;
    if (winner === "player") {
      next.stage += 1;
      if (next.stage === encounterIds(next.chapter).length) {
        next.stage = 4;
        next.phase = "restore";
      } else next.phase = "encounter";
    } else {
      next.resting.push(next.activeCard);
      next.phase = "encounter";
      if (availableParty(next).length === 0) {
        next.resting = [];
        next.stage = 0;
        next.phase = "intro";
      }
    }
    next.activeCard = null;
    return next;
  }
  // Recruitment occurs after the restoration/ending scene finishes.
  function advanceEnding(progress) {
    const next = normaliseProgress(progress, false);
    if (next.chapter === 7 && next.phase === "restore" && next.endingScene < 3) next.endingScene++;
    return next;
  }
  function finishChapter(progress) {
    const next = normaliseProgress(progress, false);
    if (next.phase !== "restore") return next;
    if (next.chapter === 7 && next.endingScene !== 3) return next;
    next.cleared.push(next.chapter);
    next.recruited.push(CHAPTERS[next.chapter].recruit);
    next.resting = [];
    if (next.chapter === 7) {
      next.ending += 1;
      next.phase = "complete";
    } else {
      next.chapter += 1;
      next.stage = 0;
      next.phase = "intro";
    }
    return next;
  }
  function encounter(chapter, stage, cards, options) {
    const row = chapterAt(chapter);
    const id = encounterIds(chapter)[stage];
    if (!id) throw new RangeError("없는 원정 상대입니다.");
    const source = cards.find(card => card.id === id) || (id === FINAL_BOSS.id ? FINAL_BOSS : null);
    if (!source) throw new Error("원정 카드 누락: " + id);
    const enemy = clone(source);
    const bonus = options && Number.isFinite(options.hpBonus) ? options.hpBonus : row.hpBonuses[stage];
    enemy.hp = Math.max(10, enemy.hp + bonus);
    return {card: enemy, boss: id === row.boss, hpBonus: bonus,
      options: {aiMistakeRate: id === row.boss ? 0 : 0.3}};
  }
  return Object.freeze({STORAGE_KEY, CHAPTERS, SCENES: ALL_SCENES, ENDING, advanceEnding, FINAL_BOSS, createProgress,
    normaliseProgress, load, save, finishIntro, selectParty, availableParty,
    beginBattle, finishBattle, finishChapter, encounter, encounterIds, candidatesForChapter});
});
