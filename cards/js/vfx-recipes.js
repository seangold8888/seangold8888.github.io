(function () {
  "use strict";

  const recipes = Object.freeze({
    "redhood:0": Object.freeze({
      id: "stone-arc-chip",
      asset: "art/vfx/stone-arc.webp",
      material: "stone",
      impactShape: "stone-chip",
      source: Object.freeze({ x: 0.62, y: 0.42 }),
      target: Object.freeze({ x: 0.5, y: 0.46 }),
      size: 116,
      hitStopMs: 38,
      recoilPx: 5,
      launchCount: 4,
      impactCount: 14
    }),
    "perseus:0": Object.freeze({
      id: "gold-blade-cleave",
      asset: "art/vfx/gold-blade.webp",
      material: "metal",
      impactShape: "metal-spark",
      source: Object.freeze({ x: 0.57, y: 0.38 }),
      target: Object.freeze({ x: 0.5, y: 0.44 }),
      size: 210,
      hitStopMs: 44,
      recoilPx: 7,
      launchCount: 3,
      impactCount: 16
    }),
    "arthur:0": Object.freeze({
      id: "gold-blade-cleave",
      asset: "art/vfx/gold-blade.webp",
      material: "metal",
      impactShape: "metal-spark",
      source: Object.freeze({ x: 0.58, y: 0.38 }),
      target: Object.freeze({ x: 0.5, y: 0.44 }),
      size: 238,
      hitStopMs: 52,
      recoilPx: 9,
      launchCount: 4,
      impactCount: 20
    }),
    "snowqueen:0": Object.freeze({
      id: "frost-needle-crack",
      asset: "art/vfx/frost-needle.webp",
      material: "ice",
      impactShape: "ice-shard",
      source: Object.freeze({ x: 0.6, y: 0.34 }),
      target: Object.freeze({ x: 0.5, y: 0.45 }),
      size: 132,
      hitStopMs: 42,
      recoilPx: 6,
      launchCount: 5,
      impactCount: 15
    }),
    "threepigs:1": Object.freeze({
      id: "storybook-bump",
      asset: "art/vfx/monster-impact.webp",
      material: "earth",
      impactShape: "round-stone",
      source: Object.freeze({ x: 0.52, y: 0.44 }),
      target: Object.freeze({ x: 0.5, y: 0.48 }),
      size: 182,
      hitStopMs: 44,
      recoilPx: 7,
      launchCount: 2,
      impactCount: 17
    }),
    "wolf:1": Object.freeze({
      id: "storybook-boom",
      asset: "art/vfx/monster-impact.webp",
      material: "earth",
      impactShape: "dust",
      source: Object.freeze({ x: 0.48, y: 0.4 }),
      target: Object.freeze({ x: 0.5, y: 0.48 }),
      size: 194,
      hitStopMs: 42,
      recoilPx: 7,
      launchCount: 3,
      impactCount: 18
    }),
    "tiger:1": Object.freeze({
      id: "storybook-boom",
      asset: "art/vfx/monster-impact.webp",
      material: "earth",
      impactShape: "round-stone",
      source: Object.freeze({ x: 0.52, y: 0.4 }),
      target: Object.freeze({ x: 0.5, y: 0.48 }),
      size: 220,
      hitStopMs: 52,
      recoilPx: 9,
      launchCount: 3,
      impactCount: 22
    })
  });

  window.CardVfxRecipes = Object.freeze({
    get: function (cardId, attackIndex) {
      return recipes[String(cardId) + ":" + String(attackIndex)] || null;
    },
    all: recipes
  });
}());
