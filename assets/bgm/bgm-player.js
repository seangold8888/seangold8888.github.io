// 모험 상자 공용 배경음악 재생기.
// Lyria 3.5로 만든 40초 반복곡(assets/bgm/*.mp3)을 게임마다 같은 방식으로 재생한다.
// 규칙: 사용자가 처음 화면을 건드린 뒤에만 재생을 시작한다(iOS 자동재생 차단),
// 화면이 가려지면 멈추고 돌아오면 잇는다, 곡을 바꿀 때는 짧게 교차한다.
(function () {
  "use strict";

  var FADE_MS = 600;
  var STEP_MS = 40;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function createPlayer(options) {
    var settings = options || {};
    var basePath = settings.basePath || "assets/bgm/";
    var volume = typeof settings.volume === "number" ? clamp(settings.volume, 0, 1) : 0.35;
    var storageKey = settings.storageKey || "";
    var players = Object.create(null);
    var currentName = "";
    var current = null;
    var muted = false;
    var hidden = false;
    var unlocked = false;
    var started = false;
    var failed = false;
    var fadeTimer = 0;
    var listeners = [];

    if (storageKey) {
      try {
        muted = window.localStorage.getItem(storageKey) === "1";
      } catch (error) {
        muted = false;
      }
    }

    function notify() {
      listeners.forEach(function (listener) {
        try {
          listener({ playing: Boolean(started && !failed), failed: failed, track: currentName });
        } catch (error) {}
      });
    }

    function elementFor(name) {
      if (players[name]) return players[name];
      var audio = new Audio(basePath + name + ".mp3");
      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0;
      audio.addEventListener("error", function () {
        failed = true;
        notify();
      });
      players[name] = audio;
      return audio;
    }

    function canPlay() {
      return Boolean(unlocked && currentName && !muted && !hidden);
    }

    function stepFade() {
      fadeTimer = 0;
      var active = canPlay() ? current : null;
      var busy = false;
      Object.keys(players).forEach(function (name) {
        var audio = players[name];
        var target = audio === active ? volume : 0;
        var delta = (volume * STEP_MS) / FADE_MS;
        if (Math.abs(audio.volume - target) <= delta) {
          audio.volume = target;
        } else {
          audio.volume = clamp(audio.volume + (target > audio.volume ? delta : -delta), 0, 1);
          busy = true;
        }
        if (audio.volume === 0 && audio !== active && !audio.paused) audio.pause();
      });
      if (busy) fadeTimer = window.setTimeout(stepFade, STEP_MS);
    }

    function apply() {
      var active = canPlay() ? current : null;
      if (active && active.paused) {
        var playing = active.play();
        if (playing && typeof playing.catch === "function") {
          playing.catch(function () {
            // 자동재생이 막히면 조용히 넘어가고 다음 조작에서 다시 시도한다.
            unlocked = false;
            notify();
          });
        }
        started = true;
        notify();
      }
      if (!fadeTimer) fadeTimer = window.setTimeout(stepFade, STEP_MS);
    }

    function unlock() {
      if (unlocked) return;
      unlocked = true;
      apply();
    }

    var player = {
      setTrack: function (name) {
        var next = name ? String(name) : "";
        if (next === currentName) return currentName;
        currentName = next;
        current = next ? elementFor(next) : null;
        if (current) {
          current.preload = "auto";
          try {
            current.currentTime = 0;
          } catch (error) {}
        }
        apply();
        return currentName;
      },
      track: function () {
        return currentName;
      },
      setMuted: function (value) {
        muted = Boolean(value);
        if (storageKey) {
          try {
            window.localStorage.setItem(storageKey, muted ? "1" : "0");
          } catch (error) {}
        }
        apply();
        return muted;
      },
      isMuted: function () {
        return muted;
      },
      setHidden: function (value) {
        hidden = Boolean(value);
        apply();
        return hidden;
      },
      setVolume: function (value) {
        volume = clamp(Number(value) || 0, 0, 1);
        apply();
        return volume;
      },
      unlock: unlock,
      isPlaying: function () {
        return Boolean(started && !failed && canPlay());
      },
      hasFailed: function () {
        return failed;
      },
      // 점검용 현재 상태. 재생 요소는 문서에 붙이지 않으므로 이 창구로만 볼 수 있다.
      state: function () {
        return {
          track: currentName,
          playing: player.isPlaying(),
          muted: muted,
          hidden: hidden,
          unlocked: unlocked,
          failed: failed,
          time: current ? current.currentTime : 0,
          volume: current ? Number(current.volume.toFixed(3)) : 0,
          paused: current ? current.paused : true
        };
      },
      onChange: function (listener) {
        if (typeof listener === "function") listeners.push(listener);
        return player;
      },
      stop: function () {
        currentName = "";
        current = null;
        started = false;
        apply();
      }
    };

    ["pointerdown", "keydown", "touchstart"].forEach(function (type) {
      document.addEventListener(type, unlock, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", function () {
      player.setHidden(document.hidden);
    });
    window.addEventListener("pagehide", function () {
      player.setHidden(true);
    });
    window.addEventListener("pageshow", function () {
      player.setHidden(document.hidden);
    });

    return player;
  }

  window.HubBgm = { create: createPlayer, fadeMs: FADE_MS };
})();
