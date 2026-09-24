# 게임 배경음악을 구글 클라우드 Vertex AI(크레딧 프로젝트)의 Lyria로 만든다.
# 인증은 gcloud ADC. API 키는 쓰지 않는다(조직 정책). 제미나이 API 크레딧이 끝나 2026-09-25 옮겼다.
#
# Vertex에는 Lyria 3.5가 없고 lyria-002만 있다: 한 번에 30초 연주곡(48kHz 스테레오 WAV), 곡당 약 $0.06.
# 사용법: python tools/vertex-lyria.py <출력.wav> "<프롬프트>" ["<빼고 싶은 것>"] [시드]
# 40초 반복곡이 필요하면 30초 두 개를 이어 붙이지 말고 tools/loopify-bgm.py 규칙(DESIGN-BGM.md)을 따른다.
import os, sys, json, base64, pathlib, subprocess, urllib.request

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-b6386b67-b505-47c8-9ac")
LOCATION = os.environ.get("VERTEX_LYRIA_LOCATION", "us-central1")
MODEL = os.environ.get("VERTEX_LYRIA_MODEL", "lyria-002")


def token():
    # gcloud가 PATH에 있으면 그대로, 없으면 google-auth로 ADC 토큰을 얻는다.
    try:
        import google.auth, google.auth.transport.requests
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token
    except Exception:
        return subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                              capture_output=True, text=True, check=True, shell=True).stdout.strip()


def main():
    if len(sys.argv) < 3:
        print("사용법: python tools/vertex-lyria.py <출력.wav> \"<프롬프트>\" [\"<빼고 싶은 것>\"] [시드]")
        sys.exit(1)
    out, prompt = pathlib.Path(sys.argv[1]), sys.argv[2]
    negative = sys.argv[3] if len(sys.argv) > 3 else "vocals, singing, lyrics, drums too loud, harsh noise"
    instance = {"prompt": prompt, "negative_prompt": negative}
    if len(sys.argv) > 4:
        instance["seed"] = int(sys.argv[4])
    url = (f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}"
           f"/publishers/google/models/{MODEL}:predict")
    body = json.dumps({"instances": [instance], "parameters": {"sample_count": 1}}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as res:
        data = json.loads(res.read())
    preds = data.get("predictions") or []
    audio = None
    for p in preds:
        audio = p.get("bytesBase64Encoded") or p.get("audioContent")
        if audio:
            break
    if not audio:
        print("소리를 받지 못함:", json.dumps(data)[:300]); sys.exit(1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(audio))
    print(out, round(out.stat().st_size / 1024 / 1024, 2), "MB")


if __name__ == "__main__":
    main()
