(function (root) {
  "use strict";
  // 2026-11-15 영어 읽기 = "말하기 연습": 미국 프리스쿨·킨더가튼 교실에서 실제로 배우고 쓰는 말.
  // 교실 회화(아침 인사·서클 타임·부탁·차례·정리·간식·놀이터·손 씻기), 사이트 워드 반복 패턴 문장(새로 씀),
  // 퍼블릭 도메인 전래 동요 한 줄(Mother Goose 계열 등 19세기 이전 출판)만 쓴다. 현대 그림책·교재·근래 노래 문장은 넣지 않는다.
  // 단계: 1 한두 마디(1~3단어) · 2 짧은 말(3~4) · 3 조금 긴 말(5~6) · 4 긴 말(7~8)
  //       5 묻고 답하기 한 쌍 · 6 두 마디 대화 · 7 세 마디 대화 · 8 긴 대화(3~4문장)
  // 항목: [상황, 영어, 한국어 뜻]. 상황 꼬리표는 읽기 전에 보이고, 뜻은 맞게 읽은 뒤에 보인다.
  // 아이 실명은 쓰지 않는다(my brother, my friend 식으로).
  const SITUATIONS = {
    morning: "🌅 아침 인사", circle: "⭕ 서클 타임", ask: "🙋 부탁할 때", feel: "😊 기분 말하기",
    share: "🤝 함께 놀 때", play: "🛝 놀이터", clean: "🧹 정리 시간", art: "🎨 만들기 시간",
    snack: "🍎 간식 시간", care: "🧼 손 씻기·화장실", me: "👪 나와 가족", sorry: "💛 미안할 때",
    thanks: "🙏 고마울 때", pattern: "📖 따라 말하기", song: "🎵 노래", bye: "👋 집에 갈 때", q: "❓ 물어볼 때"
  };
  const CONVERSATION = {
    1: [
      ["pattern", "I like apples.", "나는 사과를 좋아해요."],
      ["morning", "Good morning!", "좋은 아침이에요!"],
      ["morning", "Hello, teacher!", "선생님, 안녕하세요!"],
      ["morning", "Hi, friends!", "친구들, 안녕!"],
      ["morning", "Good morning, everyone!", "여러분, 좋은 아침이에요!"],
      ["circle", "It's sunny.", "날씨가 맑아요."],
      ["circle", "It's cloudy.", "구름이 꼈어요."],
      ["circle", "It's raining.", "비가 와요."],
      ["circle", "It's snowing.", "눈이 와요."],
      ["circle", "It's windy.", "바람이 불어요."],
      ["circle", "Today is Monday.", "오늘은 월요일이에요."],
      ["circle", "Today is Friday.", "오늘은 금요일이에요."],
      ["ask", "Help, please!", "도와주세요!"],
      ["ask", "Yes, please.", "네, 주세요."],
      ["ask", "No, thank you.", "아니요, 괜찮아요."],
      ["ask", "Me, please!", "저요, 저 시켜 주세요!"],
      ["ask", "Wait for me!", "나 기다려 줘!"],
      ["ask", "More, please.", "더 주세요."],
      ["ask", "One more, please.", "하나 더 주세요."],
      ["feel", "I'm happy.", "기뻐요."],
      ["feel", "I'm sad.", "슬퍼요."],
      ["feel", "I'm mad.", "화가 나요."],
      ["feel", "I'm tired.", "피곤해요."],
      ["feel", "I'm scared.", "무서워요."],
      ["feel", "I'm hungry.", "배고파요."],
      ["feel", "I feel great!", "기분 최고예요!"],
      ["feel", "I'm excited!", "신나요!"],
      ["share", "My turn!", "내 차례야!"],
      ["share", "Your turn!", "네 차례야!"],
      ["share", "Let's share.", "같이 나눠 쓰자."],
      ["share", "Me too!", "나도!"],
      ["share", "Come play!", "와서 같이 놀자!"],
      ["share", "Let's play!", "놀자!"],
      ["play", "Look at me!", "나 좀 봐!"],
      ["play", "Watch me!", "나 보고 있어!"],
      ["play", "I did it!", "해냈어!"],
      ["play", "Go, go, go!", "가자, 가자, 가자!"],
      ["play", "Push me, please!", "그네 좀 밀어 줘!"],
      ["play", "Catch the ball!", "공 잡아!"],
      ["play", "Ready, set, go!", "준비, 땅!"],
      ["clean", "Clean up time!", "정리 시간이에요!"],
      ["clean", "I'm done!", "다 했어요!"],
      ["clean", "Line up, please.", "줄 서세요."],
      ["clean", "All done!", "다 끝났어요!"],
      ["art", "I need glue.", "풀이 필요해요."],
      ["art", "Look, a rainbow!", "봐, 무지개야!"],
      ["art", "I made this!", "내가 만들었어요!"],
      ["snack", "Yummy!", "맛있어요!"],
      ["snack", "I'm full.", "배불러요."],
      ["snack", "Snack time!", "간식 시간이에요!"],
      ["snack", "Water, please.", "물 주세요."],
      ["care", "Wash your hands.", "손을 씻어요."],
      ["care", "Bathroom, please.", "화장실 가고 싶어요."],
      ["care", "Bless you!", "몸조심해!(재채기했을 때)"],
      ["me", "I'm five.", "나는 다섯 살이에요."],
      ["me", "I'm seven.", "나는 일곱 살이에요."],
      ["me", "This is Mom.", "이분은 우리 엄마예요."],
      ["me", "I love you!", "사랑해요!"],
      ["sorry", "I'm sorry.", "미안해요."],
      ["sorry", "Are you okay?", "괜찮아?"],
      ["sorry", "That's okay.", "괜찮아요."],
      ["sorry", "Excuse me.", "실례합니다."],
      ["sorry", "It's okay.", "괜찮아."],
      ["thanks", "Thank you!", "고마워요!"],
      ["thanks", "Thanks, teacher!", "선생님, 고맙습니다!"],
      ["thanks", "You're welcome.", "천만에요."],
      ["pattern", "I can run.", "나는 달릴 수 있어요."],
      ["pattern", "I can jump.", "나는 뛸 수 있어요."],
      ["pattern", "I can hop.", "나는 깡충 뛸 수 있어요."],
      ["pattern", "We can run.", "우리는 달릴 수 있어요."],
      ["pattern", "I see you!", "너 보인다!"],
      ["pattern", "Here it is.", "여기 있어요."],
      ["pattern", "Come here!", "이리 와!"],
      ["pattern", "Look up!", "위를 봐!"],
      ["song", "Hot cross buns!", "핫 크로스 번!"],
      ["bye", "Bye-bye!", "안녕!"],
      ["bye", "See you tomorrow!", "내일 봐요!"],
      ["bye", "Have fun!", "재미있게 놀아!"],
      ["bye", "Good night!", "잘 자요!"],
      ["q", "What's this?", "이건 뭐예요?"],
      ["q", "Who's next?", "다음은 누구예요?"],
      ["q", "Really?", "정말요?"],
      ["q", "Why?", "왜요?"],
      ["q", "Is it lunch?", "점심시간이에요?"]
    ],
    2: [
      ["morning", "How are you today?", "오늘 기분 어때요?"],
      ["morning", "I'm good, thanks.", "좋아요, 고마워요."],
      ["morning", "Nice to meet you.", "만나서 반가워요."],
      ["morning", "Good morning, teacher!", "선생님, 좋은 아침이에요!"],
      ["circle", "What day is it?", "무슨 요일이에요?"],
      ["circle", "What's the weather?", "날씨가 어때요?"],
      ["circle", "It's cold today.", "오늘은 추워요."],
      ["circle", "It's hot today.", "오늘은 더워요."],
      ["circle", "Today is my birthday!", "오늘은 내 생일이에요!"],
      ["ask", "Can you help me?", "도와줄 수 있어요?"],
      ["ask", "May I have water?", "물 마셔도 돼요?"],
      ["ask", "Can I go outside?", "밖에 나가도 돼요?"],
      ["ask", "Please open this.", "이것 좀 열어 주세요."],
      ["ask", "I need help.", "도움이 필요해요."],
      ["ask", "Can I try?", "내가 해 봐도 돼?"],
      ["feel", "I feel sad today.", "오늘은 슬퍼요."],
      ["feel", "I'm so happy!", "정말 기뻐요!"],
      ["feel", "I feel sick.", "몸이 아파요."],
      ["feel", "My tummy hurts.", "배가 아파요."],
      ["feel", "I miss my mom.", "엄마가 보고 싶어요."],
      ["share", "It's my turn.", "내 차례야."],
      ["share", "Can I play?", "나도 놀아도 돼?"],
      ["share", "Let's take turns.", "차례대로 하자."],
      ["share", "You can go first.", "너 먼저 해."],
      ["share", "Let's play together.", "같이 놀자."],
      ["play", "Let's go outside!", "밖에 나가자!"],
      ["play", "Push me higher!", "더 높이 밀어 줘!"],
      ["play", "Watch me jump!", "나 뛰는 거 봐!"],
      ["play", "You're it!", "네가 술래야!"],
      ["play", "Let's play tag.", "술래잡기하자."],
      ["clean", "I'm all done.", "다 끝났어요."],
      ["clean", "Put it away.", "제자리에 갖다 놔요."],
      ["clean", "Clean up, everybody!", "모두 정리해요!"],
      ["clean", "Throw it away.", "쓰레기통에 버려요."],
      ["art", "I need a crayon.", "크레용이 필요해요."],
      ["art", "Can I have paper?", "종이 받아도 돼요?"],
      ["art", "Look at my picture!", "내 그림 좀 봐요!"],
      ["art", "I like your drawing.", "네 그림 좋다."],
      ["art", "Cut on the line.", "선을 따라 잘라요."],
      ["snack", "Can I have more?", "더 먹어도 돼요?"],
      ["snack", "It's snack time!", "간식 시간이에요!"],
      ["snack", "This is yummy!", "이거 맛있어요!"],
      ["snack", "I'm still hungry.", "아직 배고파요."],
      ["care", "Wash with soap.", "비누로 씻어요."],
      ["care", "Cover your cough.", "기침할 땐 입을 가려요."],
      ["care", "I need a tissue.", "휴지가 필요해요."],
      ["me", "I have a brother.", "나는 남자 형제가 있어요."],
      ["me", "I have a sister.", "나는 여자 형제가 있어요."],
      ["me", "I live in Korea.", "나는 한국에 살아요."],
      ["me", "This is my dad.", "이분은 우리 아빠예요."],
      ["sorry", "I'm so sorry.", "정말 미안해요."],
      ["sorry", "Are you hurt?", "다쳤어?"],
      ["sorry", "Let me help you.", "내가 도와줄게."],
      ["thanks", "Thank you, friend!", "친구야, 고마워!"],
      ["thanks", "Thank you so much!", "정말 고마워요!"],
      ["pattern", "I see a cat.", "고양이가 보여요."],
      ["pattern", "I see a dog.", "강아지가 보여요."],
      ["pattern", "I like to jump.", "나는 뛰는 게 좋아요."],
      ["pattern", "I like to run.", "나는 달리는 게 좋아요."],
      ["pattern", "Here is my bag.", "여기 내 가방이 있어요."],
      ["pattern", "The ball is red.", "공은 빨간색이에요."],
      ["pattern", "The sun is yellow.", "해는 노란색이에요."],
      ["pattern", "I have two hands.", "나는 손이 두 개 있어요."],
      ["pattern", "This is a circle.", "이건 동그라미예요."],
      ["pattern", "Look at the bird.", "새를 봐요."],
      ["pattern", "Can you see me?", "내가 보여요?"],
      ["pattern", "We go to school.", "우리는 학교에 가요."],
      ["song", "Twinkle, twinkle, little star.", "반짝반짝 작은 별."],
      ["song", "Gently down the stream.", "시냇물 따라 살살."],
      ["song", "Rain, rain, go away.", "비야, 비야, 저리 가."],
      ["song", "Come again another day.", "다른 날 다시 오렴."],
      ["song", "Down came the rain.", "비가 내렸어요."],
      ["song", "Out came the sun.", "해가 나왔어요."],
      ["bye", "See you later!", "나중에 봐!"],
      ["bye", "Time to go home.", "집에 갈 시간이에요."],
      ["bye", "My mom is here!", "엄마 오셨다!"],
      ["q", "Where is my bag?", "내 가방 어디 있어요?"],
      ["q", "What is your name?", "이름이 뭐예요?"],
      ["q", "How old are you?", "몇 살이에요?"],
      ["q", "Who is that?", "저 사람은 누구예요?"],
      ["q", "Can I see?", "나도 봐도 돼?"]
    ],
    3: [
      ["morning", "Good morning, how are you?", "좋은 아침이에요, 잘 지내요?"],
      ["morning", "I'm happy to see you.", "만나서 기뻐요."],
      ["circle", "What day is it today?", "오늘은 무슨 요일이에요?"],
      ["circle", "It's sunny and warm today.", "오늘은 맑고 따뜻해요."],
      ["circle", "What's the weather like today?", "오늘 날씨는 어때요?"],
      ["circle", "Let's count to ten together.", "같이 열까지 세어요."],
      ["ask", "Can I have a turn, please?", "나도 한 번 해도 돼요?"],
      ["ask", "May I go to the bathroom?", "화장실 가도 돼요?"],
      ["ask", "Can you help me, please?", "좀 도와주실래요?"],
      ["ask", "Can I sit next to you?", "네 옆에 앉아도 돼?"],
      ["ask", "Can you tie my shoe?", "신발 끈 묶어 줄래요?"],
      ["ask", "Could you say that again?", "다시 말해 줄래요?"],
      ["feel", "I feel sad because I fell.", "넘어져서 슬퍼요."],
      ["feel", "I feel a little bit tired.", "조금 피곤해요."],
      ["feel", "I don't feel good.", "몸이 안 좋아요."],
      ["feel", "I'm proud of my picture.", "내 그림이 자랑스러워요."],
      ["share", "Can I play with you?", "같이 놀아도 돼?"],
      ["share", "Let's share the blocks, okay?", "블록 같이 쓰자, 알았지?"],
      ["share", "You can have a turn.", "너도 한 번 해."],
      ["share", "Do you want to play?", "같이 놀래?"],
      ["share", "Let's build a big tower.", "큰 탑을 쌓자."],
      ["play", "Let's go down the slide!", "미끄럼틀 타자!"],
      ["play", "I can climb up high!", "나는 높이 올라갈 수 있어!"],
      ["play", "Let's play in the sand.", "모래 놀이하자."],
      ["play", "Can you push me, please?", "그네 좀 밀어 줄래?"],
      ["play", "I can swing by myself.", "나 혼자 그네 탈 수 있어."],
      ["clean", "Put the toys in the box.", "장난감을 상자에 넣어요."],
      ["clean", "Let's clean up the room.", "교실을 정리해요."],
      ["clean", "I'm all done with lunch.", "점심 다 먹었어요."],
      ["clean", "Please line up at the door.", "문 앞에 줄 서세요."],
      ["art", "Can I have the red crayon?", "빨간 크레용 줄래요?"],
      ["art", "I'm drawing a big house.", "큰 집을 그리고 있어요."],
      ["art", "Please pass me the glue.", "풀 좀 건네주세요."],
      ["art", "I made a card for Mom.", "엄마 드릴 카드를 만들었어요."],
      ["snack", "Can I have some more, please?", "조금 더 먹어도 돼요?"],
      ["snack", "I want apple juice, please.", "사과 주스 주세요."],
      ["snack", "Thank you for the snack.", "간식 고맙습니다."],
      ["snack", "Please open my milk carton.", "우유갑 좀 열어 주세요."],
      ["care", "Wash your hands with soap.", "비누로 손을 씻어요."],
      ["care", "I need to go potty.", "쉬하러 가야 해요."],
      ["care", "Don't forget to flush.", "물 내리는 거 잊지 마."],
      ["me", "I am five years old.", "나는 다섯 살이에요."],
      ["me", "I have a little brother.", "나는 남동생이 있어요."],
      ["me", "My favorite color is blue.", "내가 제일 좋아하는 색은 파란색이에요."],
      ["me", "I live with my family.", "나는 가족과 함께 살아요."],
      ["sorry", "Sorry, I bumped into you.", "미안, 너랑 부딪쳤어."],
      ["sorry", "I didn't mean to.", "일부러 그런 거 아니야."],
      ["thanks", "Thank you for helping me.", "도와줘서 고마워."],
      ["thanks", "Thank you for sharing with me.", "나랑 나눠 줘서 고마워."],
      ["pattern", "I see a red bird.", "빨간 새가 보여요."],
      ["pattern", "I see a yellow duck.", "노란 오리가 보여요."],
      ["pattern", "Look at the big dog.", "큰 강아지를 봐요."],
      ["pattern", "The cat is very little.", "고양이는 아주 작아요."],
      ["pattern", "I like to paint pictures.", "나는 그림 그리는 게 좋아요."],
      ["pattern", "We can run and jump.", "우리는 달리고 뛸 수 있어요."],
      ["pattern", "Here is my blue cup.", "여기 내 파란 컵이 있어요."],
      ["pattern", "I see three green frogs.", "초록 개구리 세 마리가 보여요."],
      ["pattern", "This is a red square.", "이건 빨간 네모예요."],
      ["pattern", "It is a big triangle.", "그건 큰 세모예요."],
      ["pattern", "The fish can swim fast.", "물고기는 빨리 헤엄칠 수 있어요."],
      ["pattern", "My dog is big and brown.", "우리 강아지는 크고 갈색이에요."],
      ["song", "How I wonder what you are.", "네가 무엇인지 정말 궁금해."],
      ["song", "Up above the world so high.", "세상 위 저 높은 곳에."],
      ["song", "Like a diamond in the sky.", "하늘의 다이아몬드처럼."],
      ["song", "Row, row, row your boat.", "저어라, 저어라, 배를 저어라."],
      ["song", "Life is but a dream.", "인생은 꿈일 뿐이에요."],
      ["song", "One, two, buckle my shoe.", "하나, 둘, 신발 버클을 채워요."],
      ["song", "Three, four, shut the door.", "셋, 넷, 문을 닫아요."],
      ["song", "Five, six, pick up sticks.", "다섯, 여섯, 나뭇가지를 주워요."],
      ["song", "Humpty Dumpty sat on a wall.", "험프티 덤프티가 담장 위에 앉았어요."],
      ["song", "Mary had a little lamb.", "메리에게 어린 양이 있었어요."],
      ["song", "Its fleece was white as snow.", "양털은 눈처럼 하얬어요."],
      ["song", "London Bridge is falling down.", "런던 다리가 무너져요."],
      ["song", "The cow jumped over the moon.", "소가 달을 뛰어넘었어요."],
      ["song", "And washed the spider out.", "그리고 거미를 쓸어 내렸어요."],
      ["bye", "See you tomorrow, my friend!", "친구야, 내일 봐!"],
      ["bye", "Have a nice day, teacher!", "선생님, 좋은 하루 보내세요!"],
      ["bye", "Don't forget your backpack!", "가방 잊지 마!"],
      ["q", "Where do I put this?", "이거 어디에 둬요?"],
      ["q", "What are you making today?", "오늘 뭐 만들어?"],
      ["q", "Who wants to go first?", "누가 먼저 할래요?"],
      ["q", "Is it time to go home?", "집에 갈 시간이에요?"]
    ],
    4: [
      ["morning", "Good morning, I am happy to see you.", "좋은 아침이에요, 만나서 기뻐요."],
      ["circle", "Today is Monday and it is very sunny.", "오늘은 월요일이고 아주 맑아요."],
      ["circle", "It's cold outside, so wear your coat.", "밖이 추우니까 외투를 입어요."],
      ["ask", "Can I have a turn when you finish?", "너 다 하면 나도 해도 돼?"],
      ["ask", "Can you help me zip my jacket, please?", "외투 지퍼 올리는 것 좀 도와주실래요?"],
      ["ask", "May I please have a glass of water?", "물 한 잔 마셔도 될까요?"],
      ["feel", "I don't like that, please stop.", "그거 싫어, 그만해 줘."],
      ["feel", "I feel happy because I made a friend.", "친구를 사귀어서 기뻐요."],
      ["feel", "I'm scared of the big dog.", "큰 개가 무서워요."],
      ["share", "Can I play with you and your friends?", "너랑 네 친구들이랑 같이 놀아도 돼?"],
      ["share", "Let's take turns on the red bike.", "빨간 자전거 차례대로 타자."],
      ["share", "You can use my crayons if you want.", "원하면 내 크레용 써도 돼."],
      ["play", "Let's play hide and seek outside.", "밖에서 숨바꼭질하자."],
      ["play", "I can go across the monkey bars.", "나는 구름사다리를 건널 수 있어."],
      ["play", "Can we play outside after snack time?", "간식 먹고 밖에서 놀아도 돼요?"],
      ["clean", "Please put the blocks back on the shelf.", "블록을 선반에 다시 놓아 주세요."],
      ["clean", "Let's clean up before we go outside.", "밖에 나가기 전에 정리해요."],
      ["art", "I am painting a picture for my mom.", "엄마께 드릴 그림을 그리고 있어요."],
      ["art", "Can I use the scissors and the glue?", "가위랑 풀 써도 돼요?"],
      ["snack", "Can I have a little more apple, please?", "사과 조금 더 먹어도 돼요?"],
      ["snack", "I like crackers and cheese for snack.", "간식으로 크래커랑 치즈가 좋아요."],
      ["care", "Wash your hands before you eat your snack.", "간식 먹기 전에 손을 씻어요."],
      ["care", "Cover your mouth when you cough or sneeze.", "기침이나 재채기할 땐 입을 가려요."],
      ["me", "I live with my mom, dad, and brother.", "나는 엄마, 아빠, 형제와 함께 살아요."],
      ["sorry", "Sorry, I did not mean to push you.", "미안, 일부러 민 거 아니야."],
      ["thanks", "Thank you for playing with me today.", "오늘 같이 놀아 줘서 고마워."],
      ["song", "Baa, baa, black sheep, have you any wool?", "매, 매, 검은 양아, 양털 있니?"],
      ["song", "Yes, sir, yes, sir, three bags full.", "네, 네, 세 자루 가득 있어요."],
      ["song", "Jack and Jill went up the hill.", "잭과 질이 언덕을 올라갔어요."],
      ["bye", "I had so much fun at school today.", "오늘 학교에서 정말 재미있었어요."],
      ["q", "What do you want to play today?", "오늘 뭐 하고 놀고 싶어?"],
      ["q", "Where should I put my wet coat?", "젖은 외투는 어디에 둬요?"]
    ],
    5: [
      ["morning", "How are you today? I'm happy!", "오늘 기분 어때? 기뻐요!"],
      ["circle", "What day is it today? It's Monday.", "오늘 무슨 요일이에요? 월요일이에요."],
      ["circle", "How's the weather today? It's sunny.", "오늘 날씨 어때요? 맑아요."],
      ["circle", "Is it raining outside? Yes, it is.", "밖에 비 와요? 네, 와요."],
      ["circle", "Can you count to ten? Yes, I can!", "열까지 셀 수 있어? 응, 할 수 있어!"],
      ["me", "How old are you? I'm five.", "몇 살이에요? 다섯 살이에요."],
      ["me", "What's your favorite color? I like green.", "제일 좋아하는 색이 뭐야? 초록색이 좋아."],
      ["me", "Who is picking you up? My dad is.", "누가 데리러 와? 우리 아빠가."],
      ["share", "Can I have a turn? Sure, here you go.", "나도 해도 돼? 그럼, 여기 있어."],
      ["share", "Can I play with you? Yes, come on!", "같이 놀아도 돼? 응, 어서 와!"],
      ["share", "Whose turn is it? It's my turn.", "누구 차례야? 내 차례야."],
      ["sorry", "Are you okay? Yes, I'm okay.", "괜찮아? 응, 괜찮아."],
      ["ask", "Do you need help? Yes, please.", "도와줄까? 네, 도와주세요."],
      ["ask", "May I go to the bathroom? Yes, you may.", "화장실 가도 돼요? 그래, 다녀오렴."],
      ["ask", "Can you help me? Of course I can.", "도와줄래? 물론이지."],
      ["pattern", "What color is this? It's purple.", "이건 무슨 색이에요? 보라색이에요."],
      ["pattern", "How many apples? There are three.", "사과가 몇 개예요? 세 개예요."],
      ["pattern", "What shape is this? It's a circle.", "이건 무슨 모양이에요? 동그라미예요."],
      ["pattern", "What do you see? I see a red bird.", "뭐가 보여요? 빨간 새가 보여요."],
      ["pattern", "What animal is this? It's a lion.", "이건 무슨 동물이에요? 사자예요."],
      ["art", "What are you making? I'm making a robot.", "뭐 만들어? 로봇 만들고 있어."],
      ["art", "Do you like to paint? Yes, I love it!", "그림 그리는 거 좋아해? 응, 정말 좋아!"],
      ["q", "Who wants to be first? Me, please!", "누가 먼저 할래요? 저요!"],
      ["clean", "Is it clean up time? Yes, let's clean up.", "정리 시간이에요? 응, 정리하자."],
      ["clean", "Where is your backpack? It's in my cubby.", "가방 어디 있어? 내 사물함에 있어."],
      ["care", "Did you wash your hands? Yes, I did.", "손 씻었어? 응, 씻었어."],
      ["snack", "Do you want some milk? No, thank you.", "우유 마실래? 아니요, 괜찮아요."],
      ["snack", "Is your tummy full? Yes, I'm full.", "배불러? 응, 배불러."],
      ["snack", "What did you eat for lunch? I ate rice.", "점심에 뭐 먹었어? 밥 먹었어."],
      ["play", "Where are you going? I'm going outside.", "어디 가? 밖에 가."],
      ["play", "Are you ready? Yes, I'm ready!", "준비됐어? 응, 준비됐어!"],
      ["feel", "What's wrong? I lost my mitten.", "무슨 일이야? 벙어리장갑을 잃어버렸어."],
      ["feel", "Why are you sad? I miss my mom.", "왜 슬퍼? 엄마가 보고 싶어."]
    ],
    6: [
      ["sorry", "I'm sorry. Are you okay?", "미안해. 괜찮아?"],
      ["sorry", "That's okay. I'm fine.", "괜찮아. 나 괜찮아."],
      ["clean", "Clean up time! Put the toys away.", "정리 시간이에요! 장난감을 치워요."],
      ["clean", "Line up, please. It's time for lunch.", "줄 서세요. 점심시간이에요."],
      ["play", "Look at me! I can hop on one foot.", "나 좀 봐! 한 발로 뛸 수 있어."],
      ["play", "Push me, please. I want to go high!", "밀어 줘. 높이 올라가고 싶어!"],
      ["art", "I did it! I wrote my name.", "해냈어! 내 이름을 썼어."],
      ["art", "Here is my picture. It's a big rainbow.", "여기 내 그림이야. 커다란 무지개야."],
      ["share", "Let's share. You can have half.", "나눠 먹자. 반 줄게."],
      ["share", "Can I have a turn? I'll wait.", "나도 해도 돼? 기다릴게."],
      ["care", "Wash your hands. Use lots of soap.", "손을 씻어요. 비누를 듬뿍 써요."],
      ["clean", "I'm all done. Can I go play?", "다 했어요. 놀러 가도 돼요?"],
      ["circle", "It's raining. We can't go outside.", "비가 와요. 밖에 못 나가요."],
      ["snack", "Thank you for the snack. It was yummy!", "간식 고맙습니다. 맛있었어요!"],
      ["feel", "Please stop. I don't like that.", "그만해. 그거 싫어."],
      ["feel", "I feel tired. Can I rest a little?", "피곤해요. 조금 쉬어도 돼요?"],
      ["feel", "Use your words. Tell me how you feel.", "말로 해 보자. 기분이 어떤지 말해 줘."],
      ["morning", "Good morning, teacher! I'm here.", "선생님, 좋은 아침이에요! 저 왔어요."],
      ["bye", "Bye-bye, friends! See you tomorrow.", "친구들, 안녕! 내일 봐."],
      ["ask", "My shoe is untied. Can you help me?", "신발 끈이 풀렸어요. 도와주실래요?"],
      ["me", "It's my birthday today. I'm six!", "오늘 내 생일이야. 여섯 살이 됐어!"],
      ["circle", "Let's sing a song. Everybody clap!", "노래 부르자. 모두 손뼉 쳐요!"],
      ["circle", "Be gentle with the bunny. It's very small.", "토끼를 살살 만져요. 아주 작거든요."],
      ["circle", "Walking feet, please. No running inside.", "걸어서 다녀요. 교실에서는 뛰지 않아요."],
      ["play", "I found a bug! Come and look.", "벌레 찾았어! 와서 봐."]
    ],
    7: [
      ["share", "Can I play with you? Sure! You can be the doctor.", "같이 놀아도 돼? 그럼! 네가 의사 해."],
      ["sorry", "Are you okay? I fell down. Let me get the teacher.", "괜찮아? 넘어졌어. 선생님 모셔 올게."],
      ["share", "Whose turn is it? It's my turn. Okay, you go first.", "누구 차례야? 내 차례야. 좋아, 너 먼저 해."],
      ["snack", "May I have more crackers? Yes, you may. Thank you!", "크래커 더 먹어도 돼요? 그래, 먹으렴. 고맙습니다!"],
      ["share", "What are you building? A tall tower. Can I help?", "뭐 만들어? 높은 탑. 나도 도와줘도 돼?"],
      ["sorry", "I'm sorry I took your block. That's okay. Let's build together.", "네 블록 가져가서 미안해. 괜찮아. 같이 쌓자."],
      ["morning", "Good morning! How are you? I'm great, thanks!", "좋은 아침! 잘 지내? 아주 좋아, 고마워!"],
      ["clean", "It's clean up time. Can you help me? Sure, I'll get the blocks.", "정리 시간이야. 도와줄래? 그럼, 내가 블록 치울게."],
      ["circle", "What's the weather today? It's snowing! Let's wear our mittens.", "오늘 날씨 어때요? 눈이 와요! 벙어리장갑 끼자."],
      ["care", "Did you wash your hands? Not yet. Go wash them, please.", "손 씻었니? 아직요. 가서 씻고 오렴."],
      ["art", "I need the blue crayon. Here you go. Thank you so much!", "파란 크레용이 필요해. 여기 있어. 정말 고마워!"],
      ["circle", "Who wants to feed the fish? Me, please! Okay, just a little bit.", "누가 물고기 밥 줄래요? 저요! 좋아, 조금만 주렴."],
      ["art", "Look at my picture. Wow, what is it? It's my family.", "내 그림 봐. 와, 이게 뭐야? 우리 가족이야."],
      ["snack", "I can't open my milk. Let me help you. There you go!", "우유를 못 열겠어요. 도와줄게. 자, 됐다!"],
      ["circle", "What day is it today? It's Friday. Yay, it's pizza day!", "오늘 무슨 요일이에요? 금요일이에요. 야호, 피자 먹는 날이다!"],
      ["play", "Do you want to swing? Yes! Can you push me?", "그네 탈래? 응! 밀어 줄래?"],
      ["feel", "Why are you crying? He took my toy. Let's go talk to him.", "왜 울어? 걔가 내 장난감을 가져갔어. 같이 가서 말해 보자."],
      ["share", "Can I sit here? Yes, you can. Thanks, friend!", "여기 앉아도 돼? 응, 앉아. 고마워, 친구야!"],
      ["bye", "Time to go home. Get your backpack. See you tomorrow!", "집에 갈 시간이에요. 가방 챙겨요. 내일 봐요!"],
      ["q", "Is it my turn yet? Not yet. You are next!", "아직 내 차례 아니야? 아직이야. 네가 다음이야!"],
      ["art", "What did you make? I made a paper hat. It looks so cool!", "뭐 만들었어? 종이 모자 만들었어. 정말 멋지다!"],
      ["pattern", "Let's count the apples. One, two, three. There are three apples!", "사과를 세어 보자. 하나, 둘, 셋. 사과가 세 개야!"]
    ],
    8: [
      ["play", "Can I have a turn on the slide? Sure, after me. Okay, I'll wait. Thank you!", "나도 미끄럼틀 타도 돼? 그럼, 나 다음에. 알았어, 기다릴게. 고마워!"],
      ["morning", "Good morning, class! Good morning, teacher! What day is it today? It's Monday!", "여러분, 좋은 아침! 선생님, 좋은 아침이에요! 오늘 무슨 요일이죠? 월요일이에요!"],
      ["feel", "I don't feel good. My tummy hurts. Let's go see the nurse. Okay, thank you.", "몸이 안 좋아요. 배가 아파요. 보건 선생님께 가 보자. 네, 고마워요."],
      ["share", "Let's play house. I'll be the mom. You can be the baby. Okay, let's play!", "소꿉놀이하자. 내가 엄마 할게. 너는 아기 해. 좋아, 놀자!"],
      ["sorry", "Who took my crayon? I'm sorry, I did. Here you go. Thanks for giving it back.", "누가 내 크레용 가져갔어? 미안, 내가 그랬어. 여기 있어. 돌려줘서 고마워."],
      ["snack", "It's snack time! What do we have? We have apples and crackers. Yummy!", "간식 시간이에요! 뭐가 있어요? 사과랑 크래커가 있어요. 맛있겠다!"],
      ["ask", "Can you help me zip my coat? Sure, hold still. There you go. Thank you, teacher!", "외투 지퍼 올리는 것 좀 도와주실래요? 그래, 가만히 있어. 다 됐다. 고맙습니다, 선생님!"],
      ["play", "Look, it's snowing! Can we go outside? Put on your boots first. Yay, let's go!", "봐, 눈이 와! 밖에 나가도 돼요? 장화부터 신으렴. 야호, 가자!"],
      ["art", "What are you drawing? I'm drawing a dinosaur. It has big teeth. Wow, that's so cool!", "뭐 그려? 공룡 그리고 있어. 이빨이 커. 와, 정말 멋지다!"],
      ["clean", "Clean up time, everybody! Where do the blocks go? They go on the shelf. Good job!", "모두 정리 시간이에요! 블록은 어디에 둬요? 선반에 둬요. 잘했어요!"],
      ["feel", "Are you sad? Yes, I miss my mom. She will come after nap. Okay, I feel better.", "슬프니? 네, 엄마가 보고 싶어요. 낮잠 자고 나면 오실 거야. 네, 기분이 나아졌어요."],
      ["share", "Do you want to be my friend? Yes, I do! Let's play on the swings. Okay, race you there!", "내 친구 할래? 응, 좋아! 그네 타러 가자. 좋아, 누가 먼저 가나 시합하자!"],
      ["circle", "Let's read a book together. Which one? The one about the bear. I love that one!", "같이 책 읽자. 어떤 거? 곰 나오는 책. 나 그거 정말 좋아!"],
      ["circle", "Is it raining outside? Yes, it is. We can play inside today. Let's build a fort!", "밖에 비 와요? 응, 와. 오늘은 안에서 놀자. 요새를 만들자!"],
      ["q", "I can't find my shoe. Did you look in your cubby? Oh, here it is! Thank you!", "신발을 못 찾겠어요. 사물함 봤니? 아, 여기 있다! 고맙습니다!"],
      ["bye", "How was school today? It was fun. I painted a rainbow. Can I see it?", "오늘 학교 어땠어? 재미있었어. 무지개를 그렸어. 보여 줄래?"],
      ["art", "Please pass the paper. Here you go. What are you making? I'm making a card for Grandma.", "종이 좀 건네줘. 여기 있어. 뭐 만들어? 할머니 드릴 카드 만들어."],
      ["clean", "Line up, please. Where are we going? We are going to the library. I love the library!", "줄 서세요. 어디 가요? 도서관에 가요. 나 도서관 정말 좋아!"]
    ]
  };
  const sentences = [];
  Object.keys(CONVERSATION).forEach(function (level) {
    CONVERSATION[level].forEach(function (item) {
      const tag = SITUATIONS[item[0]];
      sentences.push({ text: item[1], meaning: item[2], level: Number(level), situation: item[0], tag: tag, emoji: tag.split(" ")[0] });
    });
  });
  const LEVEL_NAMES = ["", "한두 마디", "짧은 말", "조금 긴 말", "긴 말", "묻고 답하기", "두 마디 대화", "세 마디 대화", "긴 대화"];
  const MAX_LEVEL = 8;
  // 한 번에 맞힌 문장이 이만큼 쌓이면 다음 단계로 올라간다.
  const PASSES_TO_LEVEL_UP = 30;
  // 2단계 이상에서 새 단계 문장을 낼 확률. 나머지는 아래 단계 복습.
  const FOCUS_SHARE = 0.75;

  // 숫자·줄임말·소유격·하이픈은 문장과 인식 결과 양쪽에서 똑같이 풀어 쓴다.
  // "2"="two", "it's"="it is", "Dad's"="dad", "ice-cream"="ice cream".
  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function numberWords(digits) {
    if (digits === "100") return "one hundred";
    if (!/^\d{1,2}$/.test(digits)) return digits;
    const n = Number(digits);
    if (n <= 20) return NUMBER_WORDS[n];
    return TENS_WORDS[Math.floor(n / 10)] + (n % 10 ? " " + NUMBER_WORDS[n % 10] : "");
  }
  const CONTRACTIONS = [
    [/\bi'm\b/g, "i am"], [/\b(you|we|they)'re\b/g, "$1 are"],
    [/\b(it|he|she|that|what|where|who|there|here|how)'s\b/g, "$1 is"], [/\blet's\b/g, "let us"],
    [/\bcan't\b/g, "cannot"], [/\bwon't\b/g, "will not"], [/\b([a-z]+)n't\b/g, "$1 not"],
    [/\b(i|you|we|they|he|she|it)'ll\b/g, "$1 will"], [/\b(i|you|we|they)'ve\b/g, "$1 have"],
    [/\b(i|you|we|they|he|she)'d\b/g, "$1 would"]
  ];
  function normalize(text) {
    let t = String(text || "").toLowerCase().replace(/[’‘`´]/g, "'");
    CONTRACTIONS.forEach(function (rule) { t = t.replace(rule[0], rule[1]); });
    return t.replace(/\bcan not\b/g, "cannot")
      .replace(/([a-z])'s\b/g, "$1").replace(/s'(?![a-z])/g, "s").replace(/'/g, "")
      .replace(/(\d),(\d)/g, "$1$2").replace(/[^a-z0-9\s]/g, " ")
      .replace(/\d+/g, function (digits) { return " " + numberWords(digits) + " "; })
      .trim().replace(/\s+/g, " ");
  }
  // Recognizer tolerance for a Korean first grader: homophones and the
  // near-misses Safari/Chrome actually return for a correctly read word
  // (r/l, the "ir" vowel, final consonants). Reviewed by Claude 2026-09-06.
  // Keep the lists tight: an alias must sound like the word when read right.
  const PHRASES = [["to get her", "together"], ["to gather", "together"], ["o pen", "open"], ["a pples", "apples"], ["birth day", "birthday"], ["bird day", "birthday"]];
  const ALIASES = {
    i: ["eye", "ai"],
    like: ["light", "lik", "liked", "lie"],
    apples: ["apple", "apple's", "apples'", "appears"],
    see: ["sea", "c", "si"],
    a: ["uh", "ah", "er"],
    cat: ["cut", "cats", "kat", "cap", "cad"],
    this: ["these", "dis", "tis", "disc"],
    is: ["it's", "iz", "his", "ease"],
    my: ["mai", "ma", "mi"],
    book: ["books", "buck", "boo", "booked"],
    can: ["ken", "kan", "cans", "cam"],
    run: ["ran", "rum", "lun", "wren", "runs"],
    the: ["da", "de", "duh", "za"],
    sun: ["son", "sung", "sum", "san", "sunny"],
    bright: ["bride", "right", "brite", "blight", "brights", "bry", "brought"],
    milk: ["mill", "milks", "meal", "milc", "mick"],
    family: ["families", "family's", "femily", "fam"],
    have: ["has", "had", "hab", "hev", "hef"],
    dog: ["dogs", "dock", "doug", "doc", "dawg"],
    bird: ["board", "bard", "bored", "boy", "burd", "birds", "bert", "bud", "bod", "birth", "bird's", "beard", "bad"],
    fly: ["fry", "flies", "flai", "fli", "flight", "fright"],
    am: ["um", "im", "em", "an"],
    happy: ["heppy", "happi", "harpy", "hoppy", "hippie"],
    red: ["read", "rad", "wed", "led", "lead", "reed"],
    flower: ["flour", "flowers", "frower", "flow", "flauer", "flower's"],
    we: ["wee", "v", "oui", "wi"],
    play: ["pray", "played", "plays", "pley", "plate", "pay"],
    together: ["togeder", "togather", "to-gether", "tugether"],
    wash: ["watch", "washed", "wosh", "was", "wish"],
    hands: ["hand", "hens", "hans", "hands'", "hand's", "heads"],
    please: ["police", "plies", "pleas", "plis", "pleased", "prease"],
    open: ["oven", "opened", "opens", "opan"],
    door: ["doors", "dor", "dough", "doer", "dow"],
    thank: ["tank", "sank", "thanks", "thang", "tanks", "sanks"],
    you: ["u", "yu", "ewe", "yoo"],
    very: ["berry", "bury", "vary", "belly", "vely", "beri", "ferry"],
    much: ["march", "mush", "match", "mach", "mutch", "munch"],
    love: ["lov", "lub", "rob", "luv", "loves", "lof", "laugh", "lav", "rove"],
    big: ["bic", "bee", "beg", "pig", "bigger"],
    ball: ["bowl", "balls", "bal", "bull"],
    jump: ["jumps", "jam", "jumped", "champ"],
    swim: ["swing", "swims", "swin", "sweem"],
    small: ["smol", "smile", "smaller", "mall"],
    bananas: ["banana", "banana's", "bananas'", "bananers"],
    mom: ["mum", "mam", "mommy", "mama", "mon"],
    dad: ["daddy", "dead", "dat", "that", "papa"],
    bag: ["beg", "back", "bags", "bug"],
    pen: ["pan", "pain", "pens", "pin"],
    one: ["1", "won"],
    jaei: ["jay", "jae", "jey", "jaye", "jayi", "j"],
    taeo: ["tao", "tayo", "teo", "tae", "tail", "taylor", "theo"],
    jay: ["jaei", "jae", "jey", "jaye", "jayi", "j"],
    teo: ["taeo", "tao", "tayo", "tae", "tail", "taylor", "theo"],
    five: ["5"],
    too: ["to", "two", "2"],
    two: ["to", "too", "tu", "2"],
    cats: ["cat", "cat's", "cuts", "kats"],
    three: ["tree", "free", "3", "sree", "thee"],
    birds: ["bird", "boards", "bards", "bird's", "birth", "boys"],
    sky: ["skye", "ski", "skai", "sky's"],
    blue: ["blew", "bloo", "blu", "boo"],
    grass: ["glass", "gras", "grasp", "grace"],
    green: ["grin", "gleen", "greene", "grean"],
    apple: ["apples", "appel", "apple's", "abble"],
    moon: ["mon", "moons", "mun", "moo"],
    round: ["lound", "around", "rounds", "roun"],
    star: ["stars", "stir", "sta", "start"],
    good: ["could", "god", "goo", "gut", "goods"],
    morning: ["mourning", "moning", "mornin", "mooning"],
    night: ["knight", "nite", "nigh", "nights"],
    girl: ["gull", "girls", "curl", "gel", "gill"],
    are: ["r", "ah", "ar", "our"],
    friend: ["friends", "frend", "fren", "trend", "print"],
    it: ["eat", "et", "eet", "its"],
    fish: ["fishes", "fis", "feesh", "fresh"],
    sing: ["seeing", "sink", "sings", "seen", "sin"],
    song: ["sung", "songs", "son", "sang"],
    high: ["hi", "hai", "hide", "hy"],
    go: ["goal", "gah", "goes", "gold"],
    home: ["hom", "hum", "homes", "hall"],
    to: ["too", "two", "tu", "do"],
    school: ["skool", "scool", "schools", "cool", "school's"],
    bus: ["boss", "buzz", "buss", "bass", "us"],
    yellow: ["yello", "hello", "yellows", "jello"],
    pink: ["ping", "pinky", "think", "pinks"],
    hat: ["had", "hut", "hats", "hot", "at"],
    eat: ["it", "eet", "eats", "heat", "eight"],
    an: ["and", "en", "un", "on"],
    egg: ["eggs", "ag", "eg", "egg's", "x"],
    drink: ["dring", "drinks", "think", "drank", "drinc"],
    water: ["wader", "waters", "wata", "warder", "wooder"],
    ice: ["eyes", "ais", "i's", "is"],
    cream: ["crim", "dream", "creams", "cleam", "scream"],
    rabbit: ["rabbits", "robert", "rabit", "rabbit's", "rapid"],
    white: ["why", "wide", "wight", "wine", "wait"],
    pig: ["peak", "pick", "pic", "pigs", "big"],
    frog: ["frogs", "flog", "fog", "frock", "frog's"],
    hot: ["hut", "hat", "hop", "hott"],
    cold: ["called", "code", "gold", "cord", "colt", "coal"],
    cup: ["cap", "cop", "cups", "cub", "cut"],
    sit: ["seat", "set", "sits", "seed", "shit"],
    down: ["dawn", "dow", "town", "don"],
    come: ["cam", "calm", "comes", "cum", "kam"],
    here: ["hear", "hair", "her", "he", "hia"],
    seven: ["seventh", "sever", "sebben", "7", "heaven"],
    birthday: ["birth day", "bursday", "birthdays", "birthday's", "bird day"],
    soon: ["sun", "soo", "son", "spoon", "sune"],
    // 2026-11-15 검수: 인식기가 맞게 읽은 말을 다른 글자로 적는 경우(구글 인식은 okay 를 "OK" 로 적는다).
    // "whois"·"youare"·"itis" 는 who's·you're·it's 가 풀어 쓰인 뒤 두 토큰을 이어 붙인 모양이다.
    okay: ["ok"],
    whose: ["whois"],
    your: ["youare"],
    its: ["itis"],
    baa: ["bah", "ba", "baah", "baaa"],
    // 두 단어 "baa baa" 를 인식기가 한 단어로 붙여 적은 모양(실측 "baba black sheep").
    baabaa: ["baba", "bahbah"],
    // 실측(높인 목소리 합성): "Out came the sun" → "ouch came the sun".
    out: ["ouch"],
    yummy: ["yumme", "yummie"]
  };
  function heardTokens(heard) {
    let text = normalize(heard);
    PHRASES.forEach(function (pair) { text = text.split(pair[0]).join(pair[1]); });
    return text ? text.split(" ") : [];
  }
  function lookup() { return Object.create(null); }
  // ALIASES is keyed by the sentence word; compare against normalised heard tokens.
  const ALIAS_LOOKUP = lookup();
  Object.keys(ALIASES).forEach(function (word) {
    const set = ALIAS_LOOKUP[word] = lookup();
    ALIASES[word].forEach(function (alias) {
      const token = normalize(alias);
      if (token && token !== word && token.indexOf(" ") < 0) set[token] = true;
    });
  });
  ALIAS_LOOKUP.cannot = ALIAS_LOOKUP.cannot || lookup();
  ["cant", "canot", "cannon"].forEach(function (token) { ALIAS_LOOKUP.cannot[token] = true; });
  // 같은 소리 다른 글자: 인식기는 어느 쪽 글자로든 적을 수 있다 (양방향).
  const HOMOPHONES = [["to", "two", "too"], ["there", "their"], ["for", "four"], ["i", "eye"], ["see", "sea"],
    ["ate", "eight"], ["son", "sun"], ["hear", "here"], ["know", "no"], ["right", "write"], ["by", "buy", "bye"],
    ["one", "won"], ["new", "knew"], ["blue", "blew"], ["red", "read"], ["night", "knight"], ["wood", "would"],
    ["be", "bee"], ["meet", "meat"], ["flower", "flour"], ["tail", "tale"], ["whole", "hole"], ["pear", "pair"],
    ["high", "hi"], ["week", "weak"], ["road", "rode"], ["our", "hour"], ["dear", "deer"], ["bear", "bare"],
    ["sail", "sale"], ["wait", "weight"], ["made", "maid"], ["not", "knot"], ["way", "weigh"], ["peace", "piece"],
    ["plane", "plain"], ["break", "brake"], ["ant", "aunt"], ["toe", "tow"], ["sent", "cent", "scent"], ["hair", "hare"]];
  const HOMOPHONE_LOOKUP = lookup();
  HOMOPHONES.forEach(function (group) {
    group.forEach(function (word) {
      const set = HOMOPHONE_LOOKUP[word] = HOMOPHONE_LOOKUP[word] || lookup();
      group.forEach(function (other) { if (other !== word) set[other] = true; });
    });
  });
  // 문장이 다섯 단어 이상이면 빠뜨린 a/an/the 는 실수로 세지 않는다 (빠짐만, 바꿔 읽기·추가는 그대로 센다).
  const FREE_MISSING = { a: true, an: true, the: true };
  const FREE_MISSING_MIN_WORDS = 5;
  const LEAD_FREE_MIN_WORDS = 4, LEAD_COST = 0.001, COST_EPS = 0.01;
  // 아이가 생각하며 내는 소리. 인식기가 글자로 적어도 추가 단어로 세지 않는다.
  const FILLERS = { um: true, umm: true, uh: true, uhm: true, hmm: true, erm: true, mm: true };
  // 소리 비슷한 단어 허용(phonetic fallback)은 내용어에만 쓴다. 짧은 기능어끼리 섞이면 문장이 달라진다.
  const FUNCTION_WORDS = {};
  ("a an the is am are was were be i you he she it we they my your his her our their me him us them this that these those " +
    "to in on at of for with and or but so not no yes do does did can will what where who how when why here there have has had")
    .split(" ").forEach(function (word) { FUNCTION_WORDS[word] = true; });
  const PHONETIC_MIN_LETTERS = 4;
  // Korean-accent-aware consonant skeleton: b/p/f/v, d/t, g/k/c/q, l/r, s/z/sh, j/ch/z merge;
  // vowels after the first letter drop out ("seed"="seat", "hare"="hair", "fish"="pish").
  const keyCache = lookup();
  function phoneticKey(word) {
    if (keyCache[word] !== undefined) return keyCache[word];
    let w = word.replace(/[^a-z]/g, "");
    if (w.length > 3) w = w.replace(/s$/, "");
    w = w.replace(/^kn/, "n").replace(/^wr/, "r").replace(/^wh/, "w")
      .replace(/ph/g, "f").replace(/gh/g, "").replace(/ck/g, "k").replace(/th/g, "t").replace(/sh/g, "s")
      .replace(/ch|dg|j|z/g, "j").replace(/c(?=[eiy])/g, "s").replace(/x/g, "ks")
      .replace(/[bpfv]/g, "p").replace(/[dt]/g, "t").replace(/[gkcq]/g, "k").replace(/[lr]/g, "l");
    const first = /[aeiouy]/.test(w.charAt(0)) ? "a" : w.charAt(0);
    const key = (first + w.slice(1).replace(/[aeiouyhw]/g, "")).replace(/(.)\1+/g, "$1");
    keyCache[word] = key;
    return key;
  }
  function editDistanceAtMostOne(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }
  function soundsAlike(expected, got) {
    if (FUNCTION_WORDS[expected]) return false;
    // One noun, plural or possessive: "dad's"→"dads", "apple"/"apples", "box"/"boxes".
    if (expected.length >= 3 && (got === expected + "s" || expected === got + "s" || got === expected + "es" || expected === got + "es")) return true;
    if (expected.length < PHONETIC_MIN_LETTERS || got.length < 3) return false;
    if (got.length >= PHONETIC_MIN_LETTERS && editDistanceAtMostOne(expected, got)) return true;
    const key = phoneticKey(expected);
    return key.length >= 2 && key === phoneticKey(got);
  }
  // Exact, alias or homophone only (no sound-alike). Used when words are split or joined.
  function listedSame(expected, got) {
    if (expected === got) return true;
    const alias = ALIAS_LOOKUP[expected], homophone = HOMOPHONE_LOOKUP[expected];
    return !!(alias && alias[got]) || !!(homophone && homophone[got]);
  }
  const sameCache = new Map();
  function sameWord(expected, got) {
    if (expected === got) return true;
    if (!expected || !got) return false;
    const cacheKey = expected + "|" + got;
    let hit = sameCache.get(cacheKey);
    if (hit === undefined) {
      hit = listedSame(expected, got) || soundsAlike(expected, got);
      if (sameCache.size > 20000) sameCache.clear();
      sameCache.set(cacheKey, hit);
    }
    return hit;
  }
  // One heard token for two sentence words: "its"=it is, "dont"=do not, "icecream"=ice cream.
  function splitSame(first, second, got) {
    if (listedSame(first + second, got)) return true;
    if (second === "is" && got === first + "s") return true;
    if (second === "not" && got === first + "nt") return true;
    if (second === "are" && got === first + "re") return true;
    if ((first === "who" && second === "is" && got === "whose") || (first === "you" && second === "are" && got === "your")) return true;
    if (second === "will" && got === first + "ll" && first !== "i") return true;
    if (second === "have" && got === first + "ve") return true;
    return (first === "i" && second === "am" && got === "im") || (first === "let" && second === "us" && got === "lets");
  }
  // 긴 문장(7·8단계 등)은 인식기가 한두 단어를 잘못 듣거나 빼먹어도 통과시킨다.
  // 10단어 이하는 예전처럼 한 단어도 틀리면 안 된다 (같은 소리·비슷한 소리·빠진 a/the 는 틀린 게 아니다).
  function allowedSlips(wordCount) {
    return wordCount >= 17 ? 2 : wordCount >= 11 ? 1 : 0;
  }
  // Ordered alignment of sentence words with heard tokens (weighted edit distance).
  // cost: misread/missing/extra word = 1; a/an/the missing in 5+ word sentences, fillers,
  // and split/joined words ("birth day", "its") = 0. flags[i] = word i was heard;
  // forgiven[i] = word i was heard or is a forgiven missing function word.
  function align(words, got) {
    const n = words.length, m = got.length, INF = 1e9;
    const free = n >= FREE_MISSING_MIN_WORDS;
    const cost = [], back = [];
    for (let i = 0; i <= n; i++) { cost.push(new Array(m + 1).fill(INF)); back.push(new Array(m + 1).fill(null)); }
    cost[0][0] = 0;
    function relax(i, j, value, from, kind) {
      if (value < cost[i][j]) { cost[i][j] = value; back[i][j] = [from[0], from[1], kind]; }
    }
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        const here = cost[i][j];
        if (here >= INF) continue;
        const at = [i, j];
        // 2026-11-15 실측(구글 인식, 단어마다 쉬며 읽기): 같은 녹음을 넣어도 첫 단어만 가끔 통째로 빠진다
        // ("This is my dad." → "is my dad", "Five, six, pick up sticks." → "six pick up sticks").
        // 네 단어 이상 문장은 맨 앞 한 단어가 빠진 것을 실수로 세지 않는다(빠짐만; 바꿔 읽기는 그대로 센다).
        // 비용 LEAD_COST(아주 작음): 다른 맞춤과 동점이면 원래 맞춤을 고른다(틀린 단어 표시가 바뀌지 않게).
        if (i === 0 && j === 0 && n >= LEAD_FREE_MIN_WORDS) relax(1, 0, here + LEAD_COST, at, "skip");
        if (i < n && j < m) { const same = sameWord(words[i], got[j]); relax(i + 1, j + 1, here + (same ? 0 : 1), at, same ? "ok" : "sub"); }
        if (i < n && j + 1 < m && listedSame(words[i], got[j] + got[j + 1])) relax(i + 1, j + 2, here, at, "ok");
        if (i + 1 < n && j < m && splitSame(words[i], words[i + 1], got[j])) relax(i + 2, j + 1, here, at, "ok2");
        if (i < n) { const skip = free && FREE_MISSING[words[i]]; relax(i + 1, j, here + (skip ? 0 : 1), at, skip ? "skip" : "miss"); }
        if (j < m) relax(i, j + 1, here + (FILLERS[got[j]] ? 0 : 1), at, "extra");
      }
    }
    return { cost: cost, back: back, n: n, m: m };
  }
  function alignFlags(table) {
    const flags = new Array(table.n).fill(false), forgiven = new Array(table.n).fill(false);
    let i = table.n, j = table.m;
    while (i > 0 || j > 0) {
      const step = table.back[i][j];
      if (!step) break;
      const kind = step[2];
      if (kind === "ok") { flags[i - 1] = forgiven[i - 1] = true; }
      else if (kind === "ok2") { flags[i - 1] = flags[i - 2] = forgiven[i - 1] = forgiven[i - 2] = true; }
      else if (kind === "skip") forgiven[i - 1] = true;
      i = step[0]; j = step[1];
    }
    return { flags: flags, forgiven: forgiven };
  }
  function expectedWords(expected) {
    const text = normalize(expected);
    return text ? text.split(" ") : [];
  }
  // 인식기는 "one, two, three" 를 "123", "three, four" 를 "34" 처럼 붙여 적기도 한다.
  // 두 자리 이상 숫자는 한 자리씩 읽은 것으로도 맞춰 본다(원래 읽기도 그대로 맞춰 본다).
  function digitSplit(heard) {
    const text = String(heard || "");
    return /\d{2,}/.test(text) ? text.replace(/\d{2,}/g, function (digits) { return digits.split("").join(" "); }) : null;
  }
  function matchesOne(expected, heard) {
    const words = expectedWords(expected), got = heardTokens(heard);
    if (!words.length || !got.length) return false;
    return align(words, got).cost[words.length][got.length] <= allowedSlips(words.length) + COST_EPS;
  }
  function matches(expected, heard) {
    if (matchesOne(expected, heard)) return true;
    const split = digitSplit(heard);
    return split !== null && matchesOne(expected, split);
  }
  // True while the heard words are still a valid beginning of the sentence.
  // `limit` overrides the slip budget (0 = only exact/equivalent words).
  function isPrefix(expected, heard, limit) {
    if (isPrefixOne(expected, heard, limit)) return true;
    const split = digitSplit(heard);
    return split !== null && isPrefixOne(expected, split, limit);
  }
  function isPrefixOne(expected, heard, limit) {
    const words = expectedWords(expected), got = heardTokens(heard);
    if (!got.length) return true;
    const slips = typeof limit === "number" ? limit : allowedSlips(words.length);
    const table = align(words, got);
    for (let i = 0; i <= words.length; i++) { if (table.cost[i][got.length] <= slips + COST_EPS) return true; }
    return false;
  }
  // Ordered alignment is feedback, never a partial-credit scoring rule.
  function matchedWords(expected, heard) {
    const words = expectedWords(expected), got = heardTokens(heard);
    if (!got.length) return words.map(function () { return false; });
    return alignFlags(align(words, got)).flags;
  }
  // How many sentence words one heard text covers (forgiven a/the count). Stuck protection only.
  function coveredWords(expected, heard) {
    const split = digitSplit(heard);
    return Math.max(coveredOne(expected, heard), split === null ? 0 : coveredOne(expected, split));
  }
  function coveredOne(expected, heard) {
    const words = expectedWords(expected), got = heardTokens(heard);
    if (!got.length) return 0;
    return alignFlags(align(words, got)).forgiven.filter(Boolean).length;
  }
  // The recognizer sends up to MAX_ALTERNATIVES guesses per final result. The
  // sentence passes when the first guesses match, or when swapping any single
  // result for one of its other guesses matches. Display always uses the first guess.
  const MAX_ALTERNATIVES = 5;
  function alternativeTexts(finals) {
    const base = finals.map(function (alts) { return alts[0] || ""; });
    const texts = [base.join(" ")];
    finals.forEach(function (alts, i) {
      for (let k = 1; k < alts.length; k++) {
        const copy = base.slice(); copy[i] = alts[k];
        texts.push(copy.join(" "));
      }
    });
    return texts;
  }
  // Every alternative of every result segment: all combinations when they are few,
  // otherwise single and pair swaps (first guesses first), capped for slow tablets.
  const MAX_CANDIDATES = 240;
  function candidateTexts(finals) {
    const texts = alternativeTexts(finals), seen = new Set(texts);
    function add(parts) {
      if (texts.length >= MAX_CANDIDATES) return;
      const text = parts.join(" ");
      if (!seen.has(text)) { seen.add(text); texts.push(text); }
    }
    const product = finals.reduce(function (total, alts) { return total * Math.max(1, alts.length); }, 1);
    if (product <= MAX_CANDIDATES) {
      const pick = finals.map(function () { return 0; });
      for (let c = 0; c < product; c++) {
        add(finals.map(function (alts, i) { return alts[pick[i]] || ""; }));
        for (let i = finals.length - 1; i >= 0; i--) { if (++pick[i] < finals[i].length) break; pick[i] = 0; }
      }
    } else {
      const base = finals.map(function (alts) { return alts[0] || ""; });
      for (let a = 0; a < finals.length; a++) {
        for (let b = a + 1; b < finals.length; b++) {
          for (let x = 1; x < finals[a].length; x++) {
            for (let y = 1; y < finals[b].length; y++) { const copy = base.slice(); copy[a] = finals[a][x]; copy[b] = finals[b][y]; add(copy); }
          }
        }
      }
    }
    return texts;
  }
  // 결과 조각이 앞 조각들을 그대로 다시 담고 있으면(안드로이드 크롬) 앞 조각을 버리고 새 조각만 남긴다.
  // 아이패드·컴퓨터처럼 조각이 이어지는 경우("I like" · "apples")는 그대로 둔다.
  function collapseRepeats(finals) {
    const out = [];
    finals.forEach(function (alts) {
      const head = normalize(alts[0] || "");
      const before = normalize(out.map(function (a) { return a[0]; }).join(" "));
      const last = out.length ? normalize(out[out.length - 1][0] || "") : "";
      if (before && (head === before || head.indexOf(before + " ") === 0)) out.length = 0;
      else if (last && (head === last || head.indexOf(last + " ") === 0)) out.pop();
      out.push(alts);
    });
    return out;
  }
  function anyMatches(expected, finals) {
    return candidateTexts(finals).some(function (text) { return matches(expected, text); });
  }
  function anyPrefix(expected, finals, limit) {
    return candidateTexts(finals).some(function (text) { return isPrefix(expected, text, limit); });
  }
  function matchScore(expected, finals) {
    let best = 0;
    candidateTexts(finals).forEach(function (text) { best = Math.max(best, coveredWords(expected, text)); });
    return best;
  }
  // Stuck protection: after STUCK_TRIES reading attempts on the same sentence (presses in
  // which words were heard), a best attempt that covered at least 70% of the words passes
  // gently. Short lines forgive one word, so a 3-word sentence needs 2 and a 10-word one 7.
  // If nothing was ever heard and STUCK_TRIES presses ended in device errors (network, busy
  // mic, stalled recognizer — never plain silence or a blocked permission), it passes too.
  const STUCK_TRIES = 3, STUCK_SHARE = 0.7;
  function stuckRequired(wordCount) {
    if (wordCount <= 1) return wordCount;
    return Math.min(Math.ceil(wordCount * STUCK_SHARE - 1e-9), wordCount - 1);
  }

  function cleanWordScores(input) {
    const scores = {};
    sentences.forEach(function (sentence) {
      normalize(sentence.text).split(" ").forEach(function (word) {
        const value = input && Object.prototype.hasOwnProperty.call(input, word) ? input[word] : 0;
        if (Number.isFinite(value) && value > 0) scores[word] = Math.min(5, Math.floor(value));
      });
    });
    return scores;
  }
  // `recent` lists sentence indexes read lately (newest last); none of them nor
  // `previous` is offered again while other sentences remain. Without trouble
  // words the pick walks forward from the ordinal so the book is read in order.
  const RECENT_LIMIT = 12;
  function clampLevel(level) {
    const n = Math.floor(Number(level));
    return n >= 1 && n <= MAX_LEVEL ? n : 1;
  }
  function levelPool(level, random) {
    const top = clampLevel(level);
    const open = [];
    sentences.forEach(function (sentence, idx) { if (sentence.level <= top) open.push(idx); });
    if (top === 1) return open;
    const focus = open.filter(function (idx) { return sentences[idx].level === top; });
    const review = open.filter(function (idx) { return sentences[idx].level < top && sentences[idx].level >= top - 2; });
    return (random || Math.random)() < FOCUS_SHARE ? focus : review;
  }
  function chooseSentence(scores, ordinal, previous, random, recent, level) {
    const pool = levelPool(level, random);
    const picked = chooseFromPool(pool, scores, ordinal, previous, random, recent);
    return pool[picked];
  }
  // pool 안의 위치를 돌려준다. 아래 본문은 예전 전체 목록용 규칙을 그대로 쓴다.
  function chooseFromPool(pool, scores, ordinal, previous, random, recent) {
    scores = cleanWordScores(scores);
    const n = pool.length;
    const avoid = {};
    (Array.isArray(recent) ? recent.slice(-RECENT_LIMIT) : []).forEach(function (idx) { const at = pool.indexOf(idx); if (at >= 0) avoid[at] = true; });
    const previousAt = Number.isInteger(previous) ? pool.indexOf(previous) : -1;
    if (previousAt >= 0) avoid[previousAt] = true;
    if (Object.keys(avoid).length >= n) { const only = ((ordinal % n) + n) % n; return only === previousAt ? (only + 1) % n : only; }
    const base = ((ordinal % n) + n) % n;
    if (!Object.keys(scores).length) {
      for (let step = 0; step < n; step++) { const idx = (base + step) % n; if (!avoid[idx]) return idx; }
      return base;
    }
    const weights = pool.map(function (sentenceIdx, idx) {
      if (avoid[idx]) return 0;
      return 1 + Math.min(8, normalize(sentences[sentenceIdx].text).split(" ").reduce(function (sum, word) { return sum + (scores[word] || 0); }, 0));
    });
    const total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    let draw = (random || Math.random)() * total;
    for (let i = 0; i < weights.length; i++) { draw -= weights[i]; if (draw < 0) return i; }
    for (let step = 0; step < n; step++) { const idx = (base + step) % n; if (!avoid[idx]) return idx; }
    return base;
  }
  // 집중 읽기(2026-11-15): 지금 단계에서 한 번에 OPEN_SIZE 문장만 '배우는 중'으로 열어 두고,
  // 서로 다른 날 한 번에 맞힌 날이 MASTER_DAYS 번 쌓이면 '익힘'으로 바꾸고 새 문장을 연다.
  // 출제 = 배우는 중 약 70% + 익힌 문장 복습 약 30%(REVIEW_SHARE). 최근 12문장 회피·못 읽은 단어 가중은 그대로.
  // 저장은 부르는 쪽(허브)이 한다. 이 파일은 저장소 API 를 쓰지 않는다.
  const OPEN_SIZE = 15, MASTER_DAYS = 2, REVIEW_SHARE = 0.3, GENTLE_RETIRE = 2;
  function validIndex(idx) { return Number.isInteger(idx) && idx >= 0 && idx < sentences.length; }
  function cleanFocus(raw) {
    const out = { s: {}, open: [] };
    if (!raw || typeof raw !== "object") return out;
    const saved = raw.s && typeof raw.s === "object" ? raw.s : {};
    Object.keys(saved).forEach(function (key) {
      const idx = Number(key), entry = saved[key];
      if (!validIndex(idx) || !entry || typeof entry !== "object") return;
      const n = Math.max(0, Math.min(MASTER_DAYS, parseInt(entry.n, 10) || 0));
      const d = typeof entry.d === "string" && entry.d.length <= 12 ? entry.d : "";
      const g = Math.max(0, Math.min(GENTLE_RETIRE, parseInt(entry.g, 10) || 0));
      const x = entry.x === 1 || entry.x === true;
      if (n || d || g || x) {
        out.s[idx] = { n: n, d: d };
        if (g) out.s[idx].g = g;
        if (x) out.s[idx].x = 1;
      }
    });
    if (Array.isArray(raw.open)) raw.open.forEach(function (idx) {
      if (validIndex(idx) && out.open.indexOf(idx) < 0 && out.open.length < OPEN_SIZE && !(out.s[idx] && out.s[idx].x)) out.open.push(idx);
    });
    return out;
  }
  function isMastered(focus, idx) { const entry = focus.s[idx]; return !!entry && entry.n >= MASTER_DAYS; }
  // 쉬어 가는 문장: 세 번 읽고 넘어간 '부드러운 통과'가 GENTLE_RETIRE 번 쌓인 문장(2026-11-15 검수).
  // 인식기가 끝내 못 알아듣는 문장이 배우는 중 묶음에 남아 계속 다시 나오지 않게 묶음에서 뺀다.
  function isRetired(focus, idx) { const entry = focus.s[idx]; return !!entry && !!entry.x; }
  // 부드러운 통과 때 부른다. 이번에 쉬어 가는 문장이 됐으면 true (부르는 쪽은 오답 노트에서도 지운다).
  function recordGentle(focus, idx) {
    if (!validIndex(idx)) return false;
    const entry = focus.s[idx] || { n: 0, d: "" };
    focus.s[idx] = entry;
    if (entry.x || entry.n >= MASTER_DAYS) return false;
    entry.g = Math.min(GENTLE_RETIRE, (entry.g || 0) + 1);
    if (entry.g < GENTLE_RETIRE) return false;
    entry.x = 1;
    focus.open = focus.open.filter(function (i) { return i !== idx; });
    return true;
  }
  // 한 번에 맞혔을 때만 부른다. 같은 날 여러 번은 한 번으로 친다. 이번에 익혔으면 true.
  function recordFocus(focus, idx, day) {
    if (!validIndex(idx) || !day) return false;
    const entry = focus.s[idx] || { n: 0, d: "" };
    focus.s[idx] = entry;
    if (entry.g) delete entry.g;
    if (entry.n >= MASTER_DAYS || entry.d === day) return false;
    entry.n += 1; entry.d = day;
    if (entry.n < MASTER_DAYS) return false;
    focus.open = focus.open.filter(function (i) { return i !== idx; });
    return true;
  }
  // 배우는 중 묶음을 채운다: 지금 단계의 안 익힌 문장부터 차례로, 모자라면 아래 단계의 안 익힌 문장.
  function refillOpen(focus, level) {
    const top = clampLevel(level);
    focus.open = focus.open.filter(function (idx) { return validIndex(idx) && sentences[idx].level <= top && !isMastered(focus, idx) && !isRetired(focus, idx); });
    for (let lv = top; lv >= 1 && focus.open.length < OPEN_SIZE; lv--) {
      for (let idx = 0; idx < sentences.length && focus.open.length < OPEN_SIZE; idx++) {
        if (sentences[idx].level === lv && !isMastered(focus, idx) && !isRetired(focus, idx) && focus.open.indexOf(idx) < 0) focus.open.push(idx);
      }
    }
    return focus.open;
  }
  function focusCounts(focus, level) {
    let mastered = 0;
    Object.keys(focus.s).forEach(function (key) { if (focus.s[key].n >= MASTER_DAYS) mastered++; });
    return { mastered: mastered, learning: refillOpen(focus, level).length, total: sentences.length };
  }
  function chooseFocus(focus, level, scores, ordinal, previous, random, recent) {
    random = random || Math.random;
    const top = clampLevel(level);
    const open = refillOpen(focus, top).slice();
    const mastered = [];
    sentences.forEach(function (sentence, idx) { if (sentence.level <= top && isMastered(focus, idx)) mastered.push(idx); });
    let pool = open;
    if (mastered.length && (!open.length || random() < REVIEW_SHARE)) pool = mastered;
    if (!pool.length) pool = levelPool(top, random);
    return pool[chooseFromPool(pool, scores, ordinal, previous, random, recent)];
  }
  const FIRST_PRAISE = ["excellent", "perfect", "awesome", "wonderful"];
  const RETRY_PRAISE = ["great", "verygood", "youdidit", "super"];
  const PRAISE_TEXT = { excellent: "Excellent!", perfect: "Perfect!", awesome: "Awesome!", wonderful: "Wonderful!", great: "Great!", verygood: "Very good!", youdidit: "You did it!", super: "Super!", threeinarow: "Three in a row!" };
  // Clips live beside this script. Resolve them from the script's own URL so a page in
  // another folder (story/english/ has no <base>) loads the same precached files; the hub
  // (<base href="../">) gets the same URLs as before. Without a document (tests) they stay relative.
  const ASSET_ROOT = (function () {
    try {
      const script = typeof document !== "undefined" && document.currentScript;
      if (script && script.src) return new URL("../../", script.src).href;
    } catch (_) {}
    return "";
  })();
  const PRAISE_PATH = ASSET_ROOT + "assets/study/praise/", WORD_PATH = ASSET_ROOT + "assets/study/words/";
  const PRAISE_FILES = { perfect: PRAISE_PATH + "perfect-v2.wav" };
  function praiseFile(clip) { return PRAISE_FILES[clip] || PRAISE_PATH + clip + ".mp3"; }
  const WORD_CLIPS = {};
  sentences.forEach(function (sentence) { normalize(sentence.text).split(" ").forEach(function (word) { WORD_CLIPS[word] = WORD_PATH + word + ".mp3"; }); });
  // 문장 전체 녹음(허브의 듣기 버튼용). 보이는 글자 그대로 녹음했고, 이름은 글자의 FNV-1a 해시.
  const LINE_DIR = "assets/study/lines/";
  function lineFile(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
    return "line-" + hash.toString(16).padStart(8, "0") + ".mp3";
  }
  function sentenceClip(sentence) { return ASSET_ROOT + LINE_DIR + lineFile(sentence && sentence.text ? sentence.text : String(sentence || "")); }
  function linePlan() { return sentences.map(function (sentence) { return { text: sentence.text, audio: "lines/" + lineFile(sentence.text) }; }); }
  const STALL_MS = 5000, NO_AUDIO_MS = 1800, WORD_STALL_MS = 4000, WORD_GAP_MS = 400, STOP_WAIT_MS = 600;
  const PRAISE_GAIN = 1.28;
  // 칭찬·단어 소리는 Web Audio 로만 낸다. <audio> 재생 뒤 iOS Safari 가 음성 인식을
  // 조용히 멈추는 문제(WebKit 321436)를 피하려고, 재생이 끝나면 AudioContext 를
  // 즉시 close 해서 오디오 장치를 완전히 놓아 준다.
  function loadClip(env, url) {
    return env.fetch(url).then(function (res) {
      if (!res || !res.ok) throw new Error("clip " + url);
      return res.arrayBuffer();
    });
  }
  const LOG_LIMIT = 40;
  // Listening window for one 🎤 press (see mount → read/startRecognizer).
  const MAX_RESTARTS = 4, RESTART_DELAY_MS = 150, RESTART_START_MS = 2000, SILENCE_MS = 2500;
  const WINDOW_BASE_MS = 9000, WINDOW_PER_WORD_MS = 900, WINDOW_MAX_MS = 45000;
  const PERMANENT_ERRORS = { "not-allowed": true, "service-not-allowed": true, "language-not-supported": true };
  const permissionGuided = new WeakSet();
  const sessions = new WeakMap();
  const completionPlayed = new WeakSet();
  // 바깥 소리(허브 듣기 버튼의 문장 녹음). 2026-11-15 현장 보고: 듣기 뒤 첫 읽기가 잘 안 된다.
  // 아이패드는 Web Audio 재생 뒤 음성 인식 마이크가 약해지거나 죽는다(열 문제 축하 소리 뒤와 같은 문제).
  // 그래서 듣기 뒤 첫 🎤 는 축하 뒤처럼 마이크 연결을 새로 받은 다음(getUserMedia → 즉시 닫기) 인식을 켠다.
  // 다른 기기는 듣기 컨텍스트가 닫힐 때까지(최대 LISTEN_SETTLE_MAX_MS) 기다렸다가 켠다.
  const outsideAudio = new WeakMap();
  const LISTEN_SETTLE_MS = 250, LISTEN_SETTLE_MAX_MS = 700, INTERIM_SETTLE_MS = 1500;
  function noteListen(env, info) {
    env = env || root;
    info = info || {};
    const prev = outsideAudio.get(env) || {};
    const entry = { ctx: info.ctx || prev.ctx || null, startedAt: prev.startedAt || 0, endedAt: 0, closing: null };
    if (info.phase === "end") { entry.endedAt = Date.now(); entry.closing = info.closing && info.closing.then ? info.closing : null; }
    else entry.startedAt = Date.now();
    outsideAudio.set(env, entry);
  }
  function mountCelebration(container, env) {
    env = env || root;
    const button = env.document.createElement('p');button.setAttribute('role','status');button.textContent='🌟 열 문제 성공!';container.appendChild(button);
    let disposed=false,ctx=null,node=null,timer=null,started=false;
    function close() {
      if(node){node.onended=null;try{node.stop();}catch(_){}node=null;}
      const old=ctx;ctx=null;if(old&&old.close)try{return old.close();}catch(_){}
    }
    function finish(label) {
      env.clearTimeout(timer);const closing=close();
      const done=()=>{if(!disposed)button.textContent=label;};
      if(closing&&closing.then)closing.then(done,done);else done();
    }
    function play(){
      if(disposed||started)return;started=true;button.disabled=true;
      const AC=env.AudioContext||env.webkitAudioContext;
      if(!AC||!env.fetch){button.textContent='🌟 열 문제를 해냈어! 정말 멋져!';return;}
      completionPlayed.add(env);
      try{ctx=new AC();const ready=ctx.resume?ctx.resume():null;
        button.textContent='칭찬을 준비하고 있어요…';
        timer=env.setTimeout(()=>finish('🌟 열 문제 성공! 소리는 재생하지 못했어요.'),10000);
        Promise.resolve(ready).then(()=>disposed?null:loadClip(env,praiseFile('perfect'))).then(bytes=>{
          if(disposed||!ctx)return;return ctx.decodeAudioData(bytes.slice(0));
        }).then(sound=>{
          if(disposed||!ctx||!sound)return;node=ctx.createBufferSource();node.buffer=sound;node.connect(ctx.destination);
          node.onended=()=>finish('🌟 정말 잘했어! 신나게 놀고 와!');
          button.textContent='🌟 열 문제 성공! 정말 잘했어!';node.start(0);
        }).catch(()=>finish('🌟 열 문제 성공! 소리는 재생하지 못했어요.'));
      }catch(_){finish('🌟 열 문제 성공! 소리는 재생하지 못했어요.');}
    }
    const leave=()=>{disposed=true;env.clearTimeout(timer);close();};
    const hide=()=>{if(env.document.hidden)leave();};
    env.addEventListener('pagehide',leave);env.document.addEventListener('visibilitychange',hide);
    play();
    return {destroy(){leave();env.removeEventListener('pagehide',leave);env.document.removeEventListener('visibilitychange',hide);}};
  }
  // One session per window: praise streak, last clip and a diagnostic log.
  function createFeedbackSession() { return { streak: 0, lastClip: null, log: [], silent: false, autoRetries: 0 }; }
  function choosePraise(session, firstTry, random) {
    session.streak = firstTry ? session.streak + 1 : 0;
    const group = firstTry && session.streak % 3 === 0 ? ["threeinarow"] : firstTry ? FIRST_PRAISE : RETRY_PRAISE;
    const candidates = group.filter(function (clip) { return clip !== session.lastClip; });
    const clip = candidates[Math.floor((random || Math.random)() * candidates.length)];
    session.lastClip = clip;
    return clip;
  }
  function retryWords(expected, heard) {
    const flags = matchedWords(expected, heard);
    if (flags.every(Boolean)) return [];
    return Array.from(new Set(normalize(expected).split(" ").filter(function (_, i) { return !flags[i]; }))).slice(0, 3);
  }
  // Diagnostic trail: event names, error codes, segment counts and match scores
  // only — never the recognised words or audio. Kept in memory for the page and
  // shown under the sentence when the URL carries readinglog=1. When the page
  // hands over a key-value store (callbacks.diagnostics), the last DIAG_KEEP
  // lines also survive a reload so a parent can see what failed on the iPad.
  const DIAG_KEY = "hub2_reading_diag", DIAG_KEEP = 30;
  function clockStamp(env) {
    const D = env.Date || Date, d = new D();
    const two = function (n) { return (n < 10 ? "0" : "") + n; };
    return two(d.getMonth() + 1) + "-" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
  }
  function record(env, session, event) {
    session.log.push(clockStamp(env) + " " + event);
    if (session.log.length > LOG_LIMIT) session.log.splice(0, session.log.length - LOG_LIMIT);
  }
  function loadDiagnostics(store) {
    try {
      const saved = JSON.parse(store.getItem(DIAG_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(function (line) { return typeof line === "string" && line.length <= 80 && /^[\w\s.:\/+#=-]*$/.test(line); }).slice(-DIAG_KEEP) : [];
    } catch (_) { return []; }
  }
  function saveDiagnostics(store, lines) {
    try { store.setItem(DIAG_KEY, JSON.stringify(lines.slice(-DIAG_KEEP))); } catch (_) {}
  }
  function mount(container, sentence, onPass, env, callbacks) {
    env = env || root;
    callbacks = callbacks || {};
    const doc = env.document;
    const nav = env.navigator || {};
    const touchIOS = /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    if (!sessions.has(env)) sessions.set(env, createFeedbackSession());
    const session = sessions.get(env);
    // Silent recovery is temporary. A fresh question gets another chance to
    // celebrate, so one old iOS microphone stall cannot mute praise forever.
    session.silent = callbacks.silent === true;
    session.autoRetries = 0;
    let disposed = false, awarded = false, active = null, serial = 0, timer = null, finalText = "";
    let retried = false, soundActive = false, soundTimer = null, stopTimer = null, passDone = false, stopping = null;
    let audioCtx = null, primedCtx = null, playing = null, healthTimer = null, recovering = false;
    let recoveryButton = null, retryTimer = null, carry = [], lastFinals = [], finishing = false;
    // One 🎤 press = one take. Inside a take the recognizer may end early (iOS ends at a
    // child's pause); it is restarted quietly and the segments are merged in order.
    let takeId = -1, windowOpen = false, windowTimer = null, restarts = 0, restarting = false, restartTimer = null;
    let silenceTimer = null, tailInterim = null, segmentHeard = false, autoRead = false, pressPending = false;
    // Stuck protection for this sentence (see STUCK_TRIES): presses that ended without a pass.
    let tries = 0, deviceTries = 0, bestCovered = 0, heardEver = false, permanentBlock = false, gentle = false;
    let settling = false, settleTimer = null, interimTimer = null;
    const wordCount = expectedWords(sentence.text).length;
    const diagStore = callbacks.diagnostics && typeof callbacks.diagnostics.getItem === "function" ? callbacks.diagnostics : null;
    if (diagStore && !session.log.length) loadDiagnostics(diagStore).forEach(function (entry) { session.log.push(entry); });
    const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
    const showLog = !!(env.location && /(?:\?|&)readinglog=1/.test(env.location.search || ""));
    const nodes = {};
    function element(tag, className, text) {
      const node = doc.createElement(tag);
      node.className = className;
      if (text) node.textContent = text;
      return node;
    }
    container.textContent = "";
    container.classList.add("reading-practice");
    const label = element("p", "reading-label", "문장을 처음부터 끝까지 읽어요");
    const line = element("p", "reading-sentence");
    line.lang = "en";
    line.setAttribute("aria-label", sentence.text);
    sentence.text.split(/\s+/).forEach(function (word) {
      line.appendChild(element("span", "reading-word", word));
    });
    // 한글 뜻은 읽기 전에 보여 주지 않는다. 맞게 읽으면 칭찬과 함께 나타난다.
    const meaning = element("p", "reading-meaning", sentence.meaning);
    meaning.hidden = true;
    nodes.meaning = meaning;
    const actions = element("div", "reading-actions");
    nodes.mic = element("button", "", "🎤 읽어 보기");
    nodes.stop = element("button", "", "그만하기");
    [nodes.mic, nodes.stop].forEach(function (button) {
      button.type = "button"; actions.appendChild(button);
    });
    const fallback = element("button", "reading-alternative", "마이크가 안 돼요 · 다른 문제 풀기");
    fallback.type = "button"; fallback.hidden = true;
    if (callbacks.onUnavailable) actions.appendChild(fallback);
    fallback.addEventListener("click", function () {
      if (disposed || awarded || fallback.hidden) return;
      stop(); callbacks.onUnavailable();
    });
    nodes.status = element("p", "reading-status", "잘 들리는 목소리로 읽어 주세요. 크게 외치지 않아도 돼요.");
    nodes.status.setAttribute("role", "status");
    nodes.heard = element("p", "reading-heard");
    nodes.heard.lang = "en";
    const privacy = element("p", "reading-privacy",
      "부모님 안내: ‘읽어 보기’ 또는 ‘마이크 복구’를 누를 때만 마이크를 켭니다. 음성은 브라우저의 인식 서비스로 전송될 수 있어요. 복구용 마이크 연결은 즉시 닫으며 녹음하지 않아요. 음성과 인식 문장은 저장하지 않고, 연습할 교재 단어와 복습 횟수, 문제 확인용 오류 기록(오류 이름과 횟수만)을 이 기기에 기억해요. 발음 점수가 아닌 문장 읽기를 확인해요.");
    [label, line, meaning, actions, nodes.status, nodes.heard, privacy].forEach(function (node) { container.appendChild(node); });
    const logNode = showLog ? element("pre", "reading-log") : null;
    if (logNode) container.appendChild(logNode);
    function log(event) {
      record(env, session, event);
      if (diagStore) saveDiagnostics(diagStore, session.log);
      if (logNode && !disposed) logNode.textContent = session.log.join("\n");
    }
    log("mount-v26 w" + wordCount + (touchIOS ? " ios-quiet-round" : ""));

    function controls() {
      nodes.mic.disabled = disposed || awarded || recovering || settling || !!active || restarting || soundActive || !Recognition || env.isSecureContext === false || nav.onLine === false;
      if (recoveryButton) recoveryButton.disabled = disposed || awarded || recovering || !!active || soundActive || !Recognition || env.isSecureContext === false || nav.onLine === false;
      nodes.stop.disabled = disposed || awarded || finishing || !!stopping || (!active && !soundActive && !restarting);
      nodes.stop.textContent = soundActive && !awarded ? "안내 멈추고 읽기" : "다 읽었어요";
    }
    // 소리를 낼 수 있는 상태인가 (무음 모드가 아니고 Web Audio 를 쓸 수 있을 때)
    function canPlay() {
      return !session.silent && !!(env.AudioContext || env.webkitAudioContext) && !!env.fetch;
    }
    // 재생 중이던 소리를 끊고 오디오 장치를 반납한다. 마이크를 켜기 전에 반드시 호출.
    function detachAudio() {
      if (playing) { try { playing.onended = null; playing.stop(0); } catch (_) {} playing = null; }
      const ctx = audioCtx; audioCtx = null;
      if (ctx && ctx.close) { try { return ctx.close(); } catch (_) {} }
    }
    function releasePrimedAudio() {
      const ctx = primedCtx; primedCtx = null;
      if (ctx && ctx.close) { try { ctx.close(); } catch (_) {} }
    }
    function cancelSound() {
      env.clearTimeout(soundTimer); soundTimer = null;
      detachAudio();
      soundActive = false;
      Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
    }
    // Stops the live recognizer. With `after`, waits for its end event (at most
    // STOP_WAIT_MS) before calling after(true); speakers must never overlap a
    // live microphone, so a missing end event calls after(false) instead.
    function stop(message, after) {
      serial++;
      finishing = false;
      env.clearTimeout(retryTimer); retryTimer = null;
      Array.from(actions.children).forEach(function (node) { if (node.className === 'reading-word-listen') node.hidden = true; });
      recovering = false;
      settling = false; env.clearTimeout(settleTimer); settleTimer = null;
      env.clearTimeout(healthTimer); healthTimer = null;
      env.clearTimeout(timer); timer = null;
      env.clearTimeout(stopTimer); stopTimer = null;
      clearTake();
      cancelSound();
      if (stopping) { stopping.onend = null; try { stopping.abort(); } catch (_) {} stopping = null; }
      const previous = active; active = null;
      if (previous) {
        previous.onresult = previous.onerror = previous.onend = previous.onstart = previous.onspeechstart = null;
        if (after) {
          const id = serial;
          let settled = false;
          const ended = function (safe) {
            if (settled) return;
            settled = true;
            if (stopping === previous) stopping = null;
            previous.onend = null;
            env.clearTimeout(stopTimer); stopTimer = null;
            log(safe ? "mic-off" : "mic-off-timeout");
            if (!disposed && id === serial) after(safe);
          };
          soundActive = true;
          stopping = previous;
          previous.onend = function () { ended(true); };
          stopTimer = env.setTimeout(function () { previous.onend = null; try { previous.abort(); } catch (_) {} ended(false); }, STOP_WAIT_MS);
          try { previous.stop(); } catch (_) { try { previous.abort(); } catch (_) {} ended(false); }
        } else { try { previous.abort(); } catch (_) {} }
      }
      controls();
      if (message && !disposed) nodes.status.textContent = message;
      if (!previous && after) after(true);
    }
    function resetFlow() { retried = true; session.streak = 0; }
    function clearTake() {
      env.clearTimeout(interimTimer); interimTimer = null;
      env.clearTimeout(windowTimer); windowTimer = null;
      env.clearTimeout(restartTimer); restartTimer = null;
      env.clearTimeout(silenceTimer); silenceTimer = null;
      windowOpen = false; restarting = false; tailInterim = null;
    }
    // iPad Safari only guarantees Web Audio playback when AudioContext.resume()
    // happens inside a user gesture. Prime an idle context on the microphone tap;
    // it makes no sound and is reused only after recognition has fully stopped.
    function unlockAudio() {
      if (primedCtx || !canPlay()) return;
      const AC = env.AudioContext || env.webkitAudioContext;
      try {
        primedCtx = new AC();
        if (primedCtx.state === "suspended" && primedCtx.resume) {
          const ready = primedCtx.resume();
          if (ready && ready.catch) ready.catch(function () { log("audio-prime-wait"); });
        }
        log("audio-primed");
      } catch (_) { primedCtx = null; log("audio-prime-fail"); }
    }
    function completePass() {
      if (disposed || passDone) return;
      passDone = true;
      cancelSound();
      log("next");
      onPass(gentle ? { gentle: true } : undefined);
    }
    function armWatchdog(ms, fn) {
      env.clearTimeout(soundTimer);
      soundTimer = env.setTimeout(fn, ms);
    }
    function victoryChime(ctx, destination, big) {
      if (!ctx || !ctx.createOscillator || !ctx.createGain) return;
      const start = ctx.currentTime || 0;
      const notes = big ? [659.25, 783.99, 987.77] : [523.25, 659.25, 783.99];
      notes.forEach(function (frequency, index) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = start + index * 0.085;
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(big ? 0.13 : 0.09, at + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
        oscillator.connect(gain); gain.connect(destination);
        oscillator.start(at); oscillator.stop(at + 0.34);
      });
    }
    // Plays one clip on the shared element. onDone fires once: at the ended
    // event, at a playback error, or when progress stalls for stallMs.
    function playClip(src, stallMs, onDone, options) {
      const id = serial;
      let done = false;
      let reservedCtx = null;
      const finish = function (how) {
        if (done || disposed || id !== serial) return;
        done = true;
        if (reservedCtx && reservedCtx !== audioCtx && reservedCtx.close) { try { reservedCtx.close(); } catch (_) {} }
        reservedCtx = null;
        const closed = detachAudio();
        env.clearTimeout(soundTimer); soundTimer = null;
        const released = function () {
          env.clearTimeout(soundTimer); soundTimer = null;
          if (!disposed && id === serial) onDone(how);
        };
        if (closed && closed.then) {
          // close() releases audio hardware asynchronously, not when it is called.
          let notified = false;
          const once = function () { if (notified) return; notified = true; released(); };
          armWatchdog(STALL_MS, function () { session.silent = true; log('audio-close-timeout'); once(); });
          closed.then(once, function () { session.silent = true; log('audio-close-failed'); once(); });
        } else released();
      };
      if (!canPlay()) { finish("no-audio"); return; }
      reservedCtx = primedCtx; primedCtx = null;
      armWatchdog(stallMs, function () { finish("stall"); });
      const AC = env.AudioContext || env.webkitAudioContext;
      loadClip(env, src).then(function (buf) {
        if (done || disposed || id !== serial) return;
        const ctx = reservedCtx || new AC();
        reservedCtx = null;
        audioCtx = ctx;
        const decoded = ctx.decodeAudioData(buf.slice(0));
        return (decoded && decoded.then ? decoded : Promise.resolve(decoded)).then(function (sound) {
          if (done || disposed || id !== serial || audioCtx !== ctx) { if (ctx.close) try { ctx.close(); } catch (_) {} return; }
          const node = ctx.createBufferSource();
          node.buffer = sound;
          let destination = ctx.destination;
          if (options && options.praise && ctx.createGain) {
            const voice = ctx.createGain();
            voice.gain.value = PRAISE_GAIN;
            if (ctx.createDynamicsCompressor) {
              const limiter = ctx.createDynamicsCompressor();
              limiter.threshold.value = -8; limiter.knee.value = 8; limiter.ratio.value = 8;
              limiter.attack.value = 0.003; limiter.release.value = 0.18;
              voice.connect(limiter); limiter.connect(ctx.destination);
            } else voice.connect(ctx.destination);
            destination = voice;
            if (node.playbackRate) node.playbackRate.value = 1.035;
            victoryChime(ctx, ctx.destination, !!options.big);
          }
          node.connect(destination);
          node.onended = function () { finish("ended"); };
          playing = node;
          // 클립 길이만큼은 기다린다. 끝 이벤트가 안 오면 그때 정리.
          armWatchdog(Math.max(stallMs, Math.round((sound.duration || 1) * 1000) + 1500), function () { finish("stall"); });
          const go = function () { try { node.start(0); } catch (_) { finish("blocked"); } };
          if (ctx.state === "suspended" && ctx.resume) ctx.resume().then(go, function () { finish("blocked"); });
          else go();
        });
      }).catch(function () { finish("error"); });
    }
    function praise() {
      let manualPraise = false;
      if (nodes.meaning) nodes.meaning.hidden = false;
      const clip = choosePraise(session, !retried);
      nodes.status.textContent = "";
      nodes.status.classList.remove("retry");
      nodes.status.appendChild(element("span", "reading-praise", gentle ? "⭐ 잘 읽었어요! 다음으로 가요" : (clip === "threeinarow" ? "🌟 " : "⭐ ") + PRAISE_TEXT[clip]));
      nodes.status.appendChild(element("span", "reading-praise-detail", gentle ? "여러 번 끝까지 읽었어요. 정말 멋져요!" : clip === "threeinarow" ? "세 문장 연속 성공! 최고야!" : retried ? "다시 읽어서 해냈어! 멋져!" : "와! 한 번에 성공! 다음 문장도 가자!"));
      const stars = element("span", "reading-star-burst", clip === "threeinarow" ? "★ ✦ ⭐ ✦ ★" : "✦ ★ ✦");
      stars.setAttribute("aria-hidden", "true"); nodes.status.appendChild(stars);
      log("pass " + clip + (retried ? " retry" : " first"));
      stop(null, function (safe) {
        if (touchIOS) { soundActive=false;controls();armWatchdog(NO_AUDIO_MS,completePass);return; }
        if (safe && (session.silent || touchIOS) && (env.AudioContext || env.webkitAudioContext) && env.fetch) {
          manualPraise = true;
          env.clearTimeout(soundTimer); soundTimer = null;
          soundActive = false; controls();
          const listen = element('button', 'reading-praise-listen', '🔊 칭찬 듣기');
          const next = element('button', 'reading-praise-next', '다음 문제');
          listen.type = next.type = 'button'; actions.appendChild(listen); actions.appendChild(next);
          nodes.status.appendChild(element('span', 'reading-praise-detail', touchIOS ? '아이패드는 마이크와 소리를 나눠 써요. 눌러서 칭찬을 들어요!' : '마이크 복구로 소리를 잠깐 껐어요. 눌러서 칭찬을 들어요!'));
          const hide = function () { listen.hidden = next.hidden = true; };
          listen.addEventListener('click', function () {
            if (disposed || passDone || listen.hidden) return;
            hide(); session.silent = false; unlockAudio(); soundActive = true; controls();
            playClip(praiseFile(clip), STALL_MS, function (how) { log('praise-tap-' + how); completePass(); }, {praise:true,big:clip==='threeinarow'});
          });
          next.addEventListener('click', function () { if (!disposed && !passDone && !next.hidden) { hide(); completePass(); } });
          return;
        }
        if (!safe || !canPlay()) { soundActive = false; controls(); if (!soundTimer) armWatchdog(NO_AUDIO_MS, completePass); return; }
        soundActive = true;
        controls();
        // Every praise clip plays to its ended event; the watchdog only guards a
        // stalled or blocked playback so the question can never be trapped.
        playClip(praiseFile(clip), STALL_MS, function (how) {
          log("praise-" + how);
          if (how === "blocked" || how === "error") { armWatchdog(NO_AUDIO_MS, completePass); return; }
          completePass();
        }, { praise: true, big: clip === "threeinarow" });
      });
      // Visible praise without any playable audio still moves on.
      if (!disposed && !passDone && !manualPraise && !soundTimer) armWatchdog(NO_AUDIO_MS, completePass);
    }
    // Reads back only the misread words, once each, from recorded clips.
    function speakWords(words, safe, tapped) {
      soundActive = false;
      if(touchIOS){controls();return;}
      const clips = words.filter(function (word) { return !!WORD_CLIPS[word]; });
      if (!safe || !clips.length || !canPlay()) { controls(); return; }
      if (touchIOS && tapped !== true) {
        controls();
        const listen = element('button', 'reading-word-listen', '🔊 틀린 단어 듣기');listen.type='button';actions.appendChild(listen);
        const requestId=serial;
        listen.addEventListener('click',function(){
          if(disposed || awarded || listen.hidden || requestId!==serial)return;
          listen.hidden=true;unlockAudio();speakWords(words,true,true);
        });
        return;
      }
      const id = serial;
      let index = 0;
      soundActive = true; controls();
      function next() {
        if (disposed || id !== serial) return;
        Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
        if (index >= clips.length) { cancelSound(); controls(); log("words-done"); return; }
        const word = clips[index++];
        nodes.status.textContent = "이렇게 읽어요 👂 " + word;
        const target = Array.from(line.children).find(function (node) { return node.classList.contains("retry") && normalize(node.textContent) === word; });
        if (target) target.classList.add("listening");
        playClip(WORD_CLIPS[word], WORD_STALL_MS, function (how) {
          if (how !== "ended") log("word-" + how);
          if (how === "blocked") { cancelSound(); controls(); return; }
          if (index < clips.length) soundTimer = env.setTimeout(next, WORD_GAP_MS);
          else next();
        });
      }
      next();
    }
    function feedback(text, retry) {
      nodes.heard.textContent = text ? "“" + text + "”" : "";
      const flags = matchedWords(sentence.text, text);
      // If all expected words occur but extra words were spoken, flag the whole line.
      const wholeLine = retry && flags.every(Boolean);
      Array.from(line.children).forEach(function (word, i) {
        const wrong = !!retry && (!flags[i] || wholeLine);
        word.classList.toggle("heard", !!flags[i] && !wrong);
        word.classList.toggle("retry", wrong);
      });
      nodes.status.classList.toggle("retry", !!retry);
      nodes.heard.classList.toggle("retry", !!retry);
      nodes.mic.textContent = retry ? "🎤 다시 읽기" : "🎤 읽어 보기";
    }
    function award() {
      awarded = true;
      feedback(sentence.text);
      praise();
    }
    // A trailing interim result is the recognizer's last guess. Once the recognizer
    // has ended (by itself or after 다 읽었어요) it counts as final, as Chrome would.
    function sealInterim() {
      const tail = tailInterim; tailInterim = null;
      if (!tail || !normalize(tail[0] || "")) return;
      lastFinals = collapseRepeats(lastFinals.concat([tail.slice()]));
      finalText = lastFinals.map(function (alts) { return alts[0]; }).join(" ");
      log("seal-interim");
    }
    function noteCoverage() {
      if (!lastFinals.length) return 0;
      heardEver = true;
      const covered = matchScore(sentence.text, lastFinals);
      if (covered > bestCovered) bestCovered = covered;
      return covered;
    }
    // Counts one finished 🎤 press that did not pass: a reading attempt (words were
    // heard) or a device failure (nothing heard because of the device). Silence counts
    // as neither. Returns true when stuck protection lets the child move on.
    function concludePress(kind, device, readAttempt) {
      if (!pressPending || awarded || disposed) return false;
      pressPending = false;
      if (readAttempt) tries++;
      else if (device) deviceTries++;
      log("try " + kind + " read " + tries + " device " + deviceTries + " best " + bestCovered + "/" + wordCount);
      if ((tries >= STUCK_TRIES && bestCovered >= stuckRequired(wordCount)) ||
          (!heardEver && !permanentBlock && deviceTries >= STUCK_TRIES)) {
        gentle = true; retried = true; carry = [];
        log("gentle-pass " + kind);
        award();
        return true;
      }
      if (tries + deviceTries >= STUCK_TRIES) fallback.hidden = false;
      return false;
    }
    function finishAttempt() {
      sealInterim();
      if (lastFinals.length && anyMatches(sentence.text, lastFinals)) { log("pass-at-end"); award(); return; }
      const covered = noteCoverage();
      log("take segs " + lastFinals.length + " restarts " + restarts + " covered " + covered + "/" + wordCount);
      // A browser ending at a child's pause is not a pronunciation mistake.
      // Keep only confirmed words in memory, scoped to this question.
      if (finalText && anyPrefix(sentence.text, lastFinals)) {
        carry = lastFinals.map(function (alts) { return alts.slice(); });
        if (concludePress("partial", false, true)) return;
        stop("여기까지 잘 들었어요. ‘이어 읽기’를 누르고 남은 말을 읽어 주세요. 처음부터 다시 읽어도 괜찮아요.");
        releasePrimedAudio();
        feedback(finalText);
        nodes.mic.textContent = "🎤 이어 읽기";
        fallback.hidden = false;
        return;
      }
      if (finalText) {
        resetFlow();
        const flags = matchedWords(sentence.text, finalText);
        const words = expectedWords(sentence.text).filter(function (_, i) { return !flags[i]; });
        feedback(finalText, true);
        const spoken = retryWords(sentence.text, finalText);
        carry = []; lastFinals = [];
        log("retry " + spoken.length);
        if (callbacks.onRetry) callbacks.onRetry(Array.from(new Set(words)));
        if (concludePress("wrong", false, true)) return;
        stop(spoken.length ? "이렇게 읽어요 👂 " + spoken[0] : "문장에 있는 말만 읽어 주세요", function (safe) { speakWords(spoken, safe); });
      } else {
        log("empty");
        if (concludePress("empty", false, false)) return;
        stop("목소리가 잘 안 들렸어요. 🎤를 누르고 마이크 가까이에서 천천히 읽어 주세요. 틀린 게 아니에요.");
        releasePrimedAudio();
        fallback.hidden = false;
        showRecoveryButton();
      }
    }
    function errorMessage(code) {
      const calm = " 틀린 게 아니에요.";
      if (code === "not-allowed" || code === "service-not-allowed") {
        if (!permissionGuided.has(env)) { permissionGuided.add(env); return permissionGuide(code); }
        return "마이크 허락이 필요해요." + calm + " 다른 문제를 풀어도 괜찮아요.";
      }
      const messages = {
        "audio-capture": "마이크가 잠깐 바빠요. ‘마이크 다시 켜기’를 누르고 다시 읽어 주세요.",
        network: "인터넷이 잠깐 끊겼어요. 🎤를 다시 눌러 읽어 주세요.",
        "no-speech": "목소리가 아직 안 들렸어요. 🎤를 누르고 마이크 가까이에서 천천히 읽어 주세요.",
        aborted: "듣기가 잠깐 멈췄어요. 🎤를 다시 눌러 읽어 주세요.",
        "language-not-supported": "영어 음성 인식을 지원하지 않는 기기예요."
      };
      return (messages[code] || "잘 듣지 못했어요. 🎤를 다시 눌러 읽어 주세요.") + calm;
    }
    // Shown once per page; afterwards a short line, so the child is not buried in text.
    function permissionGuide(code) {
      const tail = " 틀린 게 아니에요.";
      if (touchIOS && code === "service-not-allowed") return "음성 인식이 꺼져 있어요. 부모님: 아이패드 설정 → 일반 → 키보드 → ‘받아쓰기 활성화’를 켜고, 설정 → Safari → 마이크를 ‘허용’으로 바꾼 뒤 🎤를 다시 눌러 주세요." + tail;
      if (touchIOS) return "마이크 허락이 필요해요. 부모님: 아이패드 설정 → Safari → 마이크 → ‘허용’을 고르고 페이지를 새로 연 뒤 🎤를 다시 눌러 주세요." + tail;
      if (/Android/i.test(nav.userAgent || "")) return "마이크 허락이 필요해요. 부모님: Chrome 주소창 왼쪽 아이콘 → 권한 → 마이크 ‘허용’ (또는 Chrome 설정 → 사이트 설정 → 마이크) 뒤 🎤를 다시 눌러 주세요." + tail;
      return "마이크 허락이 필요해요. 부모님: 주소창 왼쪽 아이콘 → 사이트 설정 → 마이크를 ‘허용’으로 바꾼 뒤 🎤를 다시 눌러 주세요." + tail;
    }
    function canRestart() {
      if (!windowOpen || restarts >= MAX_RESTARTS || doc.hidden || nav.onLine === false) return false;
      return !finalText || anyPrefix(sentence.text, lastFinals) || mayStillBeReading();
    }
    // 2026-11-15 실측(구글 인식, 단어마다 쉬며 읽기): 첫 단어를 인식기가 놓치면("Five, six…" → "six")
    // 들은 말이 문장 첫머리가 아니어서 아이가 아직 읽는 중인데 바로 '틀렸어요'로 끝났다.
    // 들은 단어 수가 문장 단어 수보다 적으면 아직 읽는 중으로 보고 조용히 계속 듣는다(채점 규칙은 그대로).
    function mayStillBeReading() {
      return !!finalText && heardTokens(finalText).length < wordCount;
    }
    // Same 🎤 press: keep the words heard so far and open a fresh recognizer quietly.
    function restartListening(reason, recognizer) {
      recognizer.onresult = recognizer.onerror = recognizer.onend = recognizer.onstart = null;
      try { recognizer.abort(); } catch (_) {}
      active = null;
      env.clearTimeout(healthTimer); healthTimer = null;
      env.clearTimeout(silenceTimer); silenceTimer = null;
      carry = lastFinals.map(function (alts) { return alts.slice(); });
      restarts++; restarting = true;
      log("restart " + restarts + " " + reason + " segs " + carry.length);
      nodes.status.textContent = carry.length ? "듣고 있어요… 이어서 읽어 주세요." : "듣고 있어요… 문장을 끝까지 읽어 주세요.";
      controls();
      const id = serial;
      restartTimer = env.setTimeout(function () {
        restartTimer = null;
        if (disposed || awarded || id !== serial) return;
        restarting = false;
        startRecognizer(true, false);
      }, RESTART_DELAY_MS);
    }
    // After a quiet restart, SILENCE_MS without new words ends the take and checks it.
    function armSilence(recognizer) {
      env.clearTimeout(silenceTimer);
      const id = serial;
      silenceTimer = env.setTimeout(function () {
        silenceTimer = null;
        if (disposed || awarded || id !== serial || active !== recognizer || finishing) return;
        log("silence");
        if (segmentHeard) { finishListening(); return; }
        // Nothing new since the restart, so there is no pending word to flush.
        recognizer.onresult = recognizer.onerror = recognizer.onend = recognizer.onstart = null;
        active = null;
        try { recognizer.abort(); } catch (_) {}
        finishAttempt();
      }, SILENCE_MS);
    }
    function scheduleRetry() {
      const id = serial;
      retryTimer = env.setTimeout(function () {
        retryTimer = null;
        if (!disposed && !awarded && id === serial && !doc.hidden && !nodes.mic.disabled) { autoRead = true; read(); }
      }, 500);
    }
    function finishListening() {
      if (!active || finishing) return;
      finishing = true; controls();
      nodes.status.textContent = "마지막 말을 확인하고 있어요…";
      const recognizer = active, id = serial;
      env.clearTimeout(healthTimer);
      // stop(), unlike abort(), asks for the pending final result. Keep result
      // handlers alive until end, but don't trap the child if end never arrives.
      healthTimer = env.setTimeout(function () {
        if (!disposed && !awarded && id === serial && active === recognizer) finishAttempt();
      }, 2500);
      try { recognizer.stop(); } catch (_) { finishAttempt(); }
    }
    function offerRecovery(reason) {
      if (disposed || awarded || recovering) return;
      log(reason);
      releasePrimedAudio();
      fallback.hidden = false;
      if (finalText && anyPrefix(sentence.text, lastFinals)) { finishAttempt(); return; }
      if (touchIOS) {
        if (concludePress("stall", true, false)) return;
        stop('마이크 응답이 멈췄어요. 마이크 다시 켜기를 눌러 연결을 새로 준비해 주세요. 오답으로 세지 않아요.');
        showRecoveryButton();
        return;
      }
      // Bounded desktop recovery. iOS above stays gesture-driven; never spin
      // permission prompts or keep listening after the page is hidden.
      if (!session.silent) {
        session.silent = true;
        session.autoRetries = 0;
        detachAudio();
        if (callbacks.onSilent) { try { callbacks.onSilent(); } catch (_) {} }
        log("auto-silent");
        stop("소리를 잠깐 끄고 마이크를 다시 켰어요. 한 번 더 읽어 주세요.");
        scheduleRetry();
        return;
      }
      if (session.autoRetries < 2) {
        session.autoRetries++;
        detachAudio();
        log("auto-retry " + session.autoRetries);
        stop("마이크를 다시 켰어요. 한 번 더 읽어 주세요.");
        scheduleRetry();
        return;
      }
      if (concludePress("stall", true, false)) return;
      stop("마이크가 응답하지 않아요. 아래 ‘마이크 다시 켜기’를 눌러 주세요. 오답으로 세지 않아요.");
      showRecoveryButton();
    }
    function showRecoveryButton() {
      if (!recoveryButton) {
        recoveryButton = element("button", "reading-recovery", "🎤 마이크 다시 켜기");
        recoveryButton.type = "button";
        actions.appendChild(recoveryButton);
        recoveryButton.addEventListener("click", recoverMicrophone);
      }
      recoveryButton.hidden = false;
      controls();
    }
    function recoverMicrophone() {
      if (disposed || awarded || recovering || active || soundActive) return;
      stop();
      session.silent = true;
      releasePrimedAudio();
      outsideAudio.delete(env);
      log("recovery-tap");
      const devices = nav.mediaDevices;
      if (!devices || !devices.getUserMedia) { read(); return; }
      recovering = true; controls();
      nodes.status.textContent = "마이크 연결을 다시 준비하고 있어요…";
      const id = serial;
      // Capture is requested only by this explicit button, never automatically.
      // No recording, upload or saved audio; even a late permission result is closed.
      healthTimer = env.setTimeout(function () {
        if (disposed || serial !== id) return;
        recovering = false;
        offerRecovery("recovery-timeout");
      }, 8000);
      let request;
      try { request = devices.getUserMedia({audio: true, video: false}); }
      catch (_) { recovering = false; offerRecovery("recovery-failed"); return; }
      Promise.resolve(request).then(function (stream) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        if (disposed || id !== serial) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () {
          if (disposed || id !== serial) return;
          completionPlayed.delete(env);recovering = false; controls(); read(true);
        }, 350);
      }, function () {
        if (disposed || id !== serial) return;
        // 권한 거부도 버튼을 다시 쓸 수 있어야 한다. recovering 을 먼저 내려야
        // offerRecovery 가 조기 반환하지 않고 컨트롤이 되살아난다.
        recovering = false;
        offerRecovery("recovery-denied");
        if (!awarded) nodes.status.textContent = "마이크 권한을 확인한 뒤 다시 눌러 주세요. 정답 기록은 그대로예요.";
      });
    }
    function maxWindowMs() { return Math.min(WINDOW_MAX_MS, WINDOW_BASE_MS + wordCount * WINDOW_PER_WORD_MS); }
    function read(rearmed) {
      if (nodes.mic.disabled) return;
      const outside = rearmed === true || rearmed === "settled" ? null : outsideAudio.get(env);
      if (outside) {
        const since = outside.endedAt ? Date.now() - outside.endedAt : -1;
        const ctxState = outside.ctx && typeof outside.ctx.state === "string" ? outside.ctx.state : "none";
        log("listen-mic ctx " + ctxState + " " + (since < 0 ? "playing" : "end " + since + "ms") + (touchIOS ? " ios" : ""));
      }
      const canRearm = !!(nav.mediaDevices && nav.mediaDevices.getUserMedia);
      if (touchIOS && canRearm && rearmed !== true && (completionPlayed.has(env) || outside)) { recoverMicrophone(); return; }
      if (outside) {
        // 듣기 소리가 장치를 다 놓을 때까지 잠깐 기다린다(같은 🎤 누름으로 이어서 켠다).
        outsideAudio.delete(env);
        const since = outside.endedAt ? Date.now() - outside.endedAt : 0;
        const open = outside.ctx && outside.ctx.state && outside.ctx.state !== "closed";
        if (open || since < LISTEN_SETTLE_MS) {
          stop();
          settling = true; controls();
          nodes.status.textContent = "마이크를 준비하고 있어요…";
          const id = serial, began = Date.now();
          let done = false;
          const go = function () {
            if (done) return; done = true;
            env.clearTimeout(settleTimer); settleTimer = null;
            if (disposed || awarded || id !== serial || doc.hidden) return;
            settling = false; controls();
            log("listen-settled " + (Date.now() - began) + "ms");
            read("settled");
          };
          const wait = Math.max(0, LISTEN_SETTLE_MS - since);
          settleTimer = env.setTimeout(go, LISTEN_SETTLE_MAX_MS);
          const closing = outside.closing || (outside.ctx && open && outside.ctx.close ? (function () { try { return outside.ctx.close(); } catch (_) { return null; } })() : null);
          Promise.resolve(closing).then(function () { env.clearTimeout(settleTimer); settleTimer = env.setTimeout(go, Math.max(wait - (Date.now() - began), 0) + 50); }, go);
          return;
        }
      }
      const automatic = autoRead; autoRead = false;
      stop();
      if (!automatic) pressPending = true;
      if (!touchIOS) unlockAudio();
      else session.silent = false;
      lastFinals = carry.map(function (alts) { return alts.slice(); });
      finalText = lastFinals.map(function (alts) { return alts[0]; }).join(" ");
      feedback(finalText);
      const take = takeId = serial;
      restarts = 0; windowOpen = true;
      // Slow readers get up to a minute; the shorter inactivity watchdog still
      // detects a dead recognizer. Each real result refreshes that watchdog.
      timer = env.setTimeout(function () { if (!disposed && !awarded && take === serial) { log("timeout"); finishAttempt(); } }, 60000);
      // Quiet restarts are allowed only inside this window (longer sentences get longer).
      windowTimer = env.setTimeout(function () { windowTimer = null; windowOpen = false; }, maxWindowMs());
      startRecognizer(false, false);
    }
    function startRecognizer(isRestart, secondTry) {
      const id = serial;
      let recognizer;
      try { recognizer = new Recognition(); } catch (_) {
        log("mic-create-fail");
        if (isRestart) { finishAttempt(); return; }
        permanentBlock = true;
        releasePrimedAudio();
        fallback.hidden = false;
        if (concludePress("create-fail", true, false)) return;
        stop("이 브라우저에서 음성 인식을 시작할 수 없어요. Safari 또는 Chrome에서 다시 열어 주세요.");
        return;
      }
      active = recognizer;
      segmentHeard = false;
      recognizer.lang = "en-US";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = MAX_ALTERNATIVES;
      const valid = function () { return !disposed && !awarded && active === recognizer && id === serial; };
      const drop = function () {
        recognizer.onresult = recognizer.onerror = recognizer.onend = recognizer.onstart = null;
        try { recognizer.abort(); } catch (_) {}
        if (active === recognizer) active = null;
      };
      recognizer.onstart = function () {
        if (!valid()) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("result-timeout"); }, 12000);
        log(isRestart ? "mic-on again" : "mic-on");
        nodes.status.textContent = isRestart && lastFinals.length ? "듣고 있어요… 이어서 읽어 주세요." : "듣고 있어요… 문장을 끝까지 읽어 주세요.";
        if (isRestart && lastFinals.length) armSilence(recognizer);
      };
      recognizer.onresult = function (event) {
        if (!valid()) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () { if (valid()) { if (finishing) finishAttempt(); else offerRecovery("result-stalled"); } }, finishing ? 2500 : 12000);
        const results = event.results || [], finals = [];
        let tail = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const alts = [];
          const count = Math.min(result.length || 1, MAX_ALTERNATIVES);
          for (let k = 0; k < count; k++) { if (result[k] && typeof result[k].transcript === "string") alts.push(result[k].transcript); }
          if (!alts.length) alts.push("");
          if (result.isFinal) { finals.push(alts); tail = []; } else tail.push(alts);
        }
        tailInterim = !tail.length ? null : tail.length === 1 ? tail[0] : [tail.map(function (alts) { return alts[0]; }).join(" ")];
        const heardNow = finals.concat(tail).some(function (alts) { return !!normalize(alts[0] || ""); });
        if (heardNow) { segmentHeard = true; heardEver = true; }
        // 안드로이드 크롬은 앞에서 들은 말을 다음 결과에 다시 넣어 준다("I" · "I like" · "I like apples").
        // 그대로 이으면 "I I like I like apples"가 되어 맞게 읽어도 틀린다. 겹친 앞 조각은 버린다.
        // Earlier segments (a quiet restart or 이어 읽기) come first, in order. A new
        // full reading, or a fresh start that got at least as far, replaces them.
        // Interim words never earn a pass while she is still reading.
        const fresh = collapseRepeats(finals);
        const joined = carry.length ? collapseRepeats(carry.concat(finals)) : fresh;
        if (carry.length && fresh.length && (anyMatches(sentence.text, fresh) ||
            (anyPrefix(sentence.text, fresh, 0) && heardTokens(fresh.map(function (alts) { return alts[0]; }).join(" ")).length >= heardTokens(carry.map(function (alts) { return alts[0]; }).join(" ")).length))) {
          carry = []; lastFinals = fresh;
        } else lastFinals = joined;
        finalText = lastFinals.map(function (alts) { return alts[0]; }).join(" ");
        const shown = lastFinals.map(function (alts) { return [alts[0]]; }).concat(tail.map(function (alts) { return [alts[0]]; }));
        feedback(collapseRepeats(shown).map(function (alts) { return alts[0]; }).join(" "));
        if (finals.length) log("result " + lastFinals.length + "/" + results.length);
        if (restarts && heardNow) armSilence(recognizer);
        env.clearTimeout(interimTimer); interimTimer = null;
        if (lastFinals.length && anyMatches(sentence.text, lastFinals)) {
          award();
          return;
        }
        // 2026-11-15 실측(데스크톱 Chrome·실제 구글 인식): 말이 끝난 뒤 입력이 아주 조용하면 문장 전체가
        // 중간 결과로만 12초 넘게 머물러 '응답 없음'으로 처리되고 맞게 읽은 문장을 잃었다. 중간 결과가 이미
        // 문장 전체와 맞고 INTERIM_SETTLE_MS 동안 새 결과가 없으면 '다 읽었어요'와 같이 마무리한다(stop → 최종 결과로 채점).
        if (tail.length && !finishing && anyMatches(sentence.text, collapseRepeats(lastFinals.concat([tailInterim || [""]])))) {
          interimTimer = env.setTimeout(function () {
            interimTimer = null;
            if (valid() && !finishing) { log("interim-settle"); finishListening(); }
          }, INTERIM_SETTLE_MS);
        }
        if (finalText && !anyPrefix(sentence.text, lastFinals) && !mayStillBeReading() && Array.from(results).every(function (result) { return result.isFinal; })) {
          finishAttempt();
        } else {
          nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요.";
        }
      };
      recognizer.onerror = function (event) {
        if (!valid()) return;
        const code = (event && event.error) || "unknown";
        log("error " + code + (isRestart ? " after-restart " + restarts : ""));
        sealInterim();
        if (lastFinals.length && anyMatches(sentence.text, lastFinals)) { award(); return; }
        // A child's pause or an interrupted audio session is not an attempt: listen again quietly.
        if ((code === "no-speech" || code === "aborted") && !finishing && canRestart()) { restartListening(code, recognizer); return; }
        if (finalText && anyPrefix(sentence.text, lastFinals)) carry = lastFinals.map(function (alts) { return alts.slice(); });
        noteCoverage();
        const permanent = PERMANENT_ERRORS[code] === true;
        if (permanent) permanentBlock = true;
        fallback.hidden = false;
        releasePrimedAudio();
        if (concludePress("error " + code, !permanent && code !== "no-speech", lastFinals.length > 0)) return;
        stop(errorMessage(code));
        showRecoveryButton();
      };
      recognizer.onend = function () {
        if (!valid()) return;
        log("end");
        sealInterim();
        if (lastFinals.length && anyMatches(sentence.text, lastFinals)) { active = null; award(); return; }
        // iOS Safari ends at a short pause even in continuous mode: keep the take going.
        if (!finishing && canRestart()) { restartListening("end", recognizer); return; }
        active = null;
        finishAttempt();
      };
      if (isRestart) {
        // A restart that never reports onstart (possible on iOS) ends the take with what was heard.
        healthTimer = env.setTimeout(function () { if (valid()) { log("restart-start-timeout"); drop(); finishAttempt(); } }, RESTART_START_MS);
      } else {
        healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("start-timeout"); }, (session.lastClip || session.silent) ? 4000 : 12000);
        nodes.status.textContent = "마이크를 준비하고 있어요…";
      }
      controls();
      try { recognizer.start(); log(isRestart ? "start again" : "start"); }
      catch (error) {
        log("start-fail " + String((error && error.name) || "error").replace(/[^\w-]/g, ""));
        drop();
        env.clearTimeout(healthTimer); healthTimer = null;
        if (isRestart) { finishAttempt(); return; }
        // InvalidStateError: the previous session had not let go yet. One immediate fresh try.
        if (!secondTry) { startRecognizer(false, true); return; }
        fallback.hidden = false;
        releasePrimedAudio();
        if (concludePress("start-fail", true, false)) return;
        stop("마이크를 시작하지 못했어요. ‘마이크 다시 켜기’를 눌러 주세요. 틀린 게 아니에요.");
        showRecoveryButton();
      }
    }
    nodes.mic.addEventListener("click", read);
    nodes.stop.addEventListener("click", function () {
      if (disposed || awarded) return;
      if (soundActive) { stop(); read(); }
      else if (active) finishListening();
      else if (restarting) { env.clearTimeout(restartTimer); restartTimer = null; restarting = false; finishAttempt(); }
    });
    const hide = function () { if (doc.hidden) { if (active) resetFlow(); stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); releasePrimedAudio(); if (awarded) completePass(); } };
    const leave = function () { if (active) resetFlow(); stop(); releasePrimedAudio(); if (awarded) completePass(); };
    const offline = function () { resetFlow(); fallback.hidden = false; stop("인터넷 연결 후 다시 읽어 주세요. 다른 공부는 계속할 수 있어요."); releasePrimedAudio(); if (awarded) completePass(); };
    const online = function () { controls(); if (!disposed && !awarded && !active && !soundActive) nodes.status.textContent = "인터넷이 연결됐어요. 읽어 보기를 눌러 다시 시작해요."; };
    doc.addEventListener("visibilitychange", hide);
    env.addEventListener("pagehide", leave);
    env.addEventListener("offline", offline);
    env.addEventListener("online", online);
    controls();
    if (!Recognition && /SamsungBrowser/i.test(nav.userAgent || "")) { fallback.hidden = false; nodes.status.textContent = "삼성 인터넷에서는 음성 인식이 안 돼요. 갤럭시 탭은 Chrome으로 PLAYGROUND를 열어 주세요."; }
    else if (!Recognition || env.isSecureContext === false) { fallback.hidden = false; nodes.status.textContent = "이 환경에서는 음성 인식을 쓸 수 없어요. HTTPS PLAYGROUND를 Safari 또는 Chrome에서 열어 주세요. 다른 공부는 계속할 수 있어요."; }
    else if (env.navigator.onLine === false) offline();
    return {
      stop: function () { stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); },
      destroy: function () {
        disposed = true; stop();
        detachAudio();
        releasePrimedAudio();
        doc.removeEventListener("visibilitychange", hide);
        env.removeEventListener("pagehide", leave);
        env.removeEventListener("offline", offline);
        env.removeEventListener("online", online);
        container.classList.remove("reading-practice");
      }
    };
  }
  const api = { sentences: sentences, situations: SITUATIONS, chooseFocus: chooseFocus, recordFocus: recordFocus, cleanFocus: cleanFocus, focusCounts: focusCounts, openSize: OPEN_SIZE, masterDays: MASTER_DAYS, reviewShare: REVIEW_SHARE, sentenceClip: sentenceClip, linePlan: linePlan, normalize: normalize, matches: matches, sameWord: sameWord, aliases: ALIASES, isPrefix: isPrefix, alternativeTexts: alternativeTexts, anyMatches: anyMatches, collapseRepeats: collapseRepeats, wordClips: WORD_CLIPS, praiseFile: praiseFile, matchedWords: matchedWords, cleanWordScores: cleanWordScores, chooseSentence: chooseSentence, recentLimit: RECENT_LIMIT, maxLevel: MAX_LEVEL, levelNames: LEVEL_NAMES, passesToLevelUp: PASSES_TO_LEVEL_UP, clampLevel: clampLevel, createFeedbackSession: createFeedbackSession, choosePraise: choosePraise, retryWords: retryWords, mount: mount,
    candidateTexts: candidateTexts, anyPrefix: anyPrefix, matchScore: matchScore, coveredWords: coveredWords, stuckRequired: stuckRequired,
    phoneticKey: phoneticKey, allowedSlips: allowedSlips,
    limits: { stuckTries: STUCK_TRIES, stuckShare: STUCK_SHARE, maxRestarts: MAX_RESTARTS, silenceMs: SILENCE_MS, restartDelayMs: RESTART_DELAY_MS,
      restartStartMs: RESTART_START_MS, windowBaseMs: WINDOW_BASE_MS, windowPerWordMs: WINDOW_PER_WORD_MS, windowMaxMs: WINDOW_MAX_MS, freeMissingMinWords: FREE_MISSING_MIN_WORDS, diagKeep: DIAG_KEEP } };
  api.mountCelebration = mountCelebration;
  api.noteListen = noteListen;
  api.recordGentle = recordGentle;
  api.gentleRetire = GENTLE_RETIRE;
  api.listenSettle = { ms: LISTEN_SETTLE_MS, maxMs: LISTEN_SETTLE_MAX_MS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EnglishReading = api;
})(typeof window !== "undefined" ? window : globalThis);
