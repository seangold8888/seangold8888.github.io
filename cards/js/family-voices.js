(function (root) {
  "use strict";
  const FILES = Object.freeze({
    taeo: 'taeo-callout-v2.wav', jaei: 'jaei-callout-v2.wav',
    yunchan: 'yunchan-callout-v2.wav', yungeon: 'yungeon-callout-v2.wav'
  });
  const supports = id => Object.prototype.hasOwnProperty.call(FILES, id);
  const skill = name => '../sanguo/audio/family-skills-v1/' + name + '.wav';
  const ACTION_FILES = Object.freeze({
    jaei: Object.freeze({
      '코딱지 날리기': Object.freeze(['../sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav']),
      '트림 폭탄': Object.freeze([skill('jaei-special-eleven-no-v1')]),
      '참았던 방귀': Object.freeze([skill('jaei-special-eleven-water-v1')]),
    }),
    taeo: Object.freeze({
      '발냄새 공격': Object.freeze([skill('taeo-special-eleven-fight-v1'), skill('taeo-special-eleven-yummy-v1')]),
      '연속 방귀': Object.freeze([skill('taeo-special-eleven-kiap-v1')]),
      '대왕 방귀': Object.freeze([skill('taeo-special-eleven-sseugumi-only-v1')]),
      '메가랩터킥': Object.freeze([skill('taeo-special-eleven-meganaptor-v1')]),
    }),
  });
  // Every other card shouts only its big (last) attack name, once, in its own cast voice.
  // Generated from cards/audio/attack-voices-v1/manifest.json.
  const ATTACK_DIR = 'audio/attack-voices-v1/';
  // ATTACK_LINES:BEGIN
  const ATTACK_LINES = Object.freeze({
    heracles: '열두 과업',
    honggildong: '의적의 화살',
    perseus: '메두사의 머리',
    jack: '황금 거위 훔치기',
    threepigs: '삼형제 박치기',
    arthur: '엑스칼리버',
    odysseus: '트로이 목마',
    cinderella: '호박마차 돌진',
    tortoisehare: '느림보 역전',
    redhood: '사냥꾼 부르기',
    bremen: '왁자지껄 대소동',
    pinocchio: '참새 친구 부르기',
    sunwukong: '여의봉 크게!',
    fairygodmother: '자정의 기적',
    genie: '소원 펑!',
    snowqueen: '눈보라',
    witch: '오븐 밀치기',
    mermaid: '바다의 노래',
    polyphemus: '바위 던지기',
    wolf: '후― 불어 날리기',
    beanstalkgiant: '쿵쿵 발구르기',
    medusa: '돌로 만들기',
    midas: '황금 손',
    tiger: '어흥!',
    zeus: '천둥 심판',
    poseidon: '해일',
    hades: '망자의 물결',
    apollo: '리라의 심판',
    minotaur: '미궁의 포효',
    cerberus: '저승문 지키기',
    hydra: '독 안개',
    sphinx: '날개 급습',
    achilles: '분노의 돌격',
    theseus: '미궁 돌파',
    artemis: '사냥의 여신',
    atalanta: '사냥 창',
    athena: '전략의 창',
    hermes: '전령의 지팡이',
    orpheus: '저승의 노래',
    prometheus: '인류의 불',
    guanyu: '청룡일섬',
    zhangfei: '장판교 호통',
    zhaoyun: '아두 구출',
    zhugeliang: '화공',
    caocao: '관도 대공세',
    simayi: '낙양 진군',
    nezha: '풍화륜 돌진',
    erlangshen: '삼첨양인도',
    wumawang: '소 돌진',
    honghaier: '삼매진화',
    baigujing: '백골 손톱',
    appa: '간지럽히기',
    eomma: '엄마의 한마디',
    yisunshin: '거북선 돌진',
    euljimundeok: '유인 작전',
    ganggamchan: '귀주대첩',
    kwonyul: '화차 일제사격',
    sherlockholmes: '완벽한 추리',
    doctorwatson: '믿음직한 동행',
    arsenelupin: '달빛 탈출',
    moriarty: '최후의 수',
    gearwing: '기어 폭풍',
    starshield: '모두를 지켜',
    thunderguard: '천둥 장단',
    redknot: '그림자 포획',
    walllizard: '꼬리 회전',
    neonjumper: '차원 발차기',
    moonmoth: '초승 날개',
    ppungdetective: '범인은 너야',
    circe: '돼지 변신',
    siren: '마음을 끄는 합창',
    scylla: '여섯 머리 급습',
    helios: '태양 마차',
    sseugumi: '대왕 장난',
    sejong: '지혜를 나누다',
    jangyeongsil: '혼천의 별길',
    heojun: '동의보감의 빛',
    shinsaimdang: '풀잎 정원',
    jeongyakyong: '거중기의 힘',
    kimhongdo: '풍속화 한 장',
    yugwansun: '아우내의 메아리',
    kimgu: '문화의 힘',
    jaewing: '바이킹 그네 밀기',
    taeppul: '꼴통 떼쓰기',
    chanppul: '번개맨 천둥쇼',
    geonppul: '헐크 박치기',
  });
  // ATTACK_LINES:END
  const hasAttackLine = id => !supports(id) && Object.prototype.hasOwnProperty.call(ATTACK_LINES, id);
  const attackFile = id => ATTACK_DIR + id + '.mp3';
  function attackLine(plan) { return !!(plan && hasAttackLine(plan.cardId) && ATTACK_LINES[plan.cardId] === plan.attack); }
  function actionFiles(plan) {
    if (attackLine(plan)) return [attackFile(plan.cardId)];
    const actions = plan && ACTION_FILES[plan.cardId];
    return actions && Object.prototype.hasOwnProperty.call(actions, plan.attack) ? actions[plan.attack] : null;
  }
  function eligible(plan) { return !!(plan && (attackLine(plan) || (supports(plan.cardId) && (actionFiles(plan) || plan.big || plan.ultimate)))); }
  function create(host) {
    const buffers = new WeakMap();
    const playedPlans = new WeakSet(), cursors = new Map();
    let active = null, generation = 0;
    const now = () => host.performance ? host.performance.now() : Date.now();
    const muted = () => !host.CardAudio || host.CardAudio.isMuted() || host.document.hidden;
    const fallbackFile = id => '../sanguo/audio/hero-callouts-eleven-v2/' + FILES[id];
    async function load(file, audio) {
      let cache = buffers.get(audio);
      if (!cache) { cache = new Map(); buffers.set(audio, cache); }
      if (!cache.has(file)) {
        const pending = host.fetch(new URL(file, host.location.href).href).then(response => {
          if (!response.ok) throw Error('Voice unavailable');
          return response.arrayBuffer();
        }).then(bytes => audio.decodeAudioData(bytes));
        cache.set(file, pending);
        pending.catch(() => { if (cache.get(file) === pending) cache.delete(file); });
      }
      return cache.get(file);
    }
    function stop(fade) {
      generation += 1;
      const previous = active; active = null;
      if (!previous) return;
      const time = previous.audio.currentTime;
      try {
        previous.gain.gain.cancelScheduledValues(time);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, time);
        previous.gain.gain.linearRampToValueAtTime(0, time + (fade ? .075 : .008));
        previous.source.stop(time + (fade ? .075 : .008));
      } catch (error) {}
    }
    async function warm(id) {
      if (!(supports(id) || hasAttackLine(id)) || muted()) return false;
      const audio = host.CardAudio.prime();
      if (!audio || audio.state === 'closed') return false;
      // Lazy: only the two cards in the current battle are fetched and decoded.
      const files = hasAttackLine(id) ? [attackFile(id)]
        : [...new Set([fallbackFile(id), ...Object.values(ACTION_FILES[id] || {}).flat()])];
      const results = await Promise.all(files.map(file => load(file, audio).then(() => true, () => false)));
      return results.every(Boolean);
    }
    async function play(plan) {
      if (!eligible(plan) || muted() || playedPlans.has(plan)) return false;
      const key = plan.cardId + ':' + plan.attack;
      const variants = actionFiles(plan) || [fallbackFile(plan.cardId)];
      const cursor = cursors.get(key) || 0, file = variants[cursor % variants.length];
      // Card attack shouts wait their turn: they never cut or overlap a voice that is speaking.
      const polite = attackLine(plan);
      if (polite && active) return false;
      if (!polite) stop(true);
      const ticket = generation, deadline = now() + 600;
      const audio = host.CardAudio.prime();
      if (!audio) return false;
      try {
        const buffer = await load(file, audio);
        // Never play a late decode after another action, mute, navigation or recovery.
        if (ticket !== generation || muted() || now() > deadline || audio.state !== 'running' || host.CardAudio.prime() !== audio) return false;
        if (polite && active) return false;
        // A family line keeps its old priority over a card shout that started during its decode.
        if (active) stop(true);
        const source = audio.createBufferSource(), gain = audio.createGain();
        source.buffer = buffer; source.playbackRate.value = 1;
        gain.gain.value = .95;
        source.connect(gain);
        if (!host.CardAudio.connectVoice(gain)) { source.disconnect(); gain.disconnect(); return false; }
        const entry = { audio, source, gain };
        active = entry;
        source.onended = () => {
          source.disconnect(); gain.disconnect();
          if (active === entry) active = null;
        };
        source.start(audio.currentTime);
        playedPlans.add(plan); cursors.set(key, cursor + 1);
        return true;
      } catch (error) { return false; }
    }
    host.addEventListener?.('pagehide', () => stop());
    host.document.addEventListener?.('visibilitychange', () => { if (host.document.hidden) stop(); });
    return Object.freeze({ warm, play, stop });
  }
  if (typeof module === 'object' && module.exports) module.exports = { FILES, ACTION_FILES, ATTACK_LINES, ATTACK_DIR, eligible, create };
  else root.CardFamilyVoice = create(root);
}(typeof window !== 'undefined' ? window : globalThis));
