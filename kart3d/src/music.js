// 산리오 카트 3D — 내장 신시사이저 사운드
// 오디오 파일을 쓰지 않는다. 파일이 없어야 GitHub Pages 에 그대로 올라가고
// 로딩도 없다. 곡은 이 게임을 위해 새로 지은 것이다.
//
// 스케줄링: 프레임 루프에 얹지 않고, 한 바퀴(약 26초) 분량을 통째로
// AudioContext 시간축에 미리 예약한다. 탭이 백그라운드로 가서 타이머가
// 느려져도 이미 예약된 소리는 정확한 시각에 난다.

const A4 = 69;
const f = midi => 440 * Math.pow(2, (midi - A4) / 12);

// ---- 곡 ----
// [음(MIDI), 길이(박)] · 0 은 쉼표. C5=72
const LEAD_A = [
  [79, .5], [81, .5], [79, .5], [76, .5], [72, 1], [76, 1],
  [74, .5], [76, .5], [74, .5], [72, .5], [67, 1], [0, 1],
  [79, .5], [81, .5], [79, .5], [76, .5], [84, 1], [83, 1],
  [81, .5], [79, .5], [76, .5], [79, .5], [72, 2]
];
const LEAD_B = [
  [77, .5], [79, .5], [81, .5], [83, .5], [84, 1], [81, 1],
  [83, .5], [81, .5], [79, .5], [77, .5], [76, 2],
  [76, .5], [77, .5], [79, .5], [81, .5], [83, 1], [79, 1],
  [81, .5], [79, .5], [76, .5], [74, .5], [72, 2]
];
// 반짝이는 대선율 — 한 옥타브 위에서 드문드문
const SPARK_A = [
  [0, 2], [88, .5], [91, .5], [88, 1],
  [0, 4],
  [0, 2], [93, .5], [91, .5], [88, 1],
  [0, 4]
];
// 코드 진행 (마디당 하나): C G Am F / F G C G
const CHORDS = [48, 55, 57, 53, 53, 55, 48, 55];

function bassBar(root) {
  const fifth = root + 7, oct = root + 12;
  return [root, root, fifth, root, root, oct, fifth, root];   // 8분음표 8개
}


// ---- 기기 안에만 저장되는 사용자 음악 ----
// 파일은 IndexedDB 에 들어가고 어디로도 올라가지 않는다. 리포에도 안 들어간다.
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('kart3d-audio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbDo(mode, fn) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction('files', mode);
    fn(tx.objectStore('files'));
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  }));
}
function idbGet(key) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const rq = db.transaction('files', 'readonly').objectStore('files').get(key);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }));
}

