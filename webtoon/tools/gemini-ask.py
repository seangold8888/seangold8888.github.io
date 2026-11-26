"""제미나이(Gemini API)에 글 파일을 보내고 답을 받는다. 공개판 각색 대본 받기에 쓴다.

사용법(저장소 루트에서):
  node webtoon/tools/episode-script.cjs 2 > /tmp/p.txt
  python3 webtoon/tools/gemini-ask.py /tmp/p.txt [답 저장 파일]

키: Google AI Studio(aistudio.google.com/apikey)에서 만든 키.
  - 클라우드 세션: 환경의 네트워크 비밀(generativelanguage.googleapis.com)에 저장해 두면 프록시가 넣어 준다.
  - 내 컴퓨터: 환경 변수 GEMINI_API_KEY 에 넣는다.
모델이 붐비면(503) 다음 모델로 넘어가고, 다 막히면 잠깐 쉬었다 다시 해 본다.
무료 등급에서는 Pro 모델을 쓸 수 없다(쓰려면 결제 등록).
"""
import json, os, subprocess, sys, time

MODELS = ["gemini-pro-latest", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def ask(text):
    key = os.environ.get("GEMINI_API_KEY", "proxy-injected")
    body = json.dumps({"model": "", "messages": [{"role": "user", "content": text}]}, ensure_ascii=False)
    for round_ in range(3):
        for model in MODELS:
            data = body.replace('"model": ""', json.dumps({"model": model})[1:-1], 1)
            r = subprocess.run(["curl", "-sS", "--max-time", "120", URL, "-H", "Authorization: Bearer " + key,
                                "-H", "Content-Type: application/json", "--data-binary", "@-"],
                               input=data, capture_output=True, text=True)
            try:
                d = json.loads(r.stdout)
            except ValueError:
                print(f"{model}: 응답을 못 읽었어요 {r.stderr[:120]}", file=sys.stderr)
                continue
            d = d[0] if isinstance(d, list) else d
            if "choices" in d:
                return model, d["choices"][0]["message"]["content"]
            err = d.get("error", {})
            print(f"{model}: {err.get('code')} {str(err.get('message', ''))[:80]}", file=sys.stderr)
        time.sleep(20)
    sys.exit("모든 모델이 막혀 있어요. 조금 뒤에 다시 해 보세요.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    model, answer = ask(open(sys.argv[1], encoding="utf-8").read())
    if len(sys.argv) > 2:
        open(sys.argv[2], "w", encoding="utf-8").write(answer)
    print(f"[{model}]\n{answer}")
