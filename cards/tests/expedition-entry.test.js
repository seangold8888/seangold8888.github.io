const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
test('expedition is first; card gallery is inside a closed, labelled native disclosure', () => {
  assert.ok(html.indexOf('id="campaignButton"') < html.indexOf('id="cardBrowse"'));
  assert.equal((html.match(/id="campaignButton"/g) || []).length, 1);
  const browse = html.match(/<details id="cardBrowse"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(browse); assert.doesNotMatch(browse[0].split('>')[0], /\bopen\b/);
  assert.match(browse[1], /<summary><span>카드 보기<\/span>/);
  assert.match(browse[1], /id="collectionGrid"/);
  assert.match(html, /aria-labelledby="adventureTitle"/);
  assert.doesNotMatch(html, /영웅 도감|카드 컬렉션/);
});
test('explicit card links remain open; expedition exit restores the main entrance without resetting progress', () => {
  assert.match(app, /dom\.cardBrowse\.open = Boolean\(requested\)/);
  assert.match(app, /get\("view"\) === "cards"/);
  assert.match(app, /onBattle: startBattle, onExit: returnToHome/);
  assert.match(app, /function returnToHome\(\) \{\s*returnToCollection\(\);\s*dom\.cardBrowse\.open = false;/);
  const ui = fs.readFileSync(path.join(root, 'js/campaign-ui.js'), 'utf8');
  assert.match(ui, /← 모험 홈/); assert.match(ui, /원정 떠나기/); assert.match(ui, /이어서/);
});
