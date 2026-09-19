// 영어 그림책. 쉬운 책부터 차례로 놓는다. 그림은 카드 원화를 다시 쓴다.
// 낭독 음성: english/audio/<책 id>-<쪽 번호>.mp3 (Gemini TTS Leda, 천천히).
(function (root) {
  "use strict";
  const BOOKS = [
    {
      id: "picnic", title: "Jaei and Taeo Go on a Picnic", titleKo: "재이와 태오의 소풍", stars: 1, cover: "jaei",
      pages: [
        ["jaei", "It is a sunny day. Jaei wants a picnic.", "화창한 날이에요. 재이는 소풍을 가고 싶어요."],
        ["eomma", "Mom makes sandwiches.", "엄마가 샌드위치를 만들어요."],
        ["appa", "Dad carries a big basket.", "아빠가 큰 바구니를 들어요."],
        ["taeo", "Taeo runs to the park. He is so fast!", "태오가 공원으로 달려가요. 정말 빨라요!"],
        ["jaei", "Jaei sees a butterfly. It is yellow.", "재이가 나비를 봐요. 노란 나비예요."],
        ["taeo", "Oh no! A dog takes a sandwich!", "앗! 강아지가 샌드위치를 가져가요!"],
        ["appa", "Dad laughs. We have more sandwiches.", "아빠가 웃어요. 샌드위치가 더 있어요."],
        ["eomma", "We eat together. What a happy day!", "우리는 함께 먹어요. 정말 행복한 날이에요!"]
      ]
    },
    {
      id: "pigs", title: "The Three Little Pigs", titleKo: "아기돼지 삼형제", stars: 1, cover: "threepigs",
      pages: [
        ["threepigs", "Three little pigs leave home.", "아기돼지 세 마리가 집을 떠나요."],
        ["threepigs", "The first pig builds a straw house.", "첫째 돼지는 지푸라기 집을 지어요."],
        ["wolf", "The wolf blows. The straw house falls down!", "늑대가 후 불어요. 지푸라기 집이 무너져요!"],
        ["threepigs", "The second pig builds a stick house.", "둘째 돼지는 나무 집을 지어요."],
        ["wolf", "The wolf blows. The stick house falls down!", "늑대가 후 불어요. 나무 집이 무너져요!"],
        ["threepigs", "The third pig builds a brick house.", "셋째 돼지는 벽돌집을 지어요."],
        ["wolf", "The wolf blows and blows. The brick house does not fall.", "늑대가 불고 또 불어요. 벽돌집은 끄떡없어요."],
        ["threepigs", "The three pigs are safe and happy.", "아기돼지 삼형제는 안전하고 행복해요."]
      ]
    },
    {
      id: "race", title: "The Tortoise and the Hare", titleKo: "토끼와 거북", stars: 2, cover: "tortoisehare",
      pages: [
        ["tortoisehare", "The hare is very fast.", "토끼는 아주 빨라요."],
        ["tortoisehare", "The tortoise is very slow.", "거북이는 아주 느려요."],
        ["tortoisehare", "The tortoise wants a race.", "거북이가 달리기 경주를 하자고 해요."],
        ["tortoisehare", "The hare runs far ahead.", "토끼가 저 멀리 앞서 달려가요."],
        ["tortoisehare", "The hare is tired. He takes a nap.", "토끼는 피곤해요. 낮잠을 자요."],
        ["tortoisehare", "The tortoise walks and walks. He does not stop.", "거북이는 걷고 또 걸어요. 멈추지 않아요."],
        ["tortoisehare", "The hare wakes up. Oh no!", "토끼가 깨어나요. 이런!"],
        ["tortoisehare", "The tortoise wins! Slow and steady wins the race.", "거북이가 이겨요! 천천히 꾸준히 하면 이겨요."]
      ]
    },
    {
      id: "redhood", title: "Little Red Riding Hood", titleKo: "빨간 모자", stars: 2, cover: "redhood",
      pages: [
        ["redhood", "Little Red Riding Hood has a red hood.", "빨간 모자는 빨간 두건을 써요."],
        ["redhood", "She takes cookies to Grandma.", "할머니께 쿠키를 가져가요."],
        ["wolf", "A wolf sees her in the woods.", "숲에서 늑대가 소녀를 봐요."],
        ["wolf", "The wolf runs to Grandma first.", "늑대가 먼저 할머니 집으로 달려가요."],
        ["wolf", "He hides in the bed.", "늑대는 침대 속에 숨어요."],
        ["redhood", "Grandma, what big eyes you have!", "할머니, 눈이 왜 이렇게 커요!"],
        ["redhood", "A woodcutter hears her. He chases the wolf away.", "나무꾼이 소리를 들어요. 늑대를 쫓아내요."],
        ["redhood", "Grandma and Red are safe. They eat cookies together.", "할머니와 빨간 모자는 무사해요. 함께 쿠키를 먹어요."]
      ]
    },
    {
      id: "jack", title: "Jack and the Beanstalk", titleKo: "잭과 콩나무", stars: 3, cover: "jack",
      pages: [
        ["jack", "Jack and his mom are poor.", "잭과 엄마는 가난해요."],
        ["jack", "Jack sells the cow for magic beans.", "잭은 소를 요술 콩과 바꿔요."],
        ["jack", "Mom is angry. She throws the beans outside.", "엄마가 화가 났어요. 콩을 밖으로 던져요."],
        ["beanstalkgiant", "In the morning, a giant beanstalk grows to the sky.", "아침이 되자 거대한 콩나무가 하늘까지 자라요."],
        ["jack", "Jack climbs up and up.", "잭은 올라가고 또 올라가요."],
        ["beanstalkgiant", "A big giant lives in a castle in the clouds.", "구름 위 성에 커다란 거인이 살아요."],
        ["jack", "Jack takes a golden hen and runs home.", "잭은 황금 암탉을 들고 집으로 달려가요."],
        ["jack", "Jack cuts the beanstalk. Now they are happy.", "잭이 콩나무를 잘라요. 이제 모두 행복해요."]
      ]
    },
    {
      id: "cinderella", title: "Cinderella", titleKo: "신데렐라", stars: 3, cover: "cinderella",
      pages: [
        ["cinderella", "Cinderella works all day.", "신데렐라는 하루 종일 일해요."],
        ["cinderella", "She wants to go to the ball.", "무도회에 가고 싶어요."],
        ["fairygodmother", "A fairy godmother comes. She waves her wand.", "요정 대모가 나타나요. 요술 지팡이를 흔들어요."],
        ["fairygodmother", "A pumpkin becomes a coach!", "호박이 마차가 돼요!"],
        ["cinderella", "Cinderella dances with the prince.", "신데렐라는 왕자와 춤을 춰요."],
        ["cinderella", "At midnight, she runs away. She loses her shoe.", "자정이 되자 도망쳐요. 구두 한 짝을 잃어버려요."],
        ["cinderella", "The prince looks for the girl with the glass shoe.", "왕자는 유리 구두의 주인을 찾아요."],
        ["cinderella", "The shoe fits! They live happily ever after.", "구두가 꼭 맞아요! 둘은 오래오래 행복하게 살아요."]
      ]
    }
  ].map(function (book) {
    return {
      id: book.id, title: book.title, titleKo: book.titleKo, stars: book.stars, cover: book.cover,
      pages: book.pages.map(function (page, index) {
        return { art: page[0], text: page[1], meaning: page[2], audio: "audio/" + book.id + "-" + (index + 1) + ".mp3" };
      })
    };
  });
  const api = { books: BOOKS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EnglishBooks = api;
})(typeof window !== "undefined" ? window : globalThis);
