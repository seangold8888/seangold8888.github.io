// Visual-only governor: never changes physics, AI, timers or input sampling.
export function visualQuality({ forcedLow = false, slowMs = 34, frames = 45 } = {}) {
  let low = !!forcedLow, average = 16.7, slow = 0;
  return {
    setLow(value) { const changed = low !== !!value; low = !!value; average = 16.7; slow = 0; return changed; },
    observe(ms) {
      // Tab suspension / debugger pauses are not evidence of a slow GPU.
      if (low || !Number.isFinite(ms) || ms <= 0 || ms > 250) return false;
      average += (ms - average) * .12;
      slow = average > slowMs ? slow + 1 : Math.max(0, slow - 2);
      if (slow < frames) return false;
      low = true; return true;
    },
    get low() { return low; },
    get pixelScale() { return low ? .65 : 1; },
    state() { return { low, averageMs: average, slowFrames: slow }; }
  };
}
