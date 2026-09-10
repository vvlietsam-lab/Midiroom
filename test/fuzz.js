const fs = require('fs');
const C = require('../src/core.js');

const RUNS = +(process.argv[2] || 2000);
const scales = Object.keys(C.SCALES);
const progs = C.PROGRESSIONS.map(p => p.id);
const parts = C.PART_ORDER;
const barsOpts = [1, 2, 4, 8, 16, 32];
const chordSizes = [2, 3, 4, 5];

let seed = 12345;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const pick = a => a[Math.floor(rnd() * a.length)];

const fails = {};
function fail(kind, detail) { (fails[kind] = fails[kind] || []).push(detail); }

let totalNotes = 0, totalParts = 0, emptyParts = 0;
const scoreStats = [];

for (let i = 0; i < RUNS; i++) {
  const chosen = parts.filter(() => rnd() < 0.5);
  if (!chosen.length) chosen.push(pick(parts));
  const scale = pick(scales), root = Math.floor(rnd() * 12), prog = pick(progs);
  const bars = pick(barsOpts), chordSize = pick(chordSizes);
  const partOpts = {};
  chosen.forEach(id => {
    const bank = C.STYLES[C.PART_DEFS[id].styles];
    const opts = {};
    (C.EXTRAS[id] || []).forEach(o => { opts[o.key] = o.options ? pick(o.options) : rnd() < 0.5; });
    partOpts[id] = {
      style: rnd() < 0.5 ? '' : pick(bank).id,
      octave: Math.floor(rnd() * 7) - 3,
      opts,
      articulation: pick(['auto','groove','legato','staccato']),
      vary: Math.floor(rnd() * 3),
    };
  });
  const params = {
    seed: 'F' + i, root, octave: 5, scale, progression: prog, bars,
    chordSize, chordBars: pick([1, 2, 4]), bpm: 40 + Math.floor(rnd() * 260),
    parts: chosen, partOpts, tries: 8,
    humanize: rnd() < 0.5, timingHumanize: rnd() < 0.5, swing: rnd() < 0.4 ? rnd() * 0.6 : 0,
  };

  let sec;
  const useArr = rnd() < 0.25;
  const genre = rnd() < 0.6 ? pick(C.GENRES.filter(g => !g.free)) : null;
  const structureUsed = pick(C.STRUCTURES).id;
  try {
    sec = useArr
      ? C.generateArrangement(params, structureUsed, genre)
      : C.generateSection(params);
  }
  catch (e) { fail('threw', (useArr ? 'arr ' : '') + JSON.stringify(params).slice(0, 160) + ' :: ' + e.message); continue; }

  const allowed = new Set(C.SCALES[scale].steps.map(x => (x + root) % 12));
  const totalTicks = (sec.meta ? sec.meta.bars : bars) * 4 * C.TPQ;

  for (const p of sec.parts) {
    totalParts++;
    if (!p.events.length) { emptyParts++; fail('emptyPart', p.id + ' bars=' + bars); continue; }
    totalNotes += p.events.length;
    if (p.part && p.part.score != null) scoreStats.push(p.part.score);

    const bySlot = new Map();
    const lastEnd = new Map();
    const sorted = p.events.slice().sort((a, b) => a.tick - b.tick);
    for (const e of sorted) {
      if (!Number.isInteger(e.midi) || e.midi < 0 || e.midi > 127) fail('midiRange', p.id + ' ' + e.midi);
      if (!Number.isFinite(e.tick) || e.tick < 0) fail('badTick', p.id + ' ' + e.tick);
      if (!Number.isInteger(e.dur) || e.dur <= 0) fail('badDur', p.id + ' ' + e.dur);
      if (e.vel < 1 || e.vel > 127) fail('badVel', p.id + ' ' + e.vel);
      const po = (partOpts && partOpts[p.id]) || {};
      const chromatic = (po.opts && (po.opts.tension || po.opts.chromatic)) || p.id === 'darkmelody' || p.id === 'harmony';
      if (p.id !== 'drums' && p.id !== 'harmony' && !chromatic && !allowed.has(((e.midi % 12) + 12) % 12)) fail('outOfKey', p.id + ' ' + e.midi + ' in ' + root + scale);
      if (e.tick >= totalTicks) fail('pastEnd', p.id + ' tick ' + e.tick + ' >= ' + totalTicks);
      const k = e.tick + ':' + e.midi;
      if (bySlot.has(k)) fail('duplicateNote', p.id + ' ' + k);
      bySlot.set(k, 1);
      const le = lastEnd.get(e.midi);
      if (le != null && e.tick < le) fail('overlapSamePitch', p.id + ' pitch ' + e.midi + ' at ' + e.tick + ' prev ends ' + le);
      lastEnd.set(e.midi, e.tick + e.dur);
    }
  }

  // MIDI bytes must be structurally valid
  if (sec.parts.length) {
    let bytes;
    try { bytes = C.buildMidi(sec.parts.map(p => ({ name: p.label, events: p.events })), params.bpm); }
    catch (e) { fail('midiThrew', e.message); continue; }
    if (bytes[0] !== 0x4D || bytes[1] !== 0x54 || bytes[2] !== 0x68 || bytes[3] !== 0x64) fail('badHeader', 'run ' + i);
    if (i % 200 === 0) fs.writeFileSync(require('path').join(require('os').tmpdir(),'fuzz_' + i + '.mid'), Buffer.from(bytes));
  }

  // determinism
  if (i % 97 === 0) {
    const again = useArr
      ? C.generateArrangement(params, structureUsed, genre)
      : C.generateSection(params);
    const a = JSON.stringify(sec.parts.map(p => p.events));
    const b = JSON.stringify(again.parts.map(p => p.events));
    if (a !== b) fail('nondeterministic', 'run ' + i);
  }
}

console.log('=== fuzz: ' + RUNS + ' sections, ' + totalParts + ' parts, ' + totalNotes + ' notes ===');
const keys = Object.keys(fails);
if (!keys.length) console.log('no invariant violations');
else keys.forEach(k => {
  console.log('  ' + k + ': ' + fails[k].length + '   e.g. ' + fails[k][0]);
});
if (scoreStats.length) {
  const avg = scoreStats.reduce((a, b) => a + b, 0) / scoreStats.length;
  console.log('melodic score: avg ' + avg.toFixed(1) + '  min ' + Math.min(...scoreStats) + '  max ' + Math.max(...scoreStats));
}
console.log('empty parts:', emptyParts);
