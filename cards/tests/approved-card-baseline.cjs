"use strict";
// Historical fingerprints predate the explicitly approved 2026-09-13 Midas rollback.
// Only its passive is normalized here; balance-update.test.js locks the new passive
// and the entire remaining 84-card snapshot (including the four family members).
exports.beforeMidasRollback = cards => cards.map(card => card.id === "midas"
  ? {...card, passive:{name:"황금 갑옷",desc:"오행 상성 추가 피해 +10을 받지 않아요",fx:"no_weakness"}}
  : card);
