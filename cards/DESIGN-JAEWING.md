# 재이의 괴물 친구 재윙

사용자 확정: 이름은 **재윙**, 재이의 괴물이다. 쓰구미는 태오의 괴물로 그대로 둔다.
아래 외형과 기술은 Codex의 첫 제안이다. 아이가 실제로 정한 생김새·말버릇이라고 주장하지 않는다. 별도 말버릇이나 가족의 실제 일화는 지어내지 않았다. 기존 원정 이야기와 쓰구미 카드/보스는 변경하지 않는다.

## 첫 카드

- id jaewing, 물 속성 / 괴물 타입, 체력 110.
- 폭신한 날개: 처음 받는 공격 피해를 한 번 막음.
- 날개 툭: 별사탕 1, 피해 20.
- 장난 바람: 별사탕 2, 피해 30 + 상대 다음 공격 피해 20 감소.
- 재윙 회오리: 별사탕 4, 피해 70.
- 회복/무한 회피/턴 봉쇄를 추가하지 않음. 기존 엔진으로 전부 구현.
- 카드 소개 + 카드 능력을 묻는 문제 5개. legend:jaewing 경로라 없는 오디오로 보내지 않음.
- family-balance.cjs: 85장 기준 재윙 48.3%, C등급. 가족은 재이 85.6%, 태오 80.7%, 엄마 80.6%, 아빠 78.7%, 상위 4명/재이 1위/태오 2위 유지, 교착 0.
- 획득: C등급 수학 카드 규칙인 누적 2일 + 10문제. 기존 unlock 토큰은 과거 기록 보존용이며 tierUnlockGoals가 우선. 가족의 높은 조건은 그대로.
- 새 기술 이모지 🦢/🍃/🌪️는 기존 84장의 기술에 없는 것을 확인하고 air 재질 연결. 기존 570개 명중/약점/빗나감 소리 계획을 해시로 고정.

## 원화

내장 image_gen으로 생성. 1024×1536 PNG + WebP(품질 88). art/jaewing.png, art/jaewing.webp.
밝은 공중 배경, 큰 날개와 풍성한 털, 자신감 있는 장난스러운 표정. 캐릭터가 잘 보이도록 기존 카드 비율 유지. 글자/숫자/프레임 없음. 기존 그림 재생성 없음.

### 사용한 생성 프롬프트 전문

Use case: stylized-concept. Create one original premium painted character illustration for a children's fantasy collectible card game. New character called Jaewing (재윙), the personal imaginary monster companion of a young girl; illustrate ONLY the monster, not the girl. It is a small winged monster, cute but confidently mischievous, clever expressive eyes, a strong memorable silhouette, rounded soft features, no frightening teeth or menacing violence. This is an initial proposed creature design, not a depiction of a real child. Show the whole creature in an active playful pose with both wings readable and face unobstructed. Rich painterly storybook fantasy rendering with exquisite material detail, dimensional lighting, believable weight, atmospheric magical backdrop secondary to the creature. A collectible fantasy portrait that feels lovingly crafted rather than flat mascot clipart. Portrait 1024 x 1536 PNG, full bleed illustration only, no card frame, absolutely no words letters numbers UI symbols watermark or logos. Safe and welcoming for ages five to eight, yet visually sophisticated. One character only. Leave comfortable margins around head, wings and feet so game crops work.

## 검증

node --test "cards/tests/*.test.js"

node cards/tools/family-balance.cjs

node cards/tools/jaewing-smoke.cjs

카드 모듈 v59 / 캐시 v100. 공개 배포 별도.

최종 검증: 카드 테스트 320/320 통과. 브라우저 스모크는 390×844, 820×1180, 1180×820에서 획득 전/후, 원화 로드, 퀴즈 정답과 필살기 개방, 세 기술 실제 실행 및 효과음 호출, 오프라인 재접속을 통과했다. 이미지 디코딩/진입 애니메이션 완료 후 상세·전투 스크린샷도 확인했다. 실물 iPad Safari와 아이 취향 검수는 별도다.

가족 시뮬레이션의 정수 반올림으로 태오와 엄마가 둘 다 81%로 보여 잘못 동점 판정되던 검사는 소수 둘째 자리 출력/파싱으로 수정했다. 실제 승률 순서와 기존 수치는 바꾸지 않았다. 기존 84장의 데이터 및 두 획득 정책을 이전 커밋과 직접 비교해 동일함도 확인했다.
