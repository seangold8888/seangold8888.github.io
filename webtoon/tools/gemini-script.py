# 웹툰 대본을 제미나이(Vertex AI)에게 받아 온다. 두 대본 합치기(README)의 “제미나이 쪽” 대본용.
# 인증은 gcloud ADC(컴퓨터에서 gcloud auth application-default login). API 키는 쓰지 않는다.
# 사용법(저장소 루트에서):
#   python webtoon/tools/gemini-script.py "실제 있었던 일을 여기에" [저장할파일.md]
# 등장인물 소개와 말버릇은 episodes.js·words.js 에서 읽어 함께 보낸다.
import os, sys, json, subprocess, pathlib
from google import genai

SITE = pathlib.Path(__file__).resolve().parents[2]
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-b6386b67-b505-47c8-9ac")
LOCATION = os.environ.get("VERTEX_TEXT_LOCATION", "global")
MODEL = os.environ.get("VERTEX_TEXT_MODEL", "gemini-2.5-pro")

READ_JS = r"""
global.window = globalThis;
require(process.argv[1]); require(process.argv[2]);
const pick = (a, n) => a.slice(-n).map((w) => w.say + (w.when ? ` (${w.when})` : w.real ? ` = ${w.real}` : ""));
console.log(JSON.stringify({
  cast: WebtoonData.CHARACTERS.map((c) => `${c.name}: ${c.tag}. ${c.line}`),
  taeoSayings: pick(TaeoSayings, 25),
  taeoWords: pick(TaeoWords, 25),
  jaeiSayings: pick(JaeiSayings, 10),
}));
"""


def family():
    out = subprocess.run(["node", "-e", READ_JS, str(SITE / "webtoon" / "words.js"), str(SITE / "webtoon" / "episodes.js")],
                         capture_output=True, encoding="utf-8", check=True).stdout
    return json.loads(out)


def main():
    if len(sys.argv) < 2:
        sys.exit('사용법: python webtoon/tools/gemini-script.py "실제 있었던 일" [저장할파일.md]')
    story = sys.argv[1]
    f = family()
    prompt = "\n".join([
        "가족 웹툰 「오늘도 우리 집」의 한 화 대본을 써 줘. 세로 스크롤 웹툰, 8~11컷.",
        "컷마다 ‘장면’(누가 어디서 무엇을 하는지)과 대사를 적어 줘. 대사는 짧게.",
        "",
        "[등장인물]", *f["cast"],
        "",
        "[태오가 요즘 하는 말]", *f["taeoSayings"],
        "[태오어(태오식으로 부르는 말)]", *f["taeoWords"],
        "[재이가 요즘 하는 말]", *f["jaeiSayings"],
        "",
        "[이번 화의 실제 있었던 일]", story,
        "",
        "[조건]",
        "- 실제 있었던 말은 글자 그대로 살려 줘(발음이 틀린 말도 고치지 말 것).",
        "- 마지막 컷은 교훈이 아니라 웃음(반전이나 되받아치기)으로 끝내 줘.",
        "- 재이는 “바보야”라고 하지 않아. 할머니·할아버지는 표준말을 써.",
        "- 실제 연예인이나 만화 캐릭터의 모습을 그려야 하는 장면은 넣지 마(이름이 대사에 나오는 건 괜찮아).",
        "- 끝에 ‘오늘의 한 줄’(교훈 한 문장)과 ‘가족과 이야기해 봐요’(질문 한 줄)를 따로 적어 줘.",
    ])
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    response = client.models.generate_content(model=MODEL, contents=prompt)
    text = response.text or ""
    if not text.strip():
        sys.exit("제미나이가 빈 대본을 돌려줬어요. 다시 실행해 보세요.")
    print(text)
    if len(sys.argv) > 2:
        pathlib.Path(sys.argv[2]).write_text(text, encoding="utf-8")
        print(f"\n저장: {sys.argv[2]}", file=sys.stderr)


if __name__ == "__main__":
    main()
