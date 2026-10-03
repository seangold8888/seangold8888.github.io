"""Prepare/generate Korean battle takes; paid calls only in the generate command.

python tools/elevenlabs-battle-voices.py plan
python tools/elevenlabs-battle-voices.py voices
python tools/elevenlabs-battle-voices.py generate --hero guanyu --action special \
    --cast C:/path/cast.json --output-dir C:/path/takes

cast.json maps hero IDs to ElevenLabs voice IDs selected after auditioning.
Generation does not activate or deploy recordings. Review the WAV files first.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import wave

API = "https://api.elevenlabs.io"
SCRIPT = json.loads(Path(__file__).with_name("elevenlabs-battle-lines.json").read_text(encoding="utf-8"))
ACTIONS = ("dash", "special", "musou")


class ApiError(Exception):
    def __init__(self, code, status, message):
        self.status = status
        super().__init__(f"ElevenLabs HTTP {code} ({status}): {message}. No automatic retry.")


def stored_windows_key():
    """Reuse the existing ZOOPAN DPAPI store without writing plaintext."""
    store = Path.home() / ".config" / "zoopan" / "elevenlabs_api_key.dpapi"
    if os.name != "nt" or not store.is_file():
        return ""
    import ctypes
    from ctypes import wintypes
    class Blob(ctypes.Structure):
        _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]
    raw = store.read_bytes()
    buffer = ctypes.create_string_buffer(raw)
    source = Blob(len(raw), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    output = Blob()
    if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output)):
        raise SystemExit("The saved ElevenLabs key could not be decrypted by this Windows user.")
    try:
        return ctypes.string_at(output.pbData, output.cbData).decode("utf-8").strip()
    finally:
        ctypes.windll.kernel32.LocalFree(output.pbData)


def api_key(key_file=None):
    key = Path(key_file).read_text(encoding="utf-8-sig").strip() if key_file else os.environ.get("ELEVENLABS_API_KEY", "")
    if not key and os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as env:
                key = winreg.QueryValueEx(env, "ELEVENLABS_API_KEY")[0]
        except FileNotFoundError:
            pass
    if not key:
        key = stored_windows_key()
    if not key or any(char.isspace() for char in key):
        raise SystemExit("ELEVENLABS_API_KEY is missing. Set it locally, or use --key-file with a private file containing only the key.")
    return key


def request(endpoint, key, payload=None):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(API + endpoint, data=data, headers={
        "xi-api-key": key, "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read(), dict(response.headers)
    except urllib.error.HTTPError as error:
        # Report the permission/error code, never headers or credentials.
        try:
            detail = json.loads(error.read()).get("detail", {})
            status = str(detail.get("status", "unknown")).replace(key, "[redacted]")
            message = str(detail.get("message", "")).replace(key, "[redacted]")[:400]
        except (ValueError, AttributeError):
            status, message = "unknown", ""
        raise ApiError(error.code, status, message) from None
    except urllib.error.URLError:
        raise SystemExit("ElevenLabs connection failed. No automatic retry; a timed-out request may already have used credits.") from None


def selected(args):
    heroes = SCRIPT["heroes"] if args.hero == "all" else {args.hero: SCRIPT["heroes"][args.hero]}
    actions = ACTIONS if args.action == "all" else (args.action,)
    return [(hero, action, info[action]) for hero, info in heroes.items() for action in actions]


def master(raw, target):
    import imageio_ffmpeg
    filters = (
        "silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB:start_silence=0.025,"
        "areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-48dB:start_silence=0.08,areverse,"
        "highpass=f=65,loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:d=0.008"
    )
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-n", "-hide_banner", "-loglevel", "error",
                    "-i", str(raw), "-af", filters, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(target)], check=True)
    with wave.open(str(target), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("plan", "voices", "account", "generate"))
    parser.add_argument("--hero", choices=("all", *SCRIPT["heroes"]), default="all")
    parser.add_argument("--action", choices=("all", *ACTIONS), default="all")
    parser.add_argument("--cast", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--key-file", type=Path)
    parser.add_argument("--text", help="Override the script for one audition take only")
    parser.add_argument("--stability", type=float, choices=(0.0, 0.5, 1.0), default=0.5)
    parser.add_argument("--take-id", default="v1", help="Unique take label; preserves earlier auditions")
    args = parser.parse_args()
    takes = selected(args)
    if not re.fullmatch(r"[a-z0-9-]{1,40}", args.take_id):
        parser.error("take-id must contain only lowercase letters, digits and hyphens")
    if args.text:
        if len(takes) != 1:
            parser.error("--text requires one hero and one action")
        takes = [(takes[0][0], takes[0][1], args.text)]
    if args.command == "plan":
        for hero, action, text in takes:
            print(f"{hero:16} {action:7} {text}")
        print(f"{len(takes)} takes; {sum(len(text) for _, _, text in takes)} text characters including direction tags. No API calls.")
        return

    key = api_key(args.key_file)
    if args.command == "voices":
        token = ""
        while True:
            endpoint = "/v2/voices?page_size=100" + ("&next_page_token=" + urllib.parse.quote(token) if token else "")
            body, _ = request(endpoint, key)
            result = json.loads(body)
            for voice in result.get("voices", []):
                print(json.dumps({field: voice.get(field) for field in ("voice_id", "name", "category", "labels", "description")}, ensure_ascii=False))
            if not result.get("has_more") or not result.get("next_page_token"):
                return
            token = result["next_page_token"]

    try:
        body, _ = request("/v1/user/subscription", key)
        account = json.loads(body)
    except ApiError as error:
        # Some existing keys can synthesize speech but cannot read billing.
        # A short audition remains useful; defer a full batch until usage is visible.
        if args.command != "generate" or error.status != "missing_permissions" or len(takes) > 3:
            raise
        account = {}
        print("Credit balance unavailable (user_read permission); limited to this short audition.")
    used, limit = account.get("character_count"), account.get("character_limit")
    print(json.dumps({"tier": account.get("tier"), "used": used, "limit": limit}, ensure_ascii=False))
    if args.command == "account":
        return
    if not args.cast or not args.output_dir:
        parser.error("generate requires --cast and --output-dir")
    cast = json.loads(args.cast.read_text(encoding="utf-8-sig"))
    for hero, _, _ in takes:
        if not isinstance(cast.get(hero), str) or not re.fullmatch(r"[A-Za-z0-9_-]{10,128}", cast[hero]):
            parser.error(f"Missing/invalid voice ID for {hero}. Audition and assign a voice first.")
    required = sum(len(text) for _, _, text in takes)
    if isinstance(used, (int, float)) and isinstance(limit, (int, float)) and limit - used < required:
        raise SystemExit("Included credits could not be confirmed for this batch. No speech generated.")
    import imageio_ffmpeg
    imageio_ffmpeg.get_ffmpeg_exe()  # Fail before a paid call if mastering is unavailable.
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for hero, action, text in takes:
        stem = args.output_dir / f"{hero}-{action}-eleven-{args.take_id}"
        raw, wav, report = (stem.with_suffix(ext) for ext in (".mp3", ".wav", ".json"))
        if any(file.exists() for file in (raw, wav, report)):
            raise SystemExit(f"Take already exists: {stem.name}. Use a new output directory for a new audition.")
        payload = {"text": text, "model_id": "eleven_v3", "language_code": "ko",
                   "voice_settings": {"stability": args.stability, "similarity_boost": 0.75, "use_speaker_boost": False}}
        data, headers = request(f"/v1/text-to-speech/{cast[hero]}?output_format=mp3_44100_128", key, payload)
        if len(data) < 1024 or not any("audio/" in value for name, value in headers.items() if name.lower() == "content-type"):
            raise SystemExit(f"Invalid audio response for {hero}/{action}; stopped without retry.")
        raw.write_bytes(data)
        duration = master(raw, wav)
        maximum = 2.2 if action == "dash" else 4.5
        metadata = {"hero": hero, "action": action, "model": "eleven_v3", "voice_id": cast[hero], "text": text,
                    "voice_settings": payload["voice_settings"], "take_id": args.take_id,
                    "request_id": next((value for name, value in headers.items() if name.lower() == "request-id"), None),
                    "duration": round(duration, 3), "sha256": hashlib.sha256(data).hexdigest(),
                    "duration_ok": 0.25 <= duration <= maximum, "reviewed": False}
        report.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Generated {wav.name}: {duration:.2f}s; listening review required.")
        if not metadata["duration_ok"]:
            raise SystemExit("Take duration is outside the gameplay target; review it before spending credits on more takes.")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        main()
    except ApiError as error:
        raise SystemExit(str(error)) from None
