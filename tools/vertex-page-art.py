# 영어 그림책 쪽 삽화를 구글 클라우드 Vertex AI(크레딧 프로젝트)로 그린다.
# 인증은 오직 gcp_auth.py(무료 크레딧 계정)로만 한다. ADC·하드코딩 프로젝트·API 키는 쓰지 않는다.
#   GCP_PROFILE 환경변수를 반드시 지정한다(예: GCP_PROFILE=allin8). gcp_auth 를 못 불러오면 멈춘다.
#   gcp_auth 위치: GCP_AUTH_DIR 환경변수, 없으면 C:\Users\김시현\Videos\유튜브\쇼츠\tools
# 사용법: python tools/vertex-page-art.py <책id-쪽> "<장면 설명>" <참고그림>...
#   참고그림: 카드 id(예: cinderella) 또는 이미 그린 쪽(예: cinderella-3-page)
# 한 번 실행에 그림 생성 요청은 최대 VERTEX_IMAGE_ATTEMPTS(기본 1)번만 보낸다(비용 관리).
import os, sys, subprocess, pathlib, json
from google import genai
from google.genai import types

SITE = pathlib.Path(__file__).resolve().parents[1]
OUT = SITE / "story" / "english" / "art"
MODEL = os.environ.get("VERTEX_IMAGE_MODEL", "gemini-3-pro-image")
LOCATION = os.environ.get("VERTEX_IMAGE_LOCATION", "global")
ATTEMPTS = max(1, int(os.environ.get("VERTEX_IMAGE_ATTEMPTS", "1")))
if not os.environ.get("GCP_PROFILE"):
    raise SystemExit("GCP_PROFILE 를 지정하세요(예: GCP_PROFILE=allin8). 다른 인증으로 넘어가지 않습니다.")
sys.path.insert(0, os.environ.get("GCP_AUTH_DIR", r"C:\Users\김시현\Videos\유튜브\쇼츠\tools"))
try:
    import gcp_auth
except Exception as error:  # 절대 ADC 로 넘어가지 않는다.
    raise SystemExit("gcp_auth 를 불러오지 못해 멈춥니다: " + str(error))


def make_client():
    return genai.Client(vertexai=True, project=gcp_auth.PROJECT, location=LOCATION, credentials=gcp_auth.creds())


def ref_bytes(ref):
    if ref.endswith("-page"):
        return (OUT / (ref[:-5] + ".webp")).read_bytes()
    return (SITE / "cards" / "art" / (ref + ".webp")).read_bytes()


def load_books():
    books = subprocess.run(["node", "-e", "const b=require(process.argv[1]).books;console.log(JSON.stringify(b))",
                            str(SITE / "story" / "english" / "books.js")], capture_output=True, encoding="utf-8", check=True).stdout
    return json.loads(books)


def prompt_for(book, page_no, scene):
    page = book["pages"][int(page_no) - 1]
    return (
        f'Create one illustration for page {page_no} of a children\'s English picture book titled "{book["title"]}". '
        f'The page text is: "{page["text"]}". Scene: {scene} '
        "Use the attached reference image(s) only to keep the SAME characters: identical faces, hair, outfits, proportions and the same warm, "
        "richly painted storybook style. Do not copy the reference composition; paint this new scene. "
        "Landscape 4:3, full-bleed painting, soft warm light, gentle and friendly for children aged 5 to 8, nothing scary. "
        "Absolutely no text, letters, numbers, speech bubbles, captions, borders or watermarks anywhere in the image."
    )


def paint(key, prompt, refs, on_request=None):
    """Return True when OUT/<key>.webp was written. Each request is reported through on_request."""
    client = make_client()
    parts = [prompt] + [types.Part.from_bytes(data=ref_bytes(r), mime_type="image/webp") for r in refs]
    config = types.GenerateContentConfig(response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="4:3"))
    for attempt in range(ATTEMPTS):
        if on_request:
            on_request(key)
        response = client.models.generate_content(model=MODEL, contents=parts, config=config)
        image = None
        for cand in response.candidates or []:
            for part in (cand.content.parts if cand.content and cand.content.parts else []):
                if part.inline_data and part.inline_data.data:
                    image = part.inline_data.data
        if image:
            raw = OUT / (key + ".raw")
            raw.write_bytes(image)
            import imageio_ffmpeg
            out = OUT / (key + ".webp")
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw),
                            "-vf", "scale=1024:-2", "-c:v", "libwebp", "-quality", "82", str(out)], check=True)
            raw.unlink()
            print(key, out.stat().st_size, "B", flush=True)
            return True
        reason = response.candidates[0].finish_reason if response.candidates else "없음"
        print(key, "그림 없음", reason, flush=True)
    return False


def main():
    key, scene, refs = sys.argv[1], sys.argv[2], sys.argv[3:]
    book_id, page_no = key.rsplit("-", 1)
    book = next(b for b in load_books() if b["id"] == book_id)
    if not paint(key, prompt_for(book, page_no, scene), refs):
        sys.exit(1)


if __name__ == "__main__":
    main()
