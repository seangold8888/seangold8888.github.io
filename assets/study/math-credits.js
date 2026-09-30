// Playground answer receipts join Today's Study, once each, independently of math resets.
(function (root) {
  "use strict";
  const KEY = "hub_math_receipts_v1", IMPORTED = "hub_math_imported_v1", TX = "hub_math_import_tx_v1";
  const SET = 15, DAILY = 100;
  function day(now) {
    const d = now === undefined ? new Date() : new Date(now);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function json(storage, key) {
    const raw = storage.getItem(key);
    try { return JSON.parse(raw || "null"); } catch (_) { return null; }
  }
  function integer(value, max) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? Math.min(max, n) : 0;
  }
  function receipts(storage, today) {
    const raw = json(storage, KEY);
    const ids = raw && raw.day === today && Array.isArray(raw.ids)
      ? [...new Set(raw.ids.filter(id => typeof id === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(id)))].slice(0, DAILY) : [];
    return { day: today, ids };
  }
  function runId() {
    return root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }
  function record(storage, id, now) {
    try {
      const list = receipts(storage, day(now));
      if (typeof id !== "string" || !/^[a-zA-Z0-9:_-]{1,160}$/.test(id)) return { ok: false, added: false };
      if (list.ids.includes(id) || list.ids.length >= DAILY) return { ok: true, added: false, count: list.ids.length };
      list.ids.push(id);
      storage.setItem(KEY, JSON.stringify(list));
      return { ok: true, added: true, count: list.ids.length };
    } catch (_) { return { ok: false, added: false }; }
  }
  function imported(storage, today) {
    const value = json(storage, IMPORTED);
    return value && value.day === today ? integer(value.count, DAILY) : 0;
  }
  function preview(storage, now) {
    try {
      const today = day(now), list = receipts(storage, today);
      const sameDay = storage.getItem("hub2_date") === today;
      const base = sameDay ? integer(storage.getItem("hub2_solved"), 100000) : 0;
      const delta = Math.max(0, list.ids.length - imported(storage, today));
      const solved = base + Math.min(delta, Math.max(0, DAILY - base));
      const credit = sameDay ? integer(storage.getItem("hub2_credit"), 1) : 0;
      return { ok: true, solved, delta, credit: credit || (solved < DAILY && Math.floor(solved / SET) > Math.floor(base / SET) ? 1 : 0) };
    } catch (_) { return { ok: false, solved: 0, delta: 0, credit: 0 }; }
  }
  function validTx(t, today) {
    return t && t.day === today && Number.isInteger(t.solved) && t.solved >= 0 && t.solved <= 100000 &&
      (t.credit === 0 || t.credit === 1) && Number.isInteger(t.count) && t.count > 0 && t.count <= DAILY;
  }
  function apply(storage, t) {
    // Write the import marker LAST; interrupted writes replay an exact snapshot.
    // A completed import never resurrects a spent ticket, even if cleanup failed.
    if (storage.getItem("hub2_date") === t.day && imported(storage, t.day) >= t.count) {
      storage.removeItem(TX); return;
    }
    storage.setItem("hub2_solved", String(t.solved));
    storage.setItem("hub2_credit", String(t.credit));
    if (t.newDay) storage.setItem("hub2_parent_mode", "0");
    storage.setItem("hub2_date", t.day);
    storage.setItem(IMPORTED, JSON.stringify({ day: t.day, count: t.count }));
    storage.removeItem(TX);
  }
  function flush(storage, now) {
    try {
      const today = day(now), pending = json(storage, TX);
      if (validTx(pending, today)) apply(storage, pending);
      else if (pending) storage.removeItem(TX);
      const list = receipts(storage, today), status = preview(storage, now);
      if (!status.ok) return status;
      if (!status.delta) return Object.assign(status, { added: 0 });
      const t = { day: today, solved: status.solved, credit: status.credit, count: list.ids.length,
        newDay: storage.getItem("hub2_date") !== today };
      storage.setItem(TX, JSON.stringify(t));
      apply(storage, t);
      return Object.assign(status, { added: status.delta });
    } catch (_) { return { ok: false, added: 0 }; }
  }
  const api = { KEY, IMPORTED, TX, SET, DAILY, day, runId, record, preview, flush };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HubMathCredits = api;
})(typeof window !== "undefined" ? window : globalThis);