export function createAudio() {
  let ctx = null;
  let master = null, musicGain = null, sfxGain = null;
  let noiseBuf = null;
  let timer = null;
  let live = [];
  let playing = false;
  let muted = false;
  let userBuf = null, userName = null, userSrc = null;
  try { muted = localStorage.getItem('kart3d_music') === 'off'; } catch (_) {}

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = muted ? 0 : 0.5;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);

    const n = ctx.sampleRate * 0.6;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  function tone(t, dur, midi, type, vol, dest, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f(midi), t);
    if (detune) o.detune.setValueAtTime(detune, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.06, dur));
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    live.push(o);
  }

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.10);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(g).connect(musicGain);
    o.start(t); o.stop(t + 0.2);
    live.push(o);
  }

  function noise(t, dur, vol, hp) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(musicGain);
    src.start(t); src.stop(t + dur + 0.02);
    live.push(src);
  }

  // 한 바퀴(A A B A, 16마디)를 통째로 예약한다
  function scheduleLoop(start, spb, shift) {
    const bar = spb * 4;
    const seq = [].concat(LEAD_A, LEAD_A, LEAD_B, LEAD_A);

    let t = start;
    for (const [note, beats] of seq) {
      const dur = beats * spb;
      if (note) {
        tone(t, dur * 0.92, note + shift, 'square', 0.16, musicGain);
        tone(t, dur * 0.92, note + shift - 12, 'triangle', 0.09, musicGain, 6);
      }
      t += dur;
    }
    const loopDur = t - start;

    // 대선율은 A 구간에서만
    [0, 4, 12].forEach(barOff => {
      let ts = start + barOff * bar;
      for (const [note, beats] of SPARK_A) {
        const dur = beats * spb;
        if (note) tone(ts, dur * 0.8, note + shift, 'triangle', 0.075, musicGain);
        ts += dur;
      }
    });

    // 베이스 + 드럼: 16마디
    for (let b = 0; b < 16; b++) {
      const t0 = start + b * bar;
      const root = CHORDS[b % CHORDS.length] + shift;
      bassBar(root).forEach((nn, i) => {
        tone(t0 + i * spb * 0.5, spb * 0.44, nn, 'sawtooth', 0.13, musicGain);
      });
      kick(t0);
      kick(t0 + spb * 2);
      noise(t0 + spb, 0.13, 0.20, 1400);          // 스네어
      noise(t0 + spb * 3, 0.13, 0.20, 1400);
      for (let i = 0; i < 8; i++) {
        noise(t0 + i * spb * 0.5, 0.035, i % 2 ? 0.05 : 0.085, 7000);   // 하이햇
      }
    }
    return loopDur;
  }

  // 트랙마다 조성과 빠르기를 달리해 같은 곡이 다르게 들리게 한다
  const VARIANT = [
    { bpm: 148, shift: 0 },   // 테마파크
    { bpm: 142, shift: 2 },   // 구름 성
    { bpm: 152, shift: 4 },   // 사탕 숲
    { bpm: 138, shift: -1 },  // 노을 해변
    { bpm: 132, shift: -3 },  // 별빛 밤길
    { bpm: 158, shift: 5 }    // 무지개 하늘길
  ];

  // 사용자가 넣은 곡을 이어붙여 반복 재생한다
  function playUserTrack() {
    userSrc = ctx.createBufferSource();
    userSrc.buffer = userBuf;
    userSrc.loop = true;
    userSrc.connect(musicGain);
    userSrc.start(ctx.currentTime + 0.05);
  }

  function setUserTrack(file) {
    if (!ensure()) return Promise.reject(new Error('이 기기에서는 오디오를 쓸 수 없어요'));
    return file.arrayBuffer().then(raw =>
      // decodeAudioData 는 넘긴 버퍼를 비워버린다. 저장용 원본을 남기려고 복사본을 넘긴다.
      ctx.decodeAudioData(raw.slice(0)).then(buf => {
        userBuf = buf; userName = file.name;
        return idbDo('readwrite', st => st.put({ name: file.name, data: raw }, 'bgm'))
          .catch(() => {})            // 저장이 막혀도 이번 판은 재생된다
          .then(() => file.name);
      })
    );
  }

  function clearUserTrack() {
    userBuf = null; userName = null;
    return idbDo('readwrite', st => st.delete('bgm')).catch(() => {});
  }

  function restoreUserTrack() {
    if (!ensure()) return Promise.resolve(null);
    return idbGet('bgm')
      .then(rec => {
        if (!rec || !rec.data) return null;
        return ctx.decodeAudioData(rec.data.slice(0)).then(buf => {
          userBuf = buf; userName = rec.name;
          return rec.name;
        });
      })
      .catch(() => null);
  }

  function startMusic(trackIndex) {
    if (!ensure()) return;
    resume();
    stopMusic(true);
    if (userBuf) {
      playing = true;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime);
      playUserTrack();
      return;
    }
    const v = VARIANT[trackIndex % VARIANT.length];
    const spb = 60 / v.bpm;
    playing = true;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime);

    let next = ctx.currentTime + 0.08;
    const run = () => {
      if (!playing) return;
      const dur = scheduleLoop(next, spb, v.shift);
      next += dur;
      // 다음 바퀴는 끝나기 조금 전에 예약한다
      timer = setTimeout(run, Math.max(200, (dur - 0.6) * 1000));
    };
    run();
  }

  function stopMusic(silent) {
    playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (!ctx) return;
    const now = ctx.currentTime;
    if (userSrc) { try { userSrc.stop(now); } catch (_) {} userSrc = null; }
    for (const s of live) { try { s.stop(now); } catch (_) {} }
    live = [];
    if (!silent) {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0, now + 0.2);
    }
  }

  // ---- 효과음 ----
  function beep(freq, dur) {
    if (!ensure()) return;
    resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // 완주 팡파르
  function fanfare() {
    if (!ensure()) return;
    resume();
    const t0 = ctx.currentTime + 0.02;
    [[72, 0], [76, .12], [79, .24], [84, .36]].forEach(([n, off]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f(n), t0 + off);
      g.gain.setValueAtTime(0.0001, t0 + off);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + (off === .36 ? 0.9 : 0.22));
      o.connect(g).connect(sfxGain);
      o.start(t0 + off); o.stop(t0 + off + 1.0);
    });
  }

  // ---- 효과음 모음 ----
  function env(type, t, dur, vol, fromHz, toHz) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fromHz, t);
    if (toHz && toHz !== fromHz) o.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function burst(t, dur, vol, hp) {
    if (!noiseBuf) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function sfx(name) {
    if (!ensure()) return;
    resume();
    const t = ctx.currentTime;
    switch (name) {
      case 'pickup':                       // 아이템 상자 획득 — 또랑또랑 두 음
        env('square', t, 0.09, 0.15, f(84), f(84));
        env('square', t + 0.07, 0.14, 0.15, f(91), f(91));
        break;
      case 'use':                          // 아이템 사용 — 짧게 쏘는 소리
        env('sawtooth', t, 0.18, 0.14, 900, 220);
        burst(t, 0.09, 0.10, 2200);
        break;
      case 'boost':                        // 부스터 — 위로 훑는 소리
        env('sawtooth', t, 0.34, 0.15, 260, 1250);
        burst(t, 0.28, 0.09, 900);
        break;
      case 'hit':                          // 맞아서 빙글 — 아래로 미끄러지는 소리
        env('square', t, 0.38, 0.16, 540, 110);
        burst(t, 0.20, 0.16, 700);
        break;
      case 'jump':
        env('triangle', t, 0.14, 0.13, 420, 980);
        break;
      case 'land':
        burst(t, 0.08, 0.12, 500);
        break;
      case 'lap':                          // 한 바퀴 — 딩동
        env('triangle', t, 0.16, 0.15, f(83), f(83));
        env('triangle', t + 0.13, 0.26, 0.15, f(88), f(88));
        break;
    }
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem('kart3d_music', muted ? 'off' : 'on'); } catch (_) {}
    if (!ctx) return;
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(muted ? 0 : 0.5, now + 0.15);
    sfxGain.gain.setValueAtTime(muted ? 0 : 0.9, now);
  }

  return {
    resume, beep, sfx, fanfare, startMusic, stopMusic, setMuted,
    setUserTrack, clearUserTrack, restoreUserTrack,
    userTrackName: () => userName,
    isMuted: () => muted,
    isPlaying: () => playing
  };
}
