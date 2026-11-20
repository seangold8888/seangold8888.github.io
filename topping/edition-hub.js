// 허브(가족)판: 주인공 = 아이 넷. 이 파일은 가족 저장소에만 둔다(앱판 빌드에 넣지 말 것).
// age = 토핑 대행진 나이 칸(난이도). 허브 GameQuiz 기록의 시작·상한에 맞춤: 첫째 2학년, 둘째 1학년, 셋째 6살, 막내 5살.
window.TP_EDITION = {
  id: "hub", picker: "kid", countIcon: "🧒",
  cast: [
    { id: "k1", voice: "yunchan", name: "윤찬", age: 8, sticker: "art/g/kid_k1.webp", scale: 1.1 },
    { id: "k2", voice: "jaei", name: "재이", age: 7, sticker: "art/g/kid_k2.webp", scale: 1.02 },
    { id: "k3", voice: "yungeon", name: "윤건", age: 6, sticker: "art/g/kid_k3.webp", scale: 0.95 },
    { id: "k4", voice: "taeo", name: "태오", age: 5, sticker: "art/g/kid_k4.webp", scale: 0.86 },
  ],
};
// 필살기 외침 = 허브 공용 아이 목소리(KidVoices, 미리 녹음된 로컬 클립). 허브 폴더에서 열릴 때만 소리가 난다.
document.write('<script src="../assets/study/kid-voices.js?v=1"><\/script>');
