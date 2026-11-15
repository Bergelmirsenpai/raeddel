const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const vm = require('node:vm');
const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync('puzzles.js', 'utf8'), dataContext);
const puzzles = JSON.parse(JSON.stringify(dataContext.window.RAEDDEL_PUZZLES));
const first = puzzles[0];
const allWords = p => [p.start, ...p.steps.map(s => s.answer)];
const normalize = s => s.replace(/[„“]/g, '').toLocaleUpperCase('de-DE');
const identity = p => ({ puzzleId: p.id, structureVersion: p.structureVersion,
  chainSignature: allWords(p).join('|') });
const record = (p, count = p.steps.length) => ({ ...identity(p), step: count,
  solvedEdges: Array.from({ length: count }, (_, i) => i), finished: count === p.steps.length,
  hintedSteps: [], revealedSteps: [], score: count * 5, scoreStatus: 'v2' });
async function open(page, admin = false, date = first.date) {
  await page.clock.install({ time: new Date('2026-11-15T12:00:00Z') });
  await page.goto(admin ? '?admin=sesamraeddel' : './');
  if (admin) await page.locator('#adminPuzzle').selectOption(date);
  else if (date !== '2026-11-15') {
    await page.locator('#archiveBtn').click();
    await page.locator(`[data-date="${date}"]`).click();
  }
}
async function guess(page, word) {
  await page.locator('#guess').fill(word);
  await page.locator('#guessForm').press('Enter');
}
async function solve(page, p) { for (const step of p.steps) await guess(page, step.answer); }
async function seed(page, records) {
  await page.addInitScript(value => { if (!localStorage.getItem('raeddel-v2')) localStorage.setItem('raeddel-v2', value); },
    JSON.stringify({ schemaVersion: 2, records }));
}

// Every chain is played all the way through from BOTH ends, with all clues
// visible. Data assertions cannot replace this interaction check.
for (const p of puzzles) test(`complete #${p.legacyId} both directions (${p.steps.length + 1} words)`, async ({ page }) => {
  await open(page, true, p.date);
  for (const reverse of [false, true]) {
    if (reverse) {
      await page.locator('#adminReset').click();
      await page.locator('#directionBtn').click();
    }
    if (!reverse) expect(await page.locator('.clue').allTextContents()).not.toEqual(
      p.steps.map(s => s.clues.forward.replace('_', `„${p.start}“`)));
    const words = reverse ? allWords(p).slice(0, -1).reverse() : p.steps.map(s => s.answer);
    for (let i = 0; i < words.length; i++) {
      const current = reverse ? allWords(p)[p.steps.length - i] : allWords(p)[i];
      const inserts = await page.locator('.clue:not(.used) .clue-insert').allTextContents();
      expect(inserts.length).toBe(p.steps.length - i);
      expect(new Set(inserts).size).toBe(1);
      expect(inserts.every(s => normalize(s) === current)).toBeTruthy();
      await expect(page.locator('.clue.highlight, .clue.active')).toHaveCount(0);
      await expect(page.locator('#lengthLabel')).toHaveText(`${[...words[i]].length} Buchstaben`);
      await expect(page.locator('#finishArea')).toBeHidden(); // final edge must still be entered
      await guess(page, words[i].toLocaleLowerCase('de-DE'));
      if (i < words.length - 1) await expect(page.locator('.clue.used')).toHaveCount(i + 1);
    }
    await expect(page.locator('#finishText')).toContainText(`${p.steps.length * 5} von ${p.steps.length * 5}`);
    await expect(page.locator('#finishArea')).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  }
});

for (const p of [puzzles[1], puzzles[14], puzzles[29]]) test(`alternate direction throughout #${p.legacyId}`, async ({ page }) => {
  await open(page, true, p.date);
  const words = allWords(p); let left = 0, right = p.steps.length;
  for (let count = 0; left < right; count++) {
    await expect(page.locator('#finishArea')).toBeHidden();
    if (count % 2 === 0) await guess(page, words[++left]);
    else await guess(page, words[--right]);
    if (left < right) await page.locator('#directionBtn').click();
  }
  await expect(page.locator('#finishText')).toContainText(`${p.steps.length * 5} von ${p.steps.length * 5}`);
});

