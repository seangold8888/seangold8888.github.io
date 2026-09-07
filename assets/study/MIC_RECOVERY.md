# English microphone recovery — 2026-09-06

Scope: microphone/audio lifecycle repair. Preserve the in-progress 68-sentence expansion. Do not claim the iPad is fixed solely from mocked browser tests.

## Evidence and limits

WebKit report https://bugs.webkit.org/show_bug.cgi?id=321436 describes speech recognition producing no result, error or end after audio/video playback. The report is on one iOS 26.6 device; this is a matching symptom, not confirmation of this child's iPad version or a universally effective fix. Its related report is https://github.com/WebAudio/web-speech-api/issues/96. Therefore MP3 playback cannot be ruled out merely because three simulated passes work.

## Implementation

- Create an empty audio element: no praise URL, preload or load call just before recognition.start.
- After a clip ends/errors/is cancelled, clear its handlers, pause only if necessary, remove src, load the empty element to release the media resource. Do not touch already-empty paused elements at the next mic start.
- Keep full praise playback through ended; do not impose a fixed speech duration. Ignore stale progress events. Log waiting/stalled events without transcripts.
- Detect no-start (12 seconds for initial permissions, 4 seconds after prior praise) and no-result (12 seconds) separately from the existing 25-second utterance limit. Re-enable controls and never award/penalize on a watchdog timeout.
- Offer an explicit “소리 끄고 마이크 복구” button. It opts this page session into silent praise/word feedback, primes capture only on that tap, immediately stops all returned tracks, waits 350ms, and starts a fresh recognizer. No MediaRecorder, recorded audio or uploads are added. Late permission results are stopped even after disposal or timeout.
- Stalled priming is bounded to 8 seconds; permissions denial, navigation, offline and disposal cancel the attempt. No autonomous indefinite restart loop.

## Validation

Added regressions for retained media source across question mounts, missing start/results, responsive interim results, successful manual recovery, late permissions after cancellation, and denial without scoring. These use browser fakes; real iPad testing remains necessary.

Final handoff: all 47 English tests passed on published commit 0c830bb (module v7, cache v44). The other ongoing task completed all 62 new MP3s and included these microphone edits in that commit from the shared workspace. Verified the public English module, worker and index against the validated files, plus sample new MP3s (HTTP 200). The final published set has 68 sentences and 100 word clips. The initially prepared microphone-only commit 466fd8b was not pushed because the upstream update already included the same fix; no force push or sentence rollback occurred.

Device check: pass at least 10 sentences, including a full Wonderful and third-pass praise, then intentionally misread a word and retry. If stalled, use the recovery button and confirm progress continues silently. With ?readinglog=1, check start / mic-on / result / mic-off / praise-ended / next. A remaining hardware hang after recovery must be reported as unresolved, not scored as a reading error.
