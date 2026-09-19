(function (root) {
  "use strict";
  const sentences = [
    ["I like apples.", "나는 사과를 좋아해요."],
    ["I see a cat.", "고양이가 보여요."],
    ["This is my book.", "이것은 내 책이에요."],
    ["I can run.", "나는 달릴 수 있어요."],
    ["The sun is bright.", "해가 밝아요."],
    ["I like milk.", "나는 우유를 좋아해요."],
    ["This is my family.", "우리 가족이에요."],
    ["I have a dog.", "나는 강아지가 있어요."],
    ["The bird can fly.", "새는 날 수 있어요."],
    ["I am happy.", "나는 행복해요."],
    ["I see a red flower.", "빨간 꽃이 보여요."],
    ["We can play together.", "우리는 함께 놀 수 있어요."],
    ["I wash my hands.", "나는 손을 씻어요."],
    ["Please open the door.", "문을 열어 주세요."],
    ["Thank you very much.", "정말 고마워요."],
    ["I love my family.", "나는 우리 가족을 사랑해요."],
    ["I see a big dog.", "큰 강아지가 보여요."],
    ["I have a red ball.", "나는 빨간 공이 있어요."],
    ["I can jump.", "나는 뛸 수 있어요."],
    ["I can swim.", "나는 수영할 수 있어요."],
    ["The cat is small.", "고양이는 작아요."],
    ["The dog is big.", "강아지는 커요."],
    ["I like bananas.", "나는 바나나를 좋아해요."],
    ["I like my mom.", "나는 엄마를 좋아해요."],
    ["I love my dad.", "나는 아빠를 사랑해요."],
    ["This is my bag.", "이것은 내 가방이에요."],
    ["This is a pen.", "이것은 펜이에요."],
    ["I have two cats.", "나는 고양이 두 마리가 있어요."],
    ["I see three birds.", "새 세 마리가 보여요."],
    ["The sky is blue.", "하늘은 파래요."],
    ["The grass is green.", "풀은 초록색이에요."],
    ["The apple is red.", "사과는 빨개요."],
    ["I like the moon.", "나는 달을 좋아해요."],
    ["The moon is round.", "달은 둥글어요."],
    ["I see a star.", "별이 보여요."],
    ["Good morning, Mom.", "엄마, 좋은 아침이에요."],
    ["Good night, Dad.", "아빠, 안녕히 주무세요."],
    ["I am a girl.", "나는 여자아이예요."],
    ["You are my friend.", "너는 내 친구야."],
    ["We are happy.", "우리는 행복해요."],
    ["It is a fish.", "그것은 물고기예요."],
    ["The fish can swim.", "물고기는 수영할 수 있어요."],
    ["I can sing.", "나는 노래할 수 있어요."],
    ["I sing a song.", "나는 노래를 불러요."],
    ["I can jump high.", "나는 높이 뛸 수 있어요."],
    ["We go home.", "우리는 집에 가요."],
    ["I go to school.", "나는 학교에 가요."],
    ["I like my school.", "나는 우리 학교를 좋아해요."],
    ["The bus is yellow.", "버스는 노란색이에요."],
    ["I have a pink hat.", "나는 분홍 모자가 있어요."],
    ["I eat an egg.", "나는 달걀을 먹어요."],
    ["I drink water.", "나는 물을 마셔요."],
    ["I like ice cream.", "나는 아이스크림을 좋아해요."],
    ["The rabbit is white.", "토끼는 하얘요."],
    ["The pig is pink.", "돼지는 분홍색이에요."],
    ["I see a frog.", "개구리가 보여요."],
    ["The frog can jump.", "개구리는 뛸 수 있어요."],
    ["It is hot.", "더워요."],
    ["It is cold.", "추워요."],
    ["I have a blue cup.", "나는 파란 컵이 있어요."],
    ["Please sit down.", "앉아 주세요."],
    ["Please come here.", "이리 와 주세요."],
    ["Thank you, Mom.", "엄마, 고마워요."],
    ["I am seven.", "나는 일곱 살이에요."],
    ["Happy birthday, Dad.", "아빠, 생일 축하해요."],
    ["I love you.", "사랑해요."],
    ["See you soon.", "곧 만나요."],
    ["The bird is small.", "새는 작아요."]
  ].map(function (pair) { return { text: pair[0], meaning: pair[1], level: 1 }; });
  // 원래 68문장 중 5단어짜리 다섯 개는 2단계로 옮긴다.
  sentences.forEach(function (sentence) { if (sentence.text.split(/\s+/).length >= 5) sentence.level = 2; });
  // 2단계: 5~8단어 한 문장. 3단계: 짧은 두 문장 이어 읽기.
  const LEVEL_TWO = [
    ["I like to eat red apples.", "나는 빨간 사과 먹는 걸 좋아해요."],
    ["The big dog can run fast.", "큰 강아지는 빨리 달릴 수 있어요."],
    ["My mom and dad love me.", "엄마 아빠는 나를 사랑해요."],
    ["I can see the moon at night.", "밤에 달이 보여요."],
    ["The little cat is on the bed.", "작은 고양이가 침대 위에 있어요."],
    ["We go to school in the morning.", "우리는 아침에 학교에 가요."],
    ["I have a blue bag and a pen.", "나는 파란 가방과 펜이 있어요."],
    ["The birds sing in the tree.", "새들이 나무에서 노래해요."],
    ["Please open the door for me.", "문 좀 열어 주세요."],
    ["I want to drink cold water.", "차가운 물을 마시고 싶어요."],
    ["The frog can jump very high.", "개구리는 아주 높이 뛸 수 있어요."],
    ["My friend has a pink hat.", "내 친구는 분홍 모자가 있어요."],
    ["We can play ball together.", "우리는 같이 공놀이를 할 수 있어요."],
    ["The sun is hot and bright.", "해가 뜨겁고 밝아요."],
    ["I wash my hands before I eat.", "나는 먹기 전에 손을 씻어요."],
    ["There are three fish in the water.", "물속에 물고기 세 마리가 있어요."],
    ["The rabbit likes to eat grass.", "토끼는 풀 먹는 걸 좋아해요."],
    ["I sing a happy song with Mom.", "엄마랑 신나는 노래를 불러요."],
    ["The bus is big and yellow.", "버스는 크고 노란색이에요."],
    ["We swim in the blue water.", "우리는 파란 물에서 수영해요."],
    ["I see two white birds in the sky.", "하늘에 하얀 새 두 마리가 보여요."],
    ["This is my new green book.", "이건 내 새 초록색 책이에요."],
    ["The ice cream is very cold.", "아이스크림이 아주 차가워요."],
    ["Come here and sit with me.", "이리 와서 나랑 같이 앉아요."],
    ["My dad can swim very well.", "아빠는 수영을 아주 잘해요."],
    ["I like the star in the sky.", "나는 하늘의 별이 좋아요."],
    ["The pig and the cat are friends.", "돼지랑 고양이는 친구예요."],
    ["I am happy to see you.", "만나서 기뻐요."],
    ["Thank you for the red flower.", "빨간 꽃 고마워요."],
    ["We eat an egg in the morning.", "우리는 아침에 달걀을 먹어요."]
  ];
  const LEVEL_THREE = [
    ["I see a cat. It is very small.", "고양이가 보여요. 아주 작아요."],
    ["The sun is up. Good morning, Mom!", "해가 떴어요. 엄마, 좋은 아침이에요!"],
    ["I have a dog. We play every day.", "나는 강아지가 있어요. 우리는 날마다 놀아요."],
    ["It is cold. I want a hot drink.", "추워요. 따뜻한 음료를 마시고 싶어요."],
    ["Look at the sky. The moon is round.", "하늘을 봐요. 달이 둥글어요."],
    ["I can swim. The water is not cold.", "나는 수영할 수 있어요. 물이 차갑지 않아요."],
    ["My bag is blue. My hat is red.", "내 가방은 파란색이에요. 내 모자는 빨간색이에요."],
    ["We sing a song. It is fun!", "우리는 노래를 불러요. 재미있어요!"],
    ["The frog is green. It can jump high.", "개구리는 초록색이에요. 높이 뛸 수 있어요."],
    ["Open the book. We can read together.", "책을 펴요. 우리 같이 읽을 수 있어요."],
    ["I am hungry. Can I eat an apple?", "배고파요. 사과 먹어도 돼요?"],
    ["Wash your hands. Then we can eat.", "손을 씻어요. 그다음에 먹을 수 있어요."],
    ["The birds can fly. I can run.", "새는 날 수 있어요. 나는 달릴 수 있어요."],
    ["It is my birthday. I am seven now!", "내 생일이에요. 이제 일곱 살이에요!"],
    ["Mom is home. I run to the door.", "엄마가 집에 왔어요. 나는 문으로 달려가요."],
    ["The ice cream is pink. I love it!", "아이스크림이 분홍색이에요. 너무 좋아요!"],
    ["I see three stars. They are bright.", "별 세 개가 보여요. 밝게 빛나요."],
    ["Good night, Dad. See you in the morning.", "아빠, 잘 자요. 아침에 만나요."],
    ["My friend is here. We play ball.", "친구가 왔어요. 우리는 공놀이를 해요."],
    ["The pig is pink. The cat is white.", "돼지는 분홍색이에요. 고양이는 하얀색이에요."]
  ];
  LEVEL_TWO.forEach(function (pair) { sentences.push({ text: pair[0], meaning: pair[1], level: pair[0].split(/\s+/).length <= 6 ? 2 : 3 }); });
  LEVEL_THREE.forEach(function (pair) { sentences.push({ text: pair[0], meaning: pair[1], level: 4 }); });
  // 8단계: 1 짧은 문장 · 2 5~6단어 · 3 7~8단어 · 4 짧은 두 문장 · 5 묻고 답하기 · 6 지난 일 말하기 · 7 세 문장 이야기 · 8 네 문장 그림책 한 쪽
  const LEVEL_MORE = {
    2: [
      ["I can ride my red bike.", "나는 빨간 자전거를 탈 수 있어요."],
      ["The cat is under the table.", "고양이가 탁자 밑에 있어요."],
      ["My sister likes pink flowers.", "내 여동생은 분홍 꽃을 좋아해요."],
      ["We have milk and bread.", "우리는 우유와 빵이 있어요."],
      ["The dog runs to me.", "강아지가 나에게 달려와요."],
      ["I can draw a big star.", "나는 큰 별을 그릴 수 있어요."],
      ["Dad reads a book to me.", "아빠가 나에게 책을 읽어 줘요."],
      ["The baby is sleeping now.", "아기가 지금 자고 있어요."]
    ],
    3: [
      ["I put on my shoes and go outside.", "나는 신발을 신고 밖에 나가요."],
      ["The little bird sings a song for me.", "작은 새가 나를 위해 노래해요."],
      ["My brother and I play in the park.", "동생과 나는 공원에서 놀아요."],
      ["Mom makes a cake for my birthday.", "엄마가 내 생일 케이크를 만들어요."],
      ["The yellow duck swims in the pond.", "노란 오리가 연못에서 헤엄쳐요."],
      ["I brush my teeth every morning and night.", "나는 아침저녁으로 이를 닦아요."],
      ["We can see many stars at night.", "밤에는 별을 많이 볼 수 있어요."],
      ["The big bear likes to eat honey.", "큰 곰은 꿀 먹는 걸 좋아해요."],
      ["I help my mom wash the dishes.", "나는 엄마가 설거지하는 걸 도와요."],
      ["The children are playing with a red ball.", "아이들이 빨간 공으로 놀고 있어요."],
      ["My grandma gives me a warm hug.", "할머니가 나를 따뜻하게 안아 줘요."],
      ["The rabbit has two long white ears.", "토끼는 길고 하얀 귀가 두 개 있어요."],
      ["I read a book before I sleep.", "나는 자기 전에 책을 읽어요."],
      ["We go to the beach in summer.", "우리는 여름에 바닷가에 가요."],
      ["The green frog sits on a leaf.", "초록 개구리가 나뭇잎 위에 앉아 있어요."],
      ["My dad and I build a sandcastle.", "아빠와 나는 모래성을 쌓아요."],
      ["The rain is falling on my umbrella.", "비가 내 우산 위로 떨어져요."],
      ["I share my toys with my friends.", "나는 친구들과 장난감을 나눠 써요."],
      ["The monkey climbs up the tall tree.", "원숭이가 키 큰 나무에 올라가요."],
      ["We eat lunch together at school today.", "우리는 오늘 학교에서 같이 점심을 먹어요."]
    ],
    4: [
      ["It is raining. I have an umbrella.", "비가 와요. 나는 우산이 있어요."],
      ["Look at the cat. It is sleeping.", "고양이를 봐요. 자고 있어요."],
      ["I like red. My sister likes blue.", "나는 빨강이 좋아요. 여동생은 파랑을 좋아해요."],
      ["The dog is hungry. It wants food.", "강아지가 배고파요. 밥을 먹고 싶어 해요."],
      ["We are at the park. It is fun!", "우리는 공원에 있어요. 재미있어요!"],
      ["My brother is little. He is five.", "내 동생은 작아요. 다섯 살이에요."],
      ["I lost my hat. Where is it?", "모자를 잃어버렸어요. 어디 있지?"],
      ["The flower is pretty. It smells good.", "꽃이 예뻐요. 좋은 냄새가 나요."],
      ["Mom is cooking dinner. It smells yummy!", "엄마가 저녁을 만들어요. 맛있는 냄새가 나요!"],
      ["My hands are dirty. I wash them.", "손이 더러워요. 손을 씻어요."]
    ],
    5: [
      ["What is this? It is a pen.", "이게 뭐예요? 펜이에요."],
      ["Where is my cat? It is under the bed.", "내 고양이 어디 있어요? 침대 밑에 있어요."],
      ["Do you like apples? Yes, I do.", "사과 좋아해요? 네, 좋아해요."],
      ["Can you swim? Yes, I can.", "수영할 수 있어요? 네, 할 수 있어요."],
      ["How old are you? I am seven.", "몇 살이에요? 일곱 살이에요."],
      ["What color is it? It is blue.", "무슨 색이에요? 파란색이에요."],
      ["Is it hot today? No, it is cold.", "오늘 더워요? 아니요, 추워요."],
      ["Where is Dad? He is in the kitchen.", "아빠 어디 계세요? 부엌에 계세요."],
      ["Do you have a pencil? Yes, I have two.", "연필 있어요? 네, 두 개 있어요."],
      ["What do you want? I want some water.", "뭘 원해요? 물을 좀 마시고 싶어요."],
      ["Who is she? She is my teacher.", "저 사람은 누구예요? 우리 선생님이에요."],
      ["Can you jump high? Yes, look at me!", "높이 뛸 수 있어요? 네, 나를 봐요!"],
      ["Is this your bag? No, it is not.", "이거 네 가방이야? 아니, 아니야."],
      ["Are you hungry? Yes, I am very hungry.", "배고파요? 네, 아주 배고파요."],
      ["Where are you going? I am going to school.", "어디 가요? 학교에 가요."],
      ["What do you see? I see a rainbow.", "뭐가 보여요? 무지개가 보여요."],
      ["Do you like dogs? Yes, I love dogs.", "강아지 좋아해요? 네, 아주 좋아해요."],
      ["How are you? I am fine, thank you.", "잘 지내요? 잘 지내요, 고마워요."],
      ["Who is at the door? It is Grandma.", "문 앞에 누구예요? 할머니예요."],
      ["Can I have one? Yes, you can.", "하나 가져도 돼요? 네, 돼요."],
      ["Is the baby sleeping? Yes, she is.", "아기가 자요? 네, 자요."],
      ["What is in the box? It is a toy car.", "상자 안에 뭐가 있어요? 장난감 자동차예요."],
      ["Where is the ball? It is on the grass.", "공이 어디 있어요? 풀밭 위에 있어요."],
      ["Do you want to play? Yes, I want to play!", "놀고 싶어요? 네, 놀고 싶어요!"],
      ["What are you eating? I am eating a banana.", "뭘 먹어요? 바나나를 먹어요."],
      ["Is it your birthday? Yes, it is my birthday!", "오늘 생일이에요? 네, 내 생일이에요!"],
      ["Are you tired? Yes, I want to sleep.", "피곤해요? 네, 자고 싶어요."],
      ["What is your favorite color? It is pink.", "가장 좋아하는 색이 뭐예요? 분홍색이에요."],
      ["Can the bird fly? Yes, it can fly.", "새는 날 수 있어요? 네, 날 수 있어요."],
      ["Who has my pencil? My brother has it.", "누가 내 연필을 가졌어요? 동생이 가졌어요."]
    ],
    6: [
      ["I played with my dog yesterday.", "나는 어제 강아지랑 놀았어요."],
      ["We went to the zoo last Sunday.", "우리는 지난 일요일에 동물원에 갔어요."],
      ["I saw a big lion at the zoo.", "나는 동물원에서 큰 사자를 봤어요."],
      ["Mom made pancakes this morning.", "엄마가 오늘 아침에 팬케이크를 만들었어요."],
      ["I drank a glass of milk.", "나는 우유 한 잔을 마셨어요."],
      ["Dad washed the car yesterday.", "아빠는 어제 세차를 했어요."],
      ["We ate pizza for dinner.", "우리는 저녁으로 피자를 먹었어요."],
      ["I was very happy today.", "나는 오늘 아주 행복했어요."],
      ["The cat jumped on the bed.", "고양이가 침대 위로 뛰어올랐어요."],
      ["It rained all day yesterday.", "어제는 하루 종일 비가 왔어요."],
      ["I found a pretty shell at the beach.", "나는 바닷가에서 예쁜 조개껍데기를 찾았어요."],
      ["My brother cried because he fell down.", "동생이 넘어져서 울었어요."],
      ["We sang a song at school.", "우리는 학교에서 노래를 불렀어요."],
      ["I cleaned my room this morning.", "나는 오늘 아침에 방을 치웠어요."],
      ["The bird flew over the house.", "새가 집 위로 날아갔어요."],
      ["Grandma gave me a new book.", "할머니가 나에게 새 책을 주셨어요."],
      ["I finished my homework last night.", "나는 어젯밤에 숙제를 다 했어요."],
      ["We walked to the park together.", "우리는 같이 공원까지 걸어갔어요."],
      ["The baby laughed at the funny dog.", "아기가 웃긴 강아지를 보고 웃었어요."],
      ["I lost my red pencil today.", "나는 오늘 빨간 연필을 잃어버렸어요."],
      ["Dad cooked noodles for lunch.", "아빠가 점심으로 국수를 만들었어요."],
      ["We played soccer after school.", "우리는 방과 후에 축구를 했어요."],
      ["I drew a picture of my family.", "나는 우리 가족 그림을 그렸어요."],
      ["The snowman melted in the sun.", "눈사람이 햇볕에 녹았어요."],
      ["My friend came to my house.", "친구가 우리 집에 왔어요."],
      ["I helped Mom carry the bags.", "나는 엄마가 가방 드는 걸 도왔어요."],
      ["We watched a movie on Saturday.", "우리는 토요일에 영화를 봤어요."],
      ["The frog jumped into the pond.", "개구리가 연못으로 뛰어들었어요."],
      ["I got a star from my teacher.", "나는 선생님께 별을 받았어요."],
      ["We had a picnic in the park.", "우리는 공원에서 소풍을 했어요."]
    ],
    7: [
      ["The cat is on the tree. It cannot come down. Dad helps the cat.", "고양이가 나무 위에 있어요. 내려오지 못해요. 아빠가 고양이를 도와줘요."],
      ["I have a little dog. His name is Max. He likes to run.", "나는 작은 강아지가 있어요. 이름은 맥스예요. 달리기를 좋아해요."],
      ["It is snowing. We make a snowman. He has a red hat.", "눈이 와요. 우리는 눈사람을 만들어요. 빨간 모자를 썼어요."],
      ["Mom bakes cookies. They smell so good. I eat two cookies.", "엄마가 쿠키를 구워요. 냄새가 정말 좋아요. 나는 쿠키 두 개를 먹어요."],
      ["The sun goes down. The sky is orange. It is time for bed.", "해가 져요. 하늘이 주황색이에요. 잘 시간이에요."],
      ["I plant a seed. I give it water. It grows into a flower.", "씨앗을 심어요. 물을 줘요. 꽃으로 자라요."],
      ["My brother is sad. He lost his toy. I help him find it.", "동생이 슬퍼해요. 장난감을 잃어버렸어요. 내가 찾는 걸 도와줘요."],
      ["We go to the beach. The water is cold. We build a sandcastle.", "바닷가에 가요. 물이 차가워요. 모래성을 쌓아요."],
      ["A little bird is hungry. I give it some bread. It sings for me.", "작은 새가 배고파요. 빵을 좀 줘요. 새가 나를 위해 노래해요."],
      ["I wake up early. I brush my teeth. Then I eat breakfast.", "일찍 일어나요. 이를 닦아요. 그다음 아침을 먹어요."],
      ["The rabbit runs fast. The turtle walks slowly. But the turtle wins!", "토끼는 빨리 달려요. 거북이는 천천히 걸어요. 하지만 거북이가 이겨요!"],
      ["It is my birthday. My friends come to my party. We eat a big cake.", "내 생일이에요. 친구들이 파티에 와요. 큰 케이크를 먹어요."],
      ["The dog finds a ball. He brings it to me. I throw it again.", "강아지가 공을 찾아요. 나에게 가져와요. 다시 던져요."],
      ["We go to the library. I find a book about dinosaurs. I read it with Mom.", "도서관에 가요. 공룡 책을 찾아요. 엄마랑 같이 읽어요."],
      ["The wind is strong. My kite flies high. I hold the string tight.", "바람이 세요. 연이 높이 날아요. 줄을 꽉 잡아요."],
      ["I fall down in the park. My knee hurts. Mom gives me a hug.", "공원에서 넘어졌어요. 무릎이 아파요. 엄마가 안아 줘요."],
      ["The frog sits on a leaf. A fly comes near. The frog eats the fly!", "개구리가 나뭇잎에 앉아 있어요. 파리가 가까이 와요. 개구리가 파리를 먹어요!"],
      ["Grandpa has a garden. He grows tomatoes. I help him pick them.", "할아버지는 텃밭이 있어요. 토마토를 길러요. 나는 따는 걸 도와드려요."],
      ["The moon is round tonight. The stars are bright. I make a wish.", "오늘 밤 달이 둥글어요. 별이 밝아요. 소원을 빌어요."],
      ["My shoes are too small. My feet have grown. We buy new shoes.", "신발이 너무 작아요. 발이 자랐어요. 새 신발을 사요."],
      ["The bus is late. We wait at the stop. Here it comes!", "버스가 늦어요. 정류장에서 기다려요. 저기 와요!"],
      ["I paint a picture. I use blue and green. It is a picture of the sea.", "그림을 그려요. 파랑과 초록을 써요. 바다 그림이에요."],
      ["The baby is crying. She is hungry. Mom gives her some milk.", "아기가 울어요. 배가 고파요. 엄마가 우유를 줘요."],
      ["We go camping. We sleep in a tent. We see many stars.", "캠핑을 가요. 텐트에서 자요. 별을 많이 봐요."],
      ["The monkey sees a banana. He climbs the tree. He eats the banana happily.", "원숭이가 바나나를 봐요. 나무에 올라가요. 신나게 바나나를 먹어요."],
      ["I have a new friend. She sits next to me. We play together at lunch.", "새 친구가 생겼어요. 내 옆에 앉아요. 점심시간에 같이 놀아요."],
      ["It is cold outside. I wear my coat. I wear my hat too.", "밖이 추워요. 코트를 입어요. 모자도 써요."],
      ["The fish swims in the tank. It is orange and white. I feed it every day.", "물고기가 어항에서 헤엄쳐요. 주황색과 하얀색이에요. 날마다 밥을 줘요."],
      ["Dad reads me a story. It is about a dragon. I fall asleep.", "아빠가 이야기를 읽어 줘요. 용 이야기예요. 나는 잠이 들어요."],
      ["The leaves are falling. They are red and yellow. I jump in the leaves.", "나뭇잎이 떨어져요. 빨갛고 노래요. 나뭇잎 속으로 뛰어들어요."]
    ],
    8: [
      ["There was a little pig. He built a brick house. The wolf blew hard. The house did not fall.", "작은 돼지가 있었어요. 벽돌집을 지었어요. 늑대가 세게 불었어요. 집은 무너지지 않았어요."],
      ["A girl wore a red hood. She walked to see her grandma. She met a wolf. The wolf was not nice.", "한 소녀가 빨간 두건을 썼어요. 할머니를 보러 걸어갔어요. 늑대를 만났어요. 늑대는 착하지 않았어요."],
      ["The hare was very fast. The tortoise was very slow. The hare took a nap. The tortoise won the race.", "토끼는 아주 빨랐어요. 거북이는 아주 느렸어요. 토끼는 낮잠을 잤어요. 거북이가 경주에서 이겼어요."],
      ["Jack had a cow. He sold it for magic beans. The beans grew very tall. Jack climbed up to the sky.", "잭에게 소가 있었어요. 요술 콩과 바꿨어요. 콩이 아주 높이 자랐어요. 잭은 하늘까지 올라갔어요."],
      ["Today is Sunday. We go to the park. I ride my bike. My brother plays in the sand.", "오늘은 일요일이에요. 공원에 가요. 나는 자전거를 타요. 동생은 모래에서 놀아요."],
      ["I have a garden. I grow carrots and beans. A rabbit comes every day. I give him one carrot.", "나는 텃밭이 있어요. 당근과 콩을 길러요. 토끼가 날마다 와요. 당근 하나를 줘요."],
      ["It is a rainy day. We stay inside. We build a fort with blankets. We read books in our fort.", "비 오는 날이에요. 집 안에 있어요. 이불로 요새를 만들어요. 요새에서 책을 읽어요."],
      ["My tooth is loose. It wiggles and wiggles. Then it falls out. I put it under my pillow.", "이가 흔들려요. 흔들흔들해요. 그러다 빠져요. 베개 밑에 넣어요."],
      ["The duck has five babies. They walk in a line. They jump into the pond. They swim after their mom.", "오리에게 아기가 다섯 마리 있어요. 줄지어 걸어요. 연못에 뛰어들어요. 엄마를 따라 헤엄쳐요."],
      ["I want to be a doctor. I will help sick people. I will be kind. People will feel better.", "나는 의사가 되고 싶어요. 아픈 사람을 도울 거예요. 친절할 거예요. 사람들이 나아질 거예요."],
      ["We made a card for Dad. We drew a big heart. We wrote I love you. Dad smiled and hugged us.", "아빠에게 줄 카드를 만들었어요. 큰 하트를 그렸어요. 사랑해요라고 썼어요. 아빠가 웃으며 안아 줬어요."],
      ["A small mouse helped a lion. The lion was in a net. The mouse cut the net. Now they are friends.", "작은 생쥐가 사자를 도왔어요. 사자는 그물에 걸렸어요. 생쥐가 그물을 끊었어요. 이제 둘은 친구예요."],
      ["The boy saw a star fall. He made a wish. He wished for a puppy. The next day, he got one!", "소년이 별똥별을 봤어요. 소원을 빌었어요. 강아지를 갖고 싶었어요. 다음 날 강아지가 생겼어요!"],
      ["Snow is falling. The world is white. We put on our boots. We run outside to play.", "눈이 내려요. 세상이 하얘요. 장화를 신어요. 놀러 밖으로 달려가요."],
      ["The bear woke up in spring. He was very hungry. He looked for honey. He found a tree full of bees.", "곰이 봄에 깨어났어요. 아주 배고팠어요. 꿀을 찾았어요. 벌이 가득한 나무를 찾았어요."],
      ["I go to school by bus. My friend sits with me. We talk and laugh. The ride is fun.", "나는 버스로 학교에 가요. 친구가 옆에 앉아요. 이야기하고 웃어요. 가는 길이 즐거워요."],
      ["The princess lost her shoe. The prince found it. He looked for her everywhere. The shoe fit her foot.", "공주가 신발을 잃어버렸어요. 왕자가 찾았어요. 공주를 여기저기 찾았어요. 신발이 공주 발에 맞았어요."],
      ["Mom planted a small seed. We watered it every day. A green sprout came up. Now it is a big sunflower.", "엄마가 작은 씨앗을 심었어요. 날마다 물을 줬어요. 초록 싹이 났어요. 이제 큰 해바라기예요."],
      ["The dog was dirty. We gave him a bath. He shook the water off. Now we are all wet!", "강아지가 더러웠어요. 목욕을 시켰어요. 강아지가 물을 털었어요. 이제 우리가 다 젖었어요!"],
      ["It was dark at night. I heard a noise. I was a little scared. It was only my cat.", "밤이라 어두웠어요. 무슨 소리가 났어요. 조금 무서웠어요. 우리 고양이였어요."],
      ["The class went on a trip. We saw fish and sharks. The shark had big teeth. I liked the turtles best.", "우리 반이 견학을 갔어요. 물고기와 상어를 봤어요. 상어는 이빨이 컸어요. 나는 거북이가 제일 좋았어요."],
      ["Grandma came to visit. She brought a big box. Inside was a teddy bear. I named him Honey.", "할머니가 오셨어요. 큰 상자를 가져오셨어요. 안에 곰 인형이 있었어요. 이름을 허니라고 지었어요."],
      ["The robot can walk and talk. It can clean my room. It can play games with me. I love my robot.", "로봇은 걷고 말할 수 있어요. 내 방을 치울 수 있어요. 나랑 게임도 해요. 내 로봇이 정말 좋아요."],
      ["The caterpillar ate and ate. It made a cocoon. It slept for many days. Then it became a butterfly.", "애벌레가 먹고 또 먹었어요. 고치를 만들었어요. 여러 날 잠을 잤어요. 그러고 나비가 됐어요."],
      ["We baked bread today. We mixed flour and water. We waited for the bread to grow. It smelled so good.", "오늘 빵을 구웠어요. 밀가루와 물을 섞었어요. 빵이 부풀기를 기다렸어요. 냄새가 정말 좋았어요."],
      ["The wind blew my hat away. I ran after it. A kind man caught it. I said thank you.", "바람이 모자를 날려 버렸어요. 쫓아 달려갔어요. 친절한 아저씨가 잡아 줬어요. 고맙다고 했어요."],
      ["I learned to ride a bike. I fell down at first. Dad held the seat. Now I can ride by myself.", "자전거 타기를 배웠어요. 처음엔 넘어졌어요. 아빠가 안장을 잡아 줬어요. 이제 혼자 탈 수 있어요."],
      ["There is a big moon tonight. It looks like a cookie. I want to eat it. Mom laughs at me.", "오늘 밤 큰 달이 떴어요. 쿠키처럼 보여요. 먹고 싶어요. 엄마가 웃어요."],
      ["The little star was lonely. It looked for a friend. It found a bright moon. They shone together all night.", "작은 별은 외로웠어요. 친구를 찾았어요. 밝은 달을 찾았어요. 둘은 밤새 함께 빛났어요."],
      ["The ant worked all summer. The grasshopper sang and played. Winter came. The ant had food, but the grasshopper did not.", "개미는 여름 내내 일했어요. 베짱이는 노래하며 놀았어요. 겨울이 왔어요. 개미는 먹을 게 있었지만 베짱이는 없었어요."]
    ]
  };
  Object.keys(LEVEL_MORE).forEach(function (level) {
    LEVEL_MORE[level].forEach(function (pair) { sentences.push({ text: pair[0], meaning: pair[1], level: Number(level) }); });
  });
  const LEVEL_NAMES = ["", "짧은 문장", "조금 긴 문장", "긴 문장", "두 문장", "묻고 답하기", "지난 일 말하기", "세 문장 이야기", "그림책 한 쪽"];
  const MAX_LEVEL = 8;
  // 한 번에 맞힌 문장이 이만큼 쌓이면 다음 단계로 올라간다.
  const PASSES_TO_LEVEL_UP = 30;
  // 2단계 이상에서 새 단계 문장을 낼 확률. 나머지는 아래 단계 복습.
  const FOCUS_SHARE = 0.75;

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[’‘]/g, "'")
      .replace(/\bi'm\b/g, "i am").replace(/\bcan't\b/g, "cannot")
      .replace(/\bcan not\b/g, "cannot").replace(/[^a-z0-9\s]/g, " ")
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
    soon: ["sun", "soo", "son", "spoon", "sune"]
  };
  function heardTokens(heard) {
    let text = normalize(heard);
    PHRASES.forEach(function (pair) { text = text.split(pair[0]).join(pair[1]); });
    return text ? text.split(" ") : [];
  }
  function sameWord(expected, got) {
    if (expected === got) return true;
    const list = ALIASES[expected];
    return !!list && list.indexOf(got) >= 0;
  }
  // 긴 문장(7·8단계 등)은 인식기가 한두 단어를 잘못 듣거나 빼먹어도 통과시킨다.
  // 10단어 이하는 예전처럼 한 단어도 틀리면 안 된다.
  function allowedSlips(wordCount) {
    return wordCount >= 17 ? 2 : wordCount >= 11 ? 1 : 0;
  }
  function tokenDistance(words, got, limit) {
    let prev = [];
    for (let j = 0; j <= got.length; j++) prev.push(j);
    for (let i = 1; i <= words.length; i++) {
      const row = [i];
      let best = row[0];
      for (let j = 1; j <= got.length; j++) {
        const cost = sameWord(words[i - 1], got[j - 1]) ? 0 : 1;
        row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost));
        if (row[j] < best) best = row[j];
      }
      if (best > limit) return limit + 1;
      prev = row;
    }
    return prev[got.length];
  }
  function matches(expected, heard) {
    const words = normalize(expected) ? normalize(expected).split(" ") : [], got = heardTokens(heard);
    if (!words.length || !got.length) return false;
    const slips = allowedSlips(words.length);
    if (!slips) {
      if (words.length !== got.length) return false;
      return words.every(function (word, i) { return sameWord(word, got[i]); });
    }
    return tokenDistance(words, got, slips) <= slips;
  }
  // True while the heard words are still a valid beginning of the sentence.
  function isPrefix(expected, heard) {
    const words = normalize(expected).split(" "), got = heardTokens(heard);
    if (got.length > words.length) return false;
    return got.every(function (token, i) { return sameWord(words[i], token); });
  }
  // Ordered alignment is feedback, never a partial-credit scoring rule.
  function matchedWords(expected, heard) {
    const words = normalize(expected).split(" "), got = heardTokens(heard);
    let position = 0;
    return words.map(function (word) {
      let index = -1;
      for (let i = position; i < got.length; i++) { if (sameWord(word, got[i])) { index = i; break; } }
      if (index < 0) return false;
      position = index + 1;
      return true;
    });
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
    return alternativeTexts(finals).some(function (text) { return matches(expected, text); });
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
  const FIRST_PRAISE = ["excellent", "perfect", "awesome", "wonderful"];
  const RETRY_PRAISE = ["great", "verygood", "youdidit", "super"];
  const PRAISE_TEXT = { excellent: "Excellent!", perfect: "Perfect!", awesome: "Awesome!", wonderful: "Wonderful!", great: "Great!", verygood: "Very good!", youdidit: "You did it!", super: "Super!", threeinarow: "Three in a row!" };
  const PRAISE_PATH = "assets/study/praise/", WORD_PATH = "assets/study/words/";
  const PRAISE_FILES = { perfect: PRAISE_PATH + "perfect-v2.wav" };
  function praiseFile(clip) { return PRAISE_FILES[clip] || PRAISE_PATH + clip + ".mp3"; }
  const WORD_CLIPS = {};
  sentences.forEach(function (sentence) { normalize(sentence.text).split(" ").forEach(function (word) { WORD_CLIPS[word] = WORD_PATH + word + ".mp3"; }); });
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
  const sessions = new WeakMap();
  const completionPlayed = new WeakSet();
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
  // Diagnostic trail (no transcripts, only event names and codes), kept in
  // memory for the page and shown under the sentence when the URL carries
  // readinglog=1. Nothing is written to storage.
  function record(env, session, event) {
    const now = env.Date ? env.Date.now() : Date.now();
    session.log.push(Math.round(now / 1000) % 100000 + " " + event);
    if (session.log.length > LOG_LIMIT) session.log.splice(0, session.log.length - LOG_LIMIT);
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
    let disposed = false, awarded = false, active = null, serial = 0, timer = null, finalText = "";
    let retried = false, soundActive = false, soundTimer = null, stopTimer = null, passDone = false, stopping = null;
    let audioCtx = null, primedCtx = null, playing = null, healthTimer = null, recovering = false;
    let recoveryButton = null;
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
    const fallback = element("button", "", "마이크가 안 돼요 · 다른 문제 풀기");
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
      "부모님 안내: ‘읽어 보기’ 또는 ‘마이크 복구’를 누를 때만 마이크를 켭니다. 음성은 브라우저의 인식 서비스로 전송될 수 있어요. 복구용 마이크 연결은 즉시 닫으며 녹음하지 않아요. 음성과 인식 문장은 저장하지 않고, 연습할 교재 단어와 복습 횟수만 이 기기에 기억해요. 발음 점수가 아닌 문장 읽기를 확인해요.");
    [label, line, meaning, actions, nodes.status, nodes.heard, privacy].forEach(function (node) { container.appendChild(node); });
    const logNode = showLog ? element("pre", "reading-log") : null;
    if (logNode) container.appendChild(logNode);
    function log(event) {
      record(env, session, event);
      if (logNode && !disposed) logNode.textContent = session.log.join("\n");
    }
    log("mount-v16" + (touchIOS ? " ios-quiet-round" : ""));

    function controls() {
      nodes.mic.disabled = disposed || awarded || recovering || !!active || soundActive || !Recognition || env.isSecureContext === false || env.navigator.onLine === false;
      if (recoveryButton) recoveryButton.disabled = disposed || awarded || recovering || !!active || soundActive || env.navigator.onLine === false;
      nodes.stop.disabled = disposed || awarded || !!stopping || (!active && !soundActive);
      nodes.stop.textContent = soundActive && !awarded ? "안내 멈추고 읽기" : "그만하기";
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
      Array.from(actions.children).forEach(function (node) { if (node.className === 'reading-word-listen') node.hidden = true; });
      recovering = false;
      env.clearTimeout(healthTimer); healthTimer = null;
      env.clearTimeout(timer); timer = null;
      env.clearTimeout(stopTimer); stopTimer = null;
      cancelSound();
      if (stopping) { stopping.onend = null; try { stopping.abort(); } catch (_) {} stopping = null; }
      const previous = active; active = null;
      if (previous) {
        previous.onresult = previous.onerror = previous.onend = previous.onstart = null;
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
      onPass();
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
      nodes.status.appendChild(element("span", "reading-praise", (clip === "threeinarow" ? "🌟 " : "⭐ ") + PRAISE_TEXT[clip]));
      nodes.status.appendChild(element("span", "reading-praise-detail", clip === "threeinarow" ? "세 문장 연속 성공! 최고야!" : retried ? "다시 읽어서 해냈어! 멋져!" : "와! 한 번에 성공! 다음 문장도 가자!"));
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
    function finishAttempt() {
      resetFlow();
      if (finalText && !matches(sentence.text, finalText)) {
        const flags = matchedWords(sentence.text, finalText);
        const words = normalize(sentence.text).split(" ").filter(function (_, i) { return !flags[i]; });
        feedback(finalText, true);
        const spoken = retryWords(sentence.text, finalText);
        log("retry " + spoken.length);
        stop(spoken.length ? "이렇게 읽어요 👂 " + spoken[0] : "문장에 있는 말만 읽어 주세요", function (safe) { speakWords(spoken, safe); });
        if (callbacks.onRetry) callbacks.onRetry(Array.from(new Set(words)));
      } else {
        log("empty");
        stop("잘 듣지 못했어요. 읽어 보기를 눌러 다시 읽어 주세요.");
      }
    }
    function offerRecovery(reason) {
      if (disposed || awarded || recovering) return;
      log(reason);
      resetFlow();
      releasePrimedAudio();
      if (touchIOS) {
        stop('마이크 응답이 멈췄어요. 마이크 다시 켜기를 눌러 연결을 새로 준비해 주세요. 오답으로 세지 않아요.');
        showRecoveryButton();
        return;
      }
      // 소리를 낸 뒤 마이크가 먹통이 되는 기기(iOS WebKit 321436)가 있다.
      // 처음 막히면 묻지 않고 소리를 끈 뒤 마이크를 새로 켠다. 오답으로 세지 않는다.
      if (!session.silent) {
        session.silent = true;
        session.autoRetries = 0;
        detachAudio();
        if (callbacks.onSilent) { try { callbacks.onSilent(); } catch (_) {} }
        log("auto-silent");
        stop("소리를 잠깐 끄고 마이크를 다시 켰어요. 한 번 더 읽어 주세요.");
        env.setTimeout(function () { if (!disposed && !awarded && !nodes.mic.disabled) read(); }, 500);
        return;
      }
      if (session.autoRetries < 2) {
        session.autoRetries++;
        detachAudio();
        log("auto-retry " + session.autoRetries);
        stop("마이크를 다시 켰어요. 한 번 더 읽어 주세요.");
        env.setTimeout(function () { if (!disposed && !awarded && !nodes.mic.disabled) read(); }, 500);
        return;
      }
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
    }
    function recoverMicrophone() {
      if (disposed || awarded || recovering || active || soundActive) return;
      stop();
      session.silent = true;
      releasePrimedAudio();
      log("recovery-tap");
      const devices = env.navigator.mediaDevices;
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
        nodes.status.textContent = "마이크 권한을 확인한 뒤 다시 눌러 주세요. 정답 기록은 그대로예요.";
      });
    }
    function read(rearmed) {
      if (nodes.mic.disabled) return;
      if (touchIOS && completionPlayed.has(env) && rearmed !== true && env.navigator.mediaDevices && env.navigator.mediaDevices.getUserMedia) { recoverMicrophone(); return; }
      stop();
      if (!touchIOS) unlockAudio();
      else session.silent = false;
      finalText = "";
      feedback("");
      const id = serial;
      let recognizer;
      try { recognizer = new Recognition(); } catch (_) {
        resetFlow(); log("mic-create-fail");
        fallback.hidden = false;
        nodes.status.textContent = "이 브라우저에서 음성 인식을 시작할 수 없어요. Safari 또는 Chrome에서 다시 열어 주세요."; return;
      }
      active = recognizer;
      recognizer.lang = "en-US";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = MAX_ALTERNATIVES;
      const valid = function () { return !disposed && !awarded && active === recognizer && id === serial; };
      recognizer.onstart = function () {
        if (!valid()) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("result-timeout"); }, 12000);
        log("mic-on"); nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요.";
      };
      recognizer.onresult = function (event) {
        if (!valid()) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("result-stalled"); }, 12000);
        const finals = [], visible = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const alts = [];
          const count = Math.min(result.length || 1, MAX_ALTERNATIVES);
          for (let k = 0; k < count; k++) { if (result[k] && typeof result[k].transcript === "string") alts.push(result[k].transcript); }
          if (!alts.length) alts.push("");
          visible.push(alts[0]);
          if (result.isFinal) finals.push(alts);
        }
        // 안드로이드 크롬은 앞에서 들은 말을 다음 결과에 다시 넣어 준다("I" · "I like" · "I like apples").
        // 그대로 이으면 "I I like I like apples"가 되어 맞게 읽어도 틀린다. 겹친 앞 조각은 버린다.
        const merged = collapseRepeats(finals);
        finals.length = 0;
        merged.forEach(function (alts) { finals.push(alts); });
        finalText = finals.map(function (alts) { return alts[0]; }).join(" ");
        feedback(collapseRepeats(visible.map(function (text) { return [text]; })).map(function (alts) { return alts[0]; }).join(" "));
        if (finals.length) log("result " + finals.length + "/" + event.results.length);
        if (finals.length && anyMatches(sentence.text, finals)) {
          awarded = true;
          feedback(sentence.text);
          praise();
        } else if (finalText && !isPrefix(sentence.text, finalText)) {
          finishAttempt();
        } else {
          nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요.";
        }
      };
      recognizer.onerror = function (event) {
        if (!valid()) return;
        resetFlow();
        log("error " + (event && event.error));
        if (event.error !== "no-speech" && event.error !== "aborted") fallback.hidden = false;
        const messages = {
          "not-allowed": "마이크 또는 음성 인식 권한을 허용해 주세요. 정답 기록은 바뀌지 않았어요.",
          "service-not-allowed": "음성 인식 서비스를 사용할 수 없어요. Safari의 Siri·받아쓰기 설정을 확인해 주세요.",
          "audio-capture": "마이크를 찾지 못했어요. 연결과 사용 권한을 확인해 주세요.",
          network: "인터넷 연결을 확인하고 다시 읽어 주세요.",
          "no-speech": "목소리를 듣지 못했어요. 마이크 가까이에서 다시 읽어 주세요.",
          "language-not-supported": "영어 음성 인식을 지원하지 않는 기기예요."
        };
        stop(messages[event.error] || "잘 듣지 못했어요. 오답이 아니니 다시 시도해 주세요.");
      };
      recognizer.onend = function () { if (valid()) { log("end"); active = null; finishAttempt(); } };
      controls();
      nodes.status.textContent = "마이크를 준비하고 있어요…";
      timer = env.setTimeout(function () { if (valid()) { log("timeout"); finishAttempt(); } }, 25000);
      healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("start-timeout"); }, (session.lastClip || session.silent) ? 4000 : 12000);
      try { recognizer.start(); log("start"); } catch (_) { resetFlow(); log("start-fail"); fallback.hidden = false; stop("마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요."); }
    }
    nodes.mic.addEventListener("click", read);
    nodes.stop.addEventListener("click", function () {
      if (disposed || awarded) return;
      if (soundActive) { stop(); read(); }
      else if (active) finishAttempt();
    });
    const hide = function () { if (doc.hidden) { if (active) resetFlow(); stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); releasePrimedAudio(); if (awarded) completePass(); } };
    const leave = function () { if (active) resetFlow(); stop(); releasePrimedAudio(); if (awarded) completePass(); };
    const offline = function () { resetFlow(); fallback.hidden = false; stop("인터넷 연결 후 다시 읽어 주세요. 다른 공부는 계속할 수 있어요."); releasePrimedAudio(); if (awarded) completePass(); };
    const online = function () { controls(); };
    doc.addEventListener("visibilitychange", hide);
    env.addEventListener("pagehide", leave);
    env.addEventListener("offline", offline);
    env.addEventListener("online", online);
    controls();
    if (!Recognition && /SamsungBrowser/i.test(nav.userAgent || "")) { fallback.hidden = false; nodes.status.textContent = "삼성 인터넷에서는 음성 인식이 안 돼요. 갤럭시 탭은 Chrome으로 모험 상자를 열어 주세요."; }
    else if (!Recognition || env.isSecureContext === false) { fallback.hidden = false; nodes.status.textContent = "이 환경에서는 음성 인식을 쓸 수 없어요. HTTPS 모험보드를 Safari 또는 Chrome에서 열어 주세요. 다른 공부는 계속할 수 있어요."; }
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
  const api = { sentences: sentences, normalize: normalize, matches: matches, sameWord: sameWord, aliases: ALIASES, isPrefix: isPrefix, alternativeTexts: alternativeTexts, anyMatches: anyMatches, collapseRepeats: collapseRepeats, wordClips: WORD_CLIPS, praiseFile: praiseFile, matchedWords: matchedWords, cleanWordScores: cleanWordScores, chooseSentence: chooseSentence, recentLimit: RECENT_LIMIT, maxLevel: MAX_LEVEL, levelNames: LEVEL_NAMES, passesToLevelUp: PASSES_TO_LEVEL_UP, clampLevel: clampLevel, createFeedbackSession: createFeedbackSession, choosePraise: choosePraise, retryWords: retryWords, mount: mount };
  api.mountCelebration = mountCelebration;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EnglishReading = api;
})(typeof window !== "undefined" ? window : globalThis);
