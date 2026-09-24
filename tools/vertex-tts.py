# 영어 읽기·그림책 소리(Leda 목소리)를 구글 클라우드 Vertex AI(크레딧 프로젝트)로 만든다.
# 인증은 gcloud ADC. API 키는 쓰지 않는다(조직 정책). 제미나이 API 크레딧이 끝나 2026-09-25 옮겼다.
#
# 사용법
#   python tools/vertex-tts.py word <출력폴더> 단어 [단어=읽는법 ...]      단어 발음 클립
#   python tools/vertex-tts.py page [시작] [끝]                             그림책 쪽 낭독(없는 파일만)
#   python tools/vertex-tts.py say <출력.mp3> "<읽을 말>" ["<읽는 방식>"]   아무 문장
#
# 결과는 기존 클립과 같은 규격: 앞뒤 무음 제거, loudnorm -16, 48kHz 모노 mp3.
import os, sys, json, pathlib, subprocess, time
from google import genai
from google.genai import types

SITE = pathlib.Path(__file__).resolve().parents[1]
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-b6386b67-b505-47c8-9ac")
LOCATION = os.environ.get("VERTEX_TTS_LOCATION", "us-central1")
MODEL = os.environ.get("VERTEX_TTS_MODEL", "gemini-2.5-flash-tts")
VOICE = os.environ.get("VERTEX_TTS_VOICE", "Leda")

WORD_STYLE = "Say this one English word clearly and warmly, like a kind teacher reading to a young child: "
PAGE_STYLE = ("Read this picture book page aloud slowly, warmly and clearly, like a kind teacher reading to a "
              "seven-year-old who is learning English. Pause briefly between sentences: ")


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def speak(client, text):
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))))
    for attempt in range(5):
        try:
            response = client.models.generate_content(model=MODEL, contents=text, config=config)
        except Exception as error:
            print("  다시 시도:", str(error)[:120], flush=True)
            time.sleep(15 * (attempt + 1) if "429" in str(error) else 3)
            continue
        for cand in response.candidates or []:
            for part in (cand.content.parts if cand.content and cand.content.parts else []):
                if part.inline_data and part.inline_data.data:
                    return part.inline_data.data, part.inline_data.mime_type or ""
    raise RuntimeError("소리를 받지 못함")


def to_mp3(raw, mime, out, bitrate, tail_silence):
    out = pathlib.Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    src = out.with_suffix(".pcm")
    src.write_bytes(raw)
    # Vertex는 24kHz 16비트 모노 PCM(audio/L16)을 준다. 혹시 wav로 오면 그대로 읽는다.
    inp = ["-i", str(src)] if "wav" in mime else ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", str(src)]
    filt = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
            f"silenceremove=start_periods=1:start_threshold=-45dB:start_silence={tail_silence},areverse,"
            "loudnorm=I=-16:TP=-1.5")
    subprocess.run([ffmpeg(), "-y", "-hide_banner", "-loglevel", "error", *inp, "-af", filt,
                    "-ar", "48000", "-ac", "1", "-b:a", bitrate, str(out)], check=True)
    src.unlink()
    return out.stat().st_size


def main():
    if len(sys.argv) < 2:
        print(__doc__ or "사용법은 파일 머리말을 보세요"); sys.exit(1)
    mode = sys.argv[1]
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    if mode == "word":
        out_dir = pathlib.Path(sys.argv[2])
        for entry in sys.argv[3:]:
            word, spoken = entry.split("=", 1) if "=" in entry else (entry, entry)
            raw, mime = speak(client, WORD_STYLE + spoken)
            print(word, to_mp3(raw, mime, out_dir / (word + ".mp3"), "40k", 0.08), "B", flush=True)
    elif mode == "page":
        books = json.loads(subprocess.run(
            ["node", "-e", "console.log(JSON.stringify(require(process.argv[1]).books))", str(SITE / "story" / "english" / "books.js")],
            capture_output=True, encoding="utf-8", check=True).stdout)
        pages = [p for b in books for p in b["pages"]]
        start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        end = int(sys.argv[3]) if len(sys.argv) > 3 else len(pages)
        for page in pages[start:end]:
            out = SITE / "story" / "english" / page["audio"]
            if out.exists():
                continue
            raw, mime = speak(client, PAGE_STYLE + page["text"])
            print(page["audio"], to_mp3(raw, mime, out, "48k", 0.15), "B", flush=True)
    elif mode == "say":
        out, text = sys.argv[2], sys.argv[3]
        style = sys.argv[4] + " " if len(sys.argv) > 4 else ""
        raw, mime = speak(client, style + text)
        print(out, to_mp3(raw, mime, out, "48k", 0.15), "B")
    else:
        print("모드는 word / page / say"); sys.exit(1)


if __name__ == "__main__":
    main()
