// 판(에디션) 설정 — 판마다 다른 값만 여기 한 곳에 모은다. 이 파일은 가족판 기본값이다.
// 공개판(스토어용)은 저장소 밖 빌드 도구가 이 파일을 통째로 다른 edition.js 로 바꿔 끼운다. main.js·sfx.js 는 여기서만 읽는다.
// 지킬 것: 값 이름·모양을 바꾸면 공개판 edition.js 도 같이 바꿔야 한다.
export const EDITION = {
  id: "family",
  title: "스카이 샷 · PLAYGROUND",      // 브라우저 탭 제목
  heading: "스카이 샷",                  // 시작 화면 큰 제목
  // 조종사: 아이 넷. art = art/<art>.webp(172x260, 위를 보는 비행기), kid = 공통 수학 모듈(GameQuiz)의 아이 id.
  // 순서가 난이도(logic.js PILOT_TUNING)와 필살기(fx.js) 순서다.
  pilots: [
    { name: "윤찬", art: "p0", kid: "yunchan" },
    { name: "재이", art: "p1", kid: "jaei" },
    { name: "윤건", art: "p2", kid: "yungeon" },
    { name: "태오", art: "p3", kid: "taeo" },
  ],
  defaultPilot: 1,                       // 저장된 조종사가 없을 때
  pilotArtV: 2,                          // 조종사 그림 ?v= (캐시 갱신용)
  // 돌아가기 링크(머리띠 ← 와 끝 화면 버튼). null 이면 둘 다 숨긴다.
  home: { href: "../game/", label: "PLAYGROUND로", aria: "PLAYGROUND로 돌아가기" },
  playTimer: true,                       // 놀이 시간 표(../assets/study/play-timer.js)를 쓰는가(빌드 도구가 읽는다)
  // GameQuiz 아이 목록. null 이면 game-quiz.js 에 들어 있는 기본 목록(아이 넷)을 그대로 쓴다.
  quizProfiles: null,
  // 조종사 외침(녹음 클립). shouts=false 면 외침 없이 합성 효과음만.
  shouts: true,
  voices: {
    // 공통 표 assets/study/kid-voices.js(window.KidVoices.list)를 먼저 쓴다. 새 대사가 그 표에 들어가면 여기서도 바로 나온다.
    lookup: id => { const KV = typeof window !== "undefined" ? window.KidVoices : null; return KV && KV.list ? KV.list(id) : null; },
    // 표를 못 읽었을 때만 쓰는 옛 목록(plane/ 페이지 기준 경로). 그 아이 목소리가 아닌 클립은 넣지 않는다.
    table: {
      yunchan: [["../sanguo/audio/hero-callouts-eleven-v2/yunchan-callout-v2.wav", "마마보이!"], ["../cards/audio/attack-voices-v1/chanppul.mp3", "번개맨 천둥쇼!"]],
      jaei: [["../sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav", "김태오!"], ["../sanguo/audio/family-skills-v1/jaei-special-eleven-no-v1.mp3", "아니야!"],
        ["../sanguo/audio/family-skills-v1/jaei-special-eleven-wait-v1.mp3", "기다려!"], ["../sanguo/audio/family-skills-v1/jaei-special-eleven-sireo-v1.mp3", "시러!"],
        ["../cards/audio/attack-voices-v1/jaewing.mp3", "바이킹 그네 밀기!"]],
      yungeon: [["../sanguo/audio/hero-callouts-eleven-v2/yungeon-callout-v2.wav", "너무 쉽잖아!"], ["../cards/audio/attack-voices-v1/geonppul.mp3", "헐크 박치기!"]],
      taeo: [["../sanguo/audio/family-skills-v1/taeo-special-eleven-sseugumi-only-v1.mp3", "쓰구미!"], ["../sanguo/audio/family-skills-v1/taeo-special-eleven-fight-v1.mp3", "싸우자!"],
        ["../sanguo/audio/family-skills-v1/taeo-special-eleven-kiap-v1.mp3", "치앗! 촤! 치앗! 촤!"], ["../sanguo/audio/family-skills-v1/taeo-special-eleven-meganaptor-v1.mp3", "메가냅터킥!"],
        ["../sanguo/audio/family-skills-v1/taeo-special-eleven-yummy-v1.mp3", "맛있는 거죠!"]],
    },
  },
};
