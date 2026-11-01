// The newer painted atlases were exported with much less transparent padding
// than the original Guan Yu/Zhao Yun sheets. These visual-only multipliers keep
// comparable adult heroes the same on-screen height while preserving deliberate
// stature: Xu Chu stays broad, and the child heroes remain shorter.
export const HERO_RENDER_SCALES = Object.freeze({
  taeo: .68,
  jaei: .74,
  yunchan: .76,
  yungeon: .68,
  euljimundeok: .91,
  ganggamchan: .91,
  kwonyul: .92,
  yisunsin: .93,
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
  // 여포는 깃털 투구를 빼고도 가장 큰 장수로 보이게, 초선은 조금 작게.
  lvbu: 1.15,
  dongzhuo: .97,
  diaochan: .92,
  menghuo: 1.0,
  zhurong: .92,
  nezha: .84,
  erlangshen: .80,
  honghaier: .83,
});

export const heroRenderScale = (heroId) => HERO_RENDER_SCALES[heroId] || 1;
