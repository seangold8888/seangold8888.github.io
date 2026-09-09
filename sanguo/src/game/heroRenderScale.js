// The newer painted atlases were exported with much less transparent padding
// than the original Guan Yu/Zhao Yun sheets. These visual-only multipliers keep
// comparable adult heroes the same on-screen height while preserving deliberate
// stature: Xu Chu stays broad, and the child heroes remain shorter.
export const HERO_RENDER_SCALES = Object.freeze({
  machao: .96,
  huangzhong: .94,
  xiahoudun: .90,
  zhangliao: .92,
  xuchu: .92,
  simayi: .89,
  sunquan: .89,
  taishici: .93,
  ganning: .90,
  luxun: .88,
  nezha: .84,
  erlangshen: .80,
  honghaier: .83,
});

export const heroRenderScale = (heroId) => HERO_RENDER_SCALES[heroId] || 1;