test('actual daily completion uses Berlin date when UTC is still yesterday', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-14T23:30:00Z') });
  await page.goto('./'); await solve(page, puzzles[1]);
  await page.locator('#statsBtn').click();
  await expect(page.locator('.stat strong')).toHaveText(['1', '1', String(puzzles[1].steps.length * 5)]);
});

test('regular completion persists and archive does not extend daily streak', async ({ page }) => {
  await open(page);
  await solve(page, first);
  await page.reload();
  await page.locator('#archiveBtn').click();
  await page.locator(`[data-date="${first.date}"]`).click();
  await expect(page.locator('#finishArea')).toBeVisible();
  await page.locator('#statsBtn').click();
  await expect(page.locator('.stat strong')).toHaveText(['1', '0', String(first.steps.length * 5)]);
});

test('switch repeatedly, tip 2, reveal 0, final edge manual, no double points', async ({ page }) => {
  await open(page);
  const order = await page.locator('.clue').allTextContents();
  await expect(page.locator('.clue-insert').first()).toHaveCSS('color', 'rgb(23, 101, 179)');
  await page.locator('#directionBtn').click(); await page.locator('#directionBtn').click();
  expect(await page.locator('.clue').allTextContents()).toEqual(order);
  await page.locator('#tipBtn').click();
  await expect(page.locator('.clue.highlight')).toHaveCount(1);
  await guess(page, first.steps[0].answer); // 2
  await guess(page, first.steps[1].answer); // 5
  await page.locator('#directionBtn').click();
  page.on('dialog', d => d.accept());
  await page.locator('#revealBtn').click(); // 0, last edge from reverse side
  await page.locator('#directionBtn').click();
  await page.locator('#directionBtn').click();
  await expect(page.locator('.clue.used')).toHaveCount(3);
  await expect(page.locator('.clue.highlight.used')).toHaveCount(1);
  for (let i = first.steps.length - 2; i >= 2; i--) {
    await expect(page.locator('#finishArea')).toBeHidden();
    await guess(page, allWords(first)[i]);
  }
  await expect(page.locator('#finishText')).toContainText(`${first.steps.length * 5 - 8} von ${first.steps.length * 5}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('raeddel-v2')));
  expect(new Set(saved.records[first.date].solvedEdges).size).toBe(first.steps.length);
  expect(saved.records[first.date].revealedSteps).toHaveLength(1);
});

test('last remaining connection may be revealed and earns zero', async ({ page }) => {
  await open(page, true);
  for (const s of first.steps.slice(0, -1)) await guess(page, s.answer);
  await expect(page.locator('#finishArea')).toBeHidden();
  page.on('dialog', d => d.accept());
  await page.locator('#revealBtn').click();
  await expect(page.locator('#finishText')).toContainText(`${(first.steps.length - 1) * 5} von ${first.steps.length * 5}`);
});

test('Berlin streak after midnight with UTC date difference', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-14T23:30:00Z') });
  const p = puzzles[1];
  await seed(page, { [p.date]: { ...record(p), completedAt: '2026-11-14T23:15:00Z' } });
  await page.goto('./');
  await page.locator('#statsBtn').click();
  await expect(page.locator('.stat strong')).toHaveText(['1', '1', String(p.steps.length * 5)]);
});
for (const [time, date] of [
  ['2026-03-28T23:00:00Z', '2026-03-29'], ['2026-03-29T22:00:00Z', '2026-03-30'],
  ['2026-10-24T22:00:00Z', '2026-10-25'], ['2026-10-25T23:00:00Z', '2026-10-26'],
]) test('Berlin boundary ' + time, async ({ page }) => {
  await page.clock.install({ time: new Date(time) });
  await page.route('**/puzzles.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() +
      `;window.RAEDDEL_PUZZLES=[{...window.RAEDDEL_PUZZLES[0],date:'${date}',legacyId:99},{...window.RAEDDEL_PUZZLES[1],date:'2099-01-01'}];` });
  });
  await page.goto('./');
  await expect(page.locator('#puzzleTitle')).toHaveText('Räddel #99');
});
test('midnight automatically selects next puzzle', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-14T22:59:50Z') });
  await page.goto('./');
  await expect(page.locator('#puzzleTitle')).toHaveText('Räddel #1');
  await page.clock.fastForward(30000);
  await expect(page.locator('#puzzleTitle')).toHaveText('Räddel #2');
});

test('one-time reset reconciles all old records before archive and stats', async ({ page }) => {
  const old = { step: 4, solvedEdges: [0, 1, 2, 3], finished: true, score: 20,
    scoreStatus: 'v2', hintedSteps: [0], revealedSteps: [2], completedAt: '2026-11-14T12:00:00Z' };
  const unaffected = { ...record(puzzles[1]), completedAt: '2026-11-15T12:00:00Z' };
  await seed(page, { [first.date]: old, [puzzles[1].date]: unaffected });
  await open(page);
  await expect(page.locator('#updateNotice')).toBeVisible();
  await expect(page.locator('#progressText')).toContainText('0 von');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('raeddel-v2')));
  expect(state.records[first.date].completedAt).toBeUndefined();
  expect(state.records[first.date].score).toBe(0);
  expect(state.records[first.date].hintedSteps).toEqual([]);
  expect(state.records[first.date].revealedSteps).toEqual([]);
  expect(state.records[puzzles[1].date].completedAt).toBe(unaffected.completedAt);
  await page.locator('#statsBtn').click();
  await expect(page.locator('.stat strong')).toHaveText(['1', '1', String(puzzles[1].steps.length * 5)]);
  await page.locator('#closeModal').click();
  await guess(page, first.steps[0].answer);
  await page.reload();
  await page.locator('#archiveBtn').click(); await page.locator(`[data-date="${first.date}"]`).click();
  await expect(page.locator('#progressText')).toContainText('1 von');
});

test('text corrections retain progress, hints, order and completion history', async ({ page }) => {
  const p = puzzles[1], saved = { ...record(p, 2), hintedSteps: [0], revealedSteps: [1],
    score: 2, clueOrder: Array.from({ length: p.steps.length }, (_, i) => p.steps.length - 1 - i) };
  await seed(page, { [p.date]: saved });
  await page.route('**/puzzles.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() +
      ';window.RAEDDEL_PUZZLES[1].editorialVersion++;window.RAEDDEL_PUZZLES[1].steps[0].clues.forward="Neue Formulierung zu _: ein abgeschlossener Bereich.";' });
  });
  await open(page, false, p.date);
  await expect(page.locator('#updateNotice')).toBeHidden();
  const r = await page.evaluate(date => JSON.parse(localStorage.getItem('raeddel-v2')).records[date], p.date);
  for (const key of ['solvedEdges', 'hintedSteps', 'revealedSteps', 'score', 'clueOrder']) expect(r[key]).toEqual(saved[key]);
});
for (const mutation of ['version', 'sequence', 'id']) test('reset when ' + mutation + ' changes, including same length', async ({ page }) => {
  const p = puzzles[1];
  await seed(page, { [p.date]: record(p, 2) });
  await page.route('**/puzzles.js*', async route => {
    const response = await route.fetch();
    const change = mutation === 'version' ? 'p.structureVersion++' : mutation === 'id' ? 'p.id="different-id"' : 'p.steps[0].answer="SAUM"';
    await route.fulfill({ response, body: await response.text() + `;{const p=window.RAEDDEL_PUZZLES[1];${change};}` });
  });
  await open(page, false, p.date);
  await expect(page.locator('#updateNotice')).toBeVisible();
  await expect(page.locator('#progressText')).toContainText('0 von');
});

test('incompatible backup cannot overwrite compatible progress', async ({ page }) => {
  await seed(page, { [first.date]: record(first, 1) });
  await open(page);
  await page.locator('#statsBtn').click();
  const old = { step: 4, solvedEdges: [0, 1, 2, 3], score: 20, finished: true };
  await page.locator('#importFile').setInputFiles({ name: 'old.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 2, records: { [first.date]: old } })) });
  const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.locator('#importBtn').click();
  await expect(page.locator('#progressText')).toContainText('1 von');
  await expect.poll(() => dialogs.some(s => s.includes('nicht importiert'))).toBeTruthy();
});
test('compatible backup imports and exports structure identity', async ({ page }) => {
  await open(page);
  await page.locator('#statsBtn').click(); page.on('dialog', d => d.accept());
  await page.locator('#importFile').setInputFiles({ name: 'current.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 2, records: { [first.date]: record(first, 3) } })) });
  await page.locator('#importBtn').click();
  await expect(page.locator('#progressText')).toContainText('3 von');
  await page.locator('#statsBtn').click();
  const downloadPromise = page.waitForEvent('download'); await page.locator('#exportBtn').click();
  const exported = JSON.parse(fs.readFileSync(await (await downloadPromise).path(), 'utf8'));
  expect(exported.records[first.date].chainSignature).toBe(identity(first).chainSignature);
});

test('invalid clue order is regenerated without erasing compatible progress', async ({ page }) => {
  await seed(page, { [first.date]: { ...record(first, 1), clueOrder: Array(first.steps.length).fill(99) } });
  await open(page);
  await expect(page.locator('.clue')).toHaveCount(first.steps.length);
  await expect(page.locator('.clue.used')).toHaveCount(1);
});
test('admin leaves regular V1 and V2 storage byte-for-byte intact', async ({ page }) => {
  const existing = JSON.stringify({ schemaVersion: 2, records: { [first.date]: { step: 1, score: 5 } } });
  await page.addInitScript(value => { localStorage.setItem('raeddel-v2', value); localStorage.setItem('raeddel-v1', 'old'); }, existing);
  await open(page, true); await guess(page, first.steps[0].answer);
  expect(await page.evaluate(() => localStorage.getItem('raeddel-v2'))).toBe(existing);
  expect(await page.evaluate(() => localStorage.getItem('raeddel-v1'))).toBe('old');
});
test('share URL retains /raeddel/ and drops admin parameters', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: async data => window.shared = data.text });
  });
  await open(page, true); await solve(page, first); await page.locator('#shareBtn').click();
  await expect.poll(() => page.evaluate(() => window.shared)).toContain('http://127.0.0.1:8187/raeddel/');
  expect(await page.evaluate(() => window.shared)).not.toContain('admin=');
});
for (const width of [320, 390]) test('mobile long endpoints and clues at ' + width, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await open(page, true);
  for (const p of [first, puzzles[14], puzzles[29]]) {
    await page.locator('#adminPuzzle').selectOption(p.date);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.locator('#directionBtn').click();
    await expect(page.locator('#guess')).toBeVisible();
  }
  await page.goto('editor.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test('editor bounds, placeholder validation, removal and full package export', async ({ page }) => {
  await page.goto('editor.html');
  await expect(page.locator('.editstep')).toHaveCount(8);
  for (let i = 0; i < 2; i++) await page.locator('.remove').last().click();
  await page.locator('#validate').click();
  await expect(page.locator('#report')).toContainText('7 bis 11');
  for (let i = 0; i < 6; i++) await page.locator('#add').click();
  await page.locator('#validate').click();
  await expect(page.locator('#report')).toContainText('7 bis 11');
  for (let i = 0; i < 4; i++) await page.locator('.remove').last().click();
  const p = puzzles[2]; // eight edges
  await page.locator('#start').fill(p.start);
  for (let i = 0; i < p.steps.length; i++) {
    const row = page.locator('.editstep').nth(i), s = p.steps[i];
    await row.locator('.answer').fill(s.answer); await row.locator('.kind').selectOption(s.kind);
    await row.locator('.hint').fill(s.clues.forward); await row.locator('.reverse').fill(s.clues.reverse);
    await row.locator('.explanation').fill(s.explanation);
  }
  await page.locator('.reverse').first().fill('Kein Platzhalter'); await page.locator('#validate').click();
  await expect(page.locator('#report')).toContainText('Beide Hinweise benötigen');
  await page.locator('.reverse').first().fill(p.steps[0].clues.reverse);
  await page.locator('#validate').click(); await expect(page.locator('#report')).toContainText('Formale Prüfung bestanden');
  page.on('dialog', d => d.accept()); const pending = page.waitForEvent('download'); await page.locator('#export').click();
  const code = fs.readFileSync(await (await pending).path(), 'utf8'); const c = { window: {} }; vm.runInNewContext(code, c);
  expect(c.window.RAEDDEL_PUZZLES).toHaveLength(31);
  expect(JSON.stringify(c.window.RAEDDEL_PUZZLES.slice(0, 30))).toBe(JSON.stringify(puzzles));
  expect(c.window.RAEDDEL_PUZZLES[30].structureVersion).toBe(1);
});
