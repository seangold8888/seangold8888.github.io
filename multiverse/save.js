// 멀티버스 2 저장. 별, 가진 조각, 영웅별 옷차림, 미션별 최고 별을 기기에 남긴다.
// 순수 함수로 두어 Node 테스트에서도 그대로 검사한다.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MVSave = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var KEY = "mv2_save";

  function fresh(data) {
    var outfit = {};
    Object.keys(data.STARTER).forEach(function (kid) { outfit[kid] = Object.assign({}, data.STARTER[kid]); });
    var owned = [];
    Object.keys(outfit).forEach(function (kid) {
      Object.keys(outfit[kid]).forEach(function (slot) {
        var id = outfit[kid][slot];
        if (id && owned.indexOf(id) < 0) owned.push(id);
      });
    });
    return { version: 1, stars: 0, owned: owned, outfit: outfit, best: {}, hero: "jaei", capsules: 0 };
  }

  // 망가진 값은 버리고 쓸 수 있는 것만 남긴다. 아이 기기라 저장이 깨져도 게임은 떠야 한다.
  function normalise(raw, data) {
    var base = fresh(data);
    if (!raw || typeof raw !== "object" || raw.version !== 1) return base;
    var itemIds = data.ITEMS.map(function (item) { return item.id; });
    var slotOf = {};
    data.ITEMS.forEach(function (item) { slotOf[item.id] = item.slot; });
    var out = base;
    out.stars = Number.isSafeInteger(raw.stars) && raw.stars >= 0 ? Math.min(raw.stars, 9999) : 0;
    out.capsules = Number.isSafeInteger(raw.capsules) && raw.capsules >= 0 ? raw.capsules : 0;
    if (Array.isArray(raw.owned)) {
      raw.owned.forEach(function (id) {
        if (itemIds.indexOf(id) >= 0 && out.owned.indexOf(id) < 0) out.owned.push(id);
      });
    }
    if (raw.outfit && typeof raw.outfit === "object") {
      Object.keys(out.outfit).forEach(function (kid) {
        var wear = raw.outfit[kid];
        if (!wear || typeof wear !== "object") return;
        data.SLOTS.forEach(function (slot) {
          var id = wear[slot.id];
          if (id === null) out.outfit[kid][slot.id] = null;
          else if (typeof id === "string" && slotOf[id] === slot.id && out.owned.indexOf(id) >= 0) out.outfit[kid][slot.id] = id;
        });
      });
    }
    if (raw.best && typeof raw.best === "object") {
      Object.keys(raw.best).forEach(function (key) {
        var v = raw.best[key];
        if (/^[a-z]+:[a-z]+$/.test(key) && Number.isInteger(v) && v >= 0 && v <= 3) out.best[key] = v;
      });
    }
    if (raw.hero === "jaei" || raw.hero === "taeo") out.hero = raw.hero;
    return out;
  }

  function load(data, storage) {
    try { return normalise(JSON.parse((storage || localStorage).getItem(KEY)), data); }
    catch (error) { return fresh(data); }
  }

  function save(state, storage) {
    try { (storage || localStorage).setItem(KEY, JSON.stringify(state)); return true; }
    catch (error) { return false; }
  }

  // 세계 n은 앞 세계의 보스를 이겨야 열린다. 한 세계 안의 미션은 앞 미션을 깨야 열린다.
  function missionOpen(state, data, worldIndex, missionIndex) {
    if (worldIndex > 0) {
      var prev = data.WORLDS[worldIndex - 1].id;
      if (!(state.best[prev + ":boss"] > 0)) return false;
    }
    if (missionIndex > 0) {
      var world = data.WORLDS[worldIndex].id;
      var before = data.MISSIONS[missionIndex - 1].id;
      if (!(state.best[world + ":" + before] > 0)) return false;
    }
    return true;
  }

  // 미션 결과. 새로 얻은 별만 더한다(같은 미션을 반복해도 최고 기록을 넘은 만큼만).
  // 다만 이미 별 3개인 미션도 한 번 깨면 별 1개를 준다. 다시 하는 재미를 막지 않는다.
  function recordMission(state, worldId, missionId, stars) {
    var next = JSON.parse(JSON.stringify(state));
    var key = worldId + ":" + missionId;
    var before = next.best[key] || 0;
    var earned = Math.max(0, stars - before);
    if (stars > 0 && earned === 0) earned = 1;
    next.best[key] = Math.max(before, stars);
    next.stars += earned;
    return { state: next, earned: earned };
  }

  // 캡슐: 별 3개. 아직 없는 조각 중 하나를 준다. 다 모으면 열 수 없다.
  function openCapsule(state, data, random) {
    var cost = data.CAPSULE_COST;
    var missing = data.ITEMS.filter(function (item) { return state.owned.indexOf(item.id) < 0; });
    if (state.stars < cost || missing.length === 0) return { state: state, item: null };
    var pick = missing[Math.floor((random || Math.random)() * missing.length) % missing.length];
    var next = JSON.parse(JSON.stringify(state));
    next.stars -= cost;
    next.capsules += 1;
    next.owned.push(pick.id);
    return { state: next, item: pick };
  }

  function equip(state, data, kid, itemId, slot) {
    var next = JSON.parse(JSON.stringify(state));
    if (!next.outfit[kid]) return state;
    if (itemId === null) { next.outfit[kid][slot] = null; return next; }
    var item = data.ITEMS.filter(function (it) { return it.id === itemId; })[0];
    if (!item || next.owned.indexOf(itemId) < 0) return state;
    next.outfit[kid][item.slot] = itemId;
    return next;
  }

  return { KEY: KEY, fresh: fresh, normalise: normalise, load: load, save: save,
    missionOpen: missionOpen, recordMission: recordMission, openCapsule: openCapsule, equip: equip };
});
