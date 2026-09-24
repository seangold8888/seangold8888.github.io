# 멀티버스 게임 그림(영웅 포즈·적·배경)을 구글 클라우드 Vertex AI(크레딧 프로젝트)로 그린다.
# 인증은 gcloud ADC. API 키는 쓰지 않는다(조직 정책).
# 사용법: python tools/vertex-sprite-art.py <jobs.json> <원본저장폴더> [키...]
#   jobs.json: [{"key","prompt","aspect","refs":[카드id 또는 원본폴더의 키]}]
#   키를 주면 그 작업만 다시 그린다. 원본(PNG)은 저장소 밖에 두고, 다듬은 webp만 올린다.
import os, sys, json, pathlib, concurrent.futures as cf
from google import genai
from google.genai import types

SITE = pathlib.Path(__file__).resolve().parents[1]
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-b6386b67-b505-47c8-9ac")
MODEL = os.environ.get("VERTEX_IMAGE_MODEL", "gemini-3-pro-image")
LOCATION = os.environ.get("VERTEX_IMAGE_LOCATION", "global")


def ref_part(ref, raw_dir):
    local = raw_dir / (ref + ".png")
    if local.exists():
        return types.Part.from_bytes(data=local.read_bytes(), mime_type="image/png")
    return types.Part.from_bytes(data=(SITE / "cards" / "art" / (ref + ".webp")).read_bytes(), mime_type="image/webp")


def draw(client, job, raw_dir):
    parts = [job["prompt"]] + [ref_part(r, raw_dir) for r in job.get("refs", [])]
    config = types.GenerateContentConfig(response_modalities=["IMAGE"],
                                         image_config=types.ImageConfig(aspect_ratio=job.get("aspect", "1:1")))
    for attempt in range(5):
        try:
            response = client.models.generate_content(model=MODEL, contents=parts, config=config)
        except Exception as error:  # 일시 오류는 다시 시도. 분당 한도(429)면 잠깐 쉰다.
            print(job["key"], "오류", str(error)[:120], flush=True)
            if "429" in str(error):
                import time
                time.sleep(40 * (attempt + 1))
            continue
        for cand in response.candidates or []:
            for part in (cand.content.parts if cand.content and cand.content.parts else []):
                if part.inline_data and part.inline_data.data:
                    (raw_dir / (job["key"] + ".png")).write_bytes(part.inline_data.data)
                    print(job["key"], "완료", flush=True)
                    return 1
        reason = response.candidates[0].finish_reason if response.candidates else "없음"
        print(job["key"], "그림 없음", reason, flush=True)
    return 0


def main():
    jobs = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    raw_dir = pathlib.Path(sys.argv[2])
    raw_dir.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[3:])
    todo = [j for j in jobs if not only or j["key"] in only]
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    with cf.ThreadPoolExecutor(max_workers=2) as pool:
        done = sum(pool.map(lambda j: draw(client, j, raw_dir), todo))
    print(f"그림 {done}/{len(todo)}장", flush=True)


if __name__ == "__main__":
    main()
