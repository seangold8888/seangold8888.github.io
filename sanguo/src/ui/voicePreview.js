import { loadData, person } from '../data.js';
import { workPerson } from '../data/works.js';
import { ELEVEN_VOICE_PACKS, FAMILY_VOICE_PREVIEWS, WARRIOR_VOICE_PREVIEWS, selectWarriorVoice, warriorVoiceSelected } from '../game/elevenVoicePacks.js';
import { FAMILY_SKILL_LINES } from '../../../assets/audio/family-skill-voices.js?v=1';

const grid = document.getElementById('voice-grid');
const status = document.getElementById('voice-status');
let activeAudio = null;
const nameOf = id => (workPerson(id) || person(id)).name || id;

async function start() {
  await loadData();
  const response = await fetch('audio/warrior-callouts-eleven-v2/manifest.json');
  if (!response.ok) throw new Error('목소리 목록을 읽을 수 없습니다.');
  const manifest = await response.json();
  const ids = [...Object.keys(FAMILY_VOICE_PREVIEWS), 'liubei', 'guanyu', 'zhangfei', ...Object.keys(WARRIOR_VOICE_PREVIEWS).filter(id => !['liubei', 'guanyu'].includes(id))];
  for (const id of ids) {
    const saved = id === 'zhangfei';
    const family = FAMILY_VOICE_PREVIEWS[id];
    const info = family || manifest.heroes[id];
    const card = document.createElement('section'); card.className = 'voice-card'; card.dataset.hero = id;
    card.dataset.work = workPerson(id)?.work || 'sanguo';
    const title = document.createElement('h2'); title.textContent = nameOf(id);
    const phrase = document.createElement('p'); phrase.textContent = saved ? '장판뇌후!' : info?.specialPhrase || info?.phrase || '필살기 함성';
    const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'none';
    audio.src = family ? ELEVEN_VOICE_PACKS[id].special : saved ? 'audio/hero-callouts-ko-v6/zhangfei-special-v6.wav' : WARRIOR_VOICE_PREVIEWS[id];
    audio.setAttribute('aria-label', `${nameOf(id)} 필살기 함성 듣기`);
    audio.addEventListener('play', () => { if (activeAudio && activeAudio !== audio) activeAudio.pause(); activeAudio = audio; });
    audio.addEventListener('error', () => { status.textContent = `${nameOf(id)} 목소리를 읽지 못했어요. 연결을 확인하고 다시 들어보세요.`; });
    const button = document.createElement('button'); button.type = 'button';
    const update = () => {
      const selected = !!family || warriorVoiceSelected(id);
      button.textContent = FAMILY_SKILL_LINES[id] ? '기술별 함성 적용 · 멀티버스 / 삼국지' : family ? '게임 적용 중 · 돌진 / 필살 / 무쌍' : saved ? '지금 목소리 유지' : selected ? '선택됨 · 원래 목소리로 바꾸기' : '이 목소리 전투에서 쓰기';
      button.setAttribute('aria-pressed', String(selected)); button.disabled = saved || !!family;
    };
    button.addEventListener('click', () => {
      const selected = !warriorVoiceSelected(id);
      if (!selectWarriorVoice(id, selected)) { status.textContent = '이 브라우저에서 선택을 저장할 수 없어요.'; return; }
      update(); status.textContent = `${nameOf(id)}의 ${selected ? '새' : '원래'} 필살기 음성을 선택했어요. 다음 출진부터 적용됩니다.`;
    });
    update(); card.append(title, phrase, audio, button);
    if (family?.specialPhrase && !FAMILY_SKILL_LINES[id]) {
      const catchphrase = document.createElement('p'); catchphrase.textContent = `돌진 / 무쌍: ${family.phrase}`;
      const catchphraseAudio = audio.cloneNode(); catchphraseAudio.src = ELEVEN_VOICE_PACKS[id].dash;
      catchphraseAudio.setAttribute('aria-label', `${nameOf(id)} 기존 돌진과 무쌍 기합 듣기`);
      catchphraseAudio.addEventListener('play', () => { if (activeAudio && activeAudio !== catchphraseAudio) activeAudio.pause(); activeAudio = catchphraseAudio; });
      catchphraseAudio.addEventListener('error', () => { status.textContent = `${nameOf(id)} 기존 기합을 읽지 못했어요.`; });
      card.append(catchphrase, catchphraseAudio);
    }
    if (FAMILY_SKILL_LINES[id]) {
      for (const line of Object.values(FAMILY_SKILL_LINES[id])) {
        if (line.file.replace(/^sanguo\//, '') === ELEVEN_VOICE_PACKS[id].special) continue;
        const label = document.createElement('p'); label.textContent = line.phrase;
        const clip = document.createElement('audio'); clip.controls = true; clip.preload = 'none'; clip.src = line.file.replace(/^sanguo\//, '');
        clip.setAttribute('aria-label', `${nameOf(id)} ${line.phrase} 듣기`);
        clip.addEventListener('play', () => { if (activeAudio && activeAudio !== clip) activeAudio.pause(); activeAudio = clip; });
        clip.addEventListener('error', () => { status.textContent = `${nameOf(id)} ${line.phrase} 음성을 읽지 못했어요.`; });
        card.append(label, clip);
      }
    }
    if (family) { const note = document.createElement('p'); note.className = 'voice-note'; note.textContent = `${family.role} · 창작 성우 연기`; card.append(note); }
    if (saved) { const note = document.createElement('p'); note.className = 'voice-note'; note.textContent = '기존 장판뇌후 음성 그대로'; card.append(note); }
    grid.append(card);
  }
  status.textContent = '우리 영웅 4명 적용 · 새 장수 함성 29명 · 장비 기존 함성 유지';
  document.querySelectorAll('nav [data-work]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('nav [data-work]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    for (const card of grid.children) card.hidden = button.dataset.work !== 'all' && card.dataset.work !== button.dataset.work;
    if (activeAudio) activeAudio.pause();
  }));
}
start().catch(error => { status.textContent = error.message; });
