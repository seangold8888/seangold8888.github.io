농구 그림(art/<kid>/shoot·shoot-idle·shoot-cheer) 만드는 법 — 영상 클립(초록 배경, 옆모습, 오른쪽으로 슛)에서.

1) python contact.py <클립.mp4> <이름>          → <이름>.npy(프레임) + <이름>_sheet.jpg(훑어보기)
2) 훑어보기에서 프레임 번호를 고른다: release(공이 손을 떠난 첫 프레임), crouch(가장 웅크림), land(착지),
   shoot [시작, 끝], idle [a, b](공을 든 채 살짝 움직이는 구간), cheer [a, b](만세 구간)
3) python build_clip.py <이름> <출력폴더> '<설정 json>'
   재이(2026-11-20): {"release":84,"crouch":52,"land":140,"shoot":[0,152],"idle":[0,14],"cheer":[236,292],"pingpong":true,
                      "height":400,"standH":821,"anchor":[372,1089],"ballR":68,"q":72,"eraseFor":80}
   태오(2026-11-20): {"release":124,"crouch":55,"land":166,"shoot":[0,176],"riseStep":2,"idle":[0,14],"cheer":[238,292],
                      "pingpong":true,"height":400,"standH":660,"anchor":[360,1090],"ballR":75,"q":72,"eraseFor":80,"eraseMaxY":620}
   standH = 원본에서 선 키(px), anchor = 원본 발 가운데, ballR = 원본 공 반지름. 손을 떠난 뒤 영상 공은 지운다(게임이 공을 그린다).
4) python check.py <출력폴더> shoot 0,10,20,30 확인.jpg   → 프레임·공 자리·발 기준점 눈으로 확인
5) 출력 파일을 sports/art/<kid>/ 에 덮어쓰고, views/basketball-stage.js 의 ART_V 와 sw.js 의 ?v= 를 올린다.
   공이 손을 떠나는 자리가 바뀌면 events/basketball-rules.js 의 RELEASE_BY_KID 도 다시 잰다((공 가운데 − 발) ÷ 선 키).

클립이 없으면: python build_still.py <그림.png> <출력폴더> '{"anchor":[500,1394],"waist":1030,"height":400,"standH":960}'
  (그림 한 장을 늘이기·윗몸 휘기로 움직인 대신 그림. 같은 json 약속이라 코드는 그대로.)
6) 브라우저 검사: tools/sports-basketball/smoke.cjs (playwright-core + msedge)
7) 크기 줄이기(2026-11-20, 한 장 1MB → 약 400KB): python reatlas.py <원본 art 폴더> <출력> jaei/shoot 0.85 64 70 6 1.5
   = 프레임 0.85배 · 프레임 2/3(24→16fps, 웅크림·놓기·착지 프레임은 꼭 남김) · WebP q64 · 알파 q70. json(frames·anchor·height·ball·ballR·events·fps)도 같이 바뀐다.
   덮어쓴 뒤 basketball-stage.js 의 ART_V 와 sw.js 의 ?v= 를 올린다.
