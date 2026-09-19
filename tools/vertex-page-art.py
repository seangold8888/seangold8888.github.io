# 영어 그림책 쪽 삽화를 구글 클라우드 Vertex AI(크레딧 프로젝트)로 그린다.
# 인증은 gcloud ADC. API 키는 쓰지 않는다(조직 정책).
# 사용법: python tools/vertex-page-art.py <책id-쪽> "<장면 설명>" <참고그림>...
#   참고그림: 카드 id(예: cinderella) 또는 이미 그린 쪽(예: cinderella-3-page)
import os, sys, subprocess, pathlib
from google import genai
from google.genai import types

SITE = pathlib.Path(__file__).resolve().parents[1]
OUT = SITE / "story" / "english" / "art"
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-b6386b67-b505-47c8-9ac")
MODEL = os.environ.get("VERTEX_IMAGE_MODEL", "gemini-3-pro-image")
LOCATION = os.environ.get("VERTEX_IMAGE_LOCATION", "global")


def ref_bytes(ref):
    if ref.endswith("-page"):
        return (OUT / (ref[:-5] + ".webp")).read_bytes()
    return (SITE / "cards" / "art" / (ref + ".webp")).read_bytes()


def main():
    key, scene, refs = sys.argv[1], sys.argv[2], sys.argv[3:]
    book_id, page_no = key.rsplit("-", 1)
    books = subprocess.run(["node", "-e", "const b=require(process.argv[1]).books;console.log(JSON.stringify(b))",
                            str(SITE / "story" / "english" / "books.js")], capture_output=True, encoding="utf-8", check=True).stdout
    import json
    book = next(b for b in json.loads(books) if b["id"] == book_id)
    page = book["pages"][int(page_no) - 1]
    prompt = (
        f'Create one illustration for page {page_no} of a children\'s English picture book titled "{book["title"]}". '
        f'The page text is: "{page["text"]}". Scene: {scene} '
        "Use the attached reference image(s) only to keep the SAME characters: identical faces, hair, outfits, proportions and the same warm, "
        "richly painted storybook style. Do not copy the reference composition; paint this new scene. "
        "Landscape 4:3, full-bleed painting, soft warm light, gentle and friendly for children aged 5 to 8, nothing scary. "
        "Absolutely no text, letters, numbers, speech bubbles, captions, borders or watermarks anywhere in the image."
    )
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    parts = [prompt] + [types.Part.from_bytes(data=ref_bytes(r), mime_type="image/webp") for r in refs]
    config = types.GenerateContentConfig(response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="4:3"))
    for attempt in range(3):
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
            print(key, out.stat().st_size, "B")
            return
        reason = response.candidates[0].finish_reason if response.candidates else "없음"
        print(key, "그림 없음", reason)
    sys.exit(1)


if __name__ == "__main__":
    main()
