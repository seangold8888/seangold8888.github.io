# Lyria mp3를 끊김 없이 도는 짧은 반복곡으로 다듬는다.
# 사용법: python loopify.py <입력.mp3> <출력.mp3> [반복길이초=40] [겹침초=2]
import subprocess, sys, json, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

def duration(path):
    out = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True, errors="ignore").stderr
    for line in out.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit("길이를 읽지 못함: " + path)

def main():
    src, dst = sys.argv[1], sys.argv[2]
    loop = float(sys.argv[3]) if len(sys.argv) > 3 else 40.0
    xf = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
    total = duration(src)
    start = 1.5 if total > loop + xf + 3 else 0.0   # 도입부의 정적·페이드인을 건너뛴다
    if total < start + loop + xf:
        loop = max(8.0, total - start - xf)
    seg = loop + xf
    # 앞부분(loop초)의 시작 xf초에 꼬리(xf초)를 등파워로 겹쳐, 끝과 처음이 이어지게 만든다.
    f = (
        f"[0:a]atrim=start={start}:end={start+seg},asetpts=PTS-STARTPTS,asplit=2[a][b];"
        f"[a]atrim=0:{loop},asetpts=PTS-STARTPTS[head];"
        f"[b]atrim={loop}:{seg},asetpts=PTS-STARTPTS,afade=t=out:st=0:d={xf}:curve=qsin[tail];"
        f"[head]afade=t=in:st=0:d={xf}:curve=qsin[headf];"
        f"[headf][tail]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
        f"loudnorm=I=-19:TP=-2:LRA=9,aresample=44100[out]"
    )
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
           "-filter_complex", f, "-map", "[out]",
           "-c:a", "libmp3lame", "-b:a", "112k", "-joint_stereo", "1", dst]
    subprocess.run(cmd, check=True)
    print(f"{dst} · {duration(dst):.1f}초")

main()
