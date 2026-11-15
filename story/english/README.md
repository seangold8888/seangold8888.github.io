# 영어 그림책 (/story/english/)

2026-09-19 사용자 요청: "스토리북도 영어 컨텐츠 만들어보자". 2026-11-15부터 **듣기 전용**(대표님: "영어책은 듣기만 넣고").
영어 말하기(마이크) 연습은 허브(오늘의 공부)의 회화 문장 "말하기 연습"에서 한다(`assets/study/english-reading.js`).

- 7권 × 8쪽 = 56쪽. 쉬운 책부터: 재이와 태오의 소풍(★) · 모모와 빨간 연(★) · 아기돼지 삼형제(★) · 토끼와 거북(★★) · 빨간 모자(★★) · 잭과 콩나무(★★★) · 신데렐라(★★★).
- 본문과 한글 뜻은 `books.js`. 쪽마다 전용 삽화 `art/<책>-<쪽>.webp`(7권 모두 WebP, 1024px). 모모 8쪽도 11-15에 PNG(쪽당 2.8MB)에서 WebP(쪽당 약 0.18MB)로 바꿨다. 그림이 없으면 카드 원화로 대신한다.
- 화면: 그림 + 문장 + 🔊 듣기 + 한글 뜻(다 듣고 나면 작게) + 앞/다음. 쪽을 열면 한 번 저절로 읽어 주고, 브라우저가 막으면 듣기 버튼이 깜빡인다. 소리는 Web Audio 로만 낸다(아이패드).
- 예전 허브 '먼저 듣기' 링크(`?book=…&page=…&listen=1&from=study`)로 와도 그 쪽이 열리고 "← 오늘의 공부로" 링크만 더 보인다.
- 낭독 파일: `audio/<책 id>-<쪽>.mp3`(Gemini TTS Leda). `books.js` 의 짧은 문장·한 문장씩 연습용 녹음(`audio/practice-v1/`)과 성장 함수는 지금 화면에서 쓰지 않지만 데이터·테스트 호환을 위해 남겨 두었다.
- 다 들은 책은 기기에 `story_english_done`으로 기억하고 책장에 "다 들었어요 ⭐"를 붙인다.
- 티켓 없이 들어가는 곳이라 게임 시간 제한(play-timer)을 싣지 않는다.
- 점검: `node tools/english-books-smoke.cjs`
- 신데렐라 5쪽은 09-19 Vertex AI(gemini-3-pro-image)로 다시 그렸다. 7쪽은 사람 없이 유리 구두만 있다(왕자+유리 구두 장면은 IMAGE_PROHIBITED_CONTENT로 거절).
- 다시 그리기·녹음: `GCP_PROFILE=allin8 python tools/vertex-page-art.py <책-쪽> "<장면>" <참고그림>...`, `GCP_PROFILE=allin8 python tools/vertex-tts.py page|word|lines …`. 인증은 `gcp_auth.py`(무료 크레딧 계정)로만 하며 ADC 로 넘어가지 않는다.
