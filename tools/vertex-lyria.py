# 게임 배경음악을 구글 클라우드 Vertex AI(크레딧 프로젝트)의 Lyria로 만든다.
# 인증은 오직 gcp_auth.py(무료 크레딧 계정)로만 한다. ADC·하드코딩 프로젝트·API 키는 쓰지 않는다.
#   GCP_PROFILE 환경변수를 반드시 지정한다(예: GCP_PROFILE=allin8). gcp_auth 를 못 불러오면 멈춘다.
#   gcp_auth 위치: GCP_AUTH_DIR 환경변수, 없으면 C:\Users\김시현\Videos\유튜브\쇼츠\tools
#
# Vertex에는 Lyria 3.5가 없고 lyria-002만 있다: 한 번에 30초 연주곡(48kHz 스테레오 WAV), 곡당 약 $0.06.
# 사용법: python tools/vertex-lyria.py <출력.wav> "<프롬프트>" ["<빼고 싶은 것>"] [시드]
# 40초 반복곡이 필요하면 30초 두 개를 이어 붙이지 말고 tools/loopify-bgm.py 규칙(DESIGN-BGM.md)을 따른다.
import os, sys, json, base64, pathlib, urllib.request

if not os.environ.get("GCP_PROFILE"):
    raise SystemExit("GCP_PROFILE 를 지정하세요(예: GCP_PROFILE=allin8). 다른 인증으로 넘어가지 않습니다.")
sys.path.insert(0, os.environ.get("GCP_AUTH_DIR", r"C:\Users\김시현\Videos\유튜브\쇼츠\tools"))
try:
    import gcp_auth
except Exception as error:  # 절대 ADC 로 넘어가지 않는다.
    raise SystemExit("gcp_auth 를 불러오지 못해 멈춥니다: " + str(error))

LOCATION = os.environ.get("VERTEX_LYRIA_LOCATION", "us-central1")
MODEL = os.environ.get("VERTEX_LYRIA_MODEL", "lyria-002")


def token():
    return gcp_auth.token()


def main():
    if len(sys.argv) < 3:
        print("사용법: python tools/vertex-lyria.py <출력.wav> \"<프롬프트>\" [\"<빼고 싶은 것>\"] [시드]")
        sys.exit(1)
    out, prompt = pathlib.Path(sys.argv[1]), sys.argv[2]
    negative = sys.argv[3] if len(sys.argv) > 3 else "vocals, singing, lyrics, drums too loud, harsh noise"
    instance = {"prompt": prompt, "negative_prompt": negative}
    if len(sys.argv) > 4:
        instance["seed"] = int(sys.argv[4])
    url = (f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{gcp_auth.PROJECT}/locations/{LOCATION}"
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
