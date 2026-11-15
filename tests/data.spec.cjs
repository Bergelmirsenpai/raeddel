const { test, expect } = require('playwright/test');
const fs = require('node:fs'), vm = require('node:vm');
const manifest = require('./editorial-manifest.json');
const c = { window: {} }; vm.runInNewContext(fs.readFileSync('puzzles.js', 'utf8'), c);
const data = JSON.parse(JSON.stringify(c.window.RAEDDEL_PUZZLES));
const editorialReport = fs.readFileSync('docs/REDAKTION.md', 'utf8');
const counts = text => [...text].reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
const surplus = (a, b) => Object.entries(a).reduce((n, [k, v]) => n + Math.max(0, v - (b[k] || 0)), 0);
function subsequence(short, long) { let i = 0; for (const x of long) if (short[i] === x) i++; return i === short.length; }
test('ALL 30 chains: identity, dates, 8–12 words, 538 contextual clues and no answer disclosure', () => {
  expect(data).toHaveLength(30); expect(manifest).toHaveLength(30);
  const ids = new Set(), dates = new Set(), pairs = new Set(); let total = 0;
  for (let i = 0; i < data.length; i++) {
    const p = data[i], review = manifest[i], words = [p.start, ...p.steps.map(s => s.answer)];
    expect(p.id).toBe(review.id); expect(p.date).toBe(review.date); expect(p.legacyId).toBe(review.legacyId);
    expect(p.id).toBe('rd-' + p.date); expect(p.structureVersion).toBe(2); expect(p.editorialVersion).toBe(4);
    expect(new Date(Date.parse('2026-11-14T12:00:00Z') + i * 86400000).toISOString().slice(0,10)).toBe(p.date);
    expect(ids.has(p.id)).toBeFalsy(); ids.add(p.id); expect(dates.has(p.date)).toBeFalsy(); dates.add(p.date);
    expect(words.length).toBeGreaterThanOrEqual(8); expect(words.length).toBeLessThanOrEqual(12);
    expect(new Set(words).size).toBe(words.length); expect(p.steps.at(-1).answer).toBe(p.end);
    expect(p.steps).toHaveLength(review.edges.length);
    words.forEach(w => expect(w).toMatch(/^[A-ZÄÖÜẞ]+$/u));
    for (let j = 0; j < p.steps.length; j++) {
      const s = p.steps[j], edge = review.edges[j], from = words[j], to = words[j+1]; total++;
      expect(from).toBe(edge.fromWord); expect(to).toBe(edge.toWord);
      const key = [from,to].sort().join('|'); expect(pairs.has(key), key).toBeFalsy(); pairs.add(key);
      expect(['letter','meaning']).toContain(s.kind); expect(s.hint).toBe(s.clues.forward);
      expect(s.explanation.length).toBeGreaterThan(20);
      for (const [direction, target, source] of [['forward',to,from],['reverse',from,to]]) {
        const clue = s.clues[direction]; expect(clue.split('_')).toHaveLength(2);
        expect(editorialReport).toContain(clue.replace('_', source));
        if (s.kind === 'meaning') expect(clue.startsWith('_: ')).toBeTruthy();
        expect(clue.length).toBeGreaterThan(35); expect(clue.replace('_', source)).not.toContain('_');
        expect(clue.toLocaleUpperCase('de-DE'), `${p.id} edge ${j+1} ${direction}`).not.toMatch(new RegExp(`(?<![A-ZÄÖÜ])${target}(?![A-ZÄÖÜ])`,'u'));
      }
      const a=counts(from), b=counts(to), added=surplus(b,a), removed=surplus(a,b);
      if(edge.mechanism==='Tausch') { expect(from.length).toBe(to.length); expect([...from].filter((x,k)=>x!==to[k])).toHaveLength(edge.changes); }
      if(edge.mechanism==='Einfügen') { expect(to.length).toBeGreaterThan(from.length); expect(subsequence(from,to)).toBeTruthy(); }
      if(edge.mechanism==='Entfernen') { expect(from.length).toBeGreaterThan(to.length); expect(subsequence(to,from)).toBeTruthy(); }
      if(edge.mechanism==='Anagramm') { expect(added).toBe(0); expect(removed).toBe(0); }
      if(edge.mechanism==='Anagramm+') { expect(added).toBe(1); expect(removed).toBe(0); }
      if(edge.mechanism==='Anagramm−') { expect(added).toBe(0); expect(removed).toBe(1); }
      if(edge.mechanism==='Anagramm+Tausch') { expect(added).toBe(1); expect(removed).toBe(1); }
      if(edge.mechanism==='Umkehr') expect([...from].reverse().join('')).toBe(to);
    }
  }
  expect(total).toBe(269);
});
