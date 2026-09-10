const fs = require('fs');
const C = require('../src/core.js');
const TARGETS = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','reference','reference_targets.json'), 'utf8'));

// which of my parts is judged against which reference group, and with what options
const MAP = [
  ['screech',    'screech',    { opts: { density: 'sober' } }],
  ['screech',    'gabber',     { opts: { density: 'normaal', wander: true, followChords: true } }],
  ['arp',        'arp',        { style: 'walk' }],
  ['darkmelody', 'darkmelody', {}],
  ['lead',       'lead',       {}],
  ['chords',     'chords',     {}],
  ['bass',       'bass',       { style: 'heel' }],
  ['pad',        'pad',        {}],
];

function measure(partId, opts, runs = 60) {
  const pb = [], dens = [], uq = [], amb = [], lens = new Set();
  let uni = 0, ivTot = 0, vmin = 127, vmax = 0, vsum = 0, vn = 0;
  const sizes = {}, spacing = {};
  for (let i = 0; i < runs; i++) {
    const sec = C.generateSection({
      seed: 'ST' + partId + i, root: i % 12, octave: 5,
      scale: ['aeolian', 'phrygian', 'harmonicMinor'][i % 3],
      progression: C.PROGRESSIONS[i % C.PROGRESSIONS.length].id,
      bars: 8, bpm: 155, chordSize: 3, tries: 120,
      parts: [partId], partOpts: { [partId]: opts },
    });
    const p = sec.parts[0];
    if (!p || !p.events.length) continue;
    const ev = p.events.slice().sort((a, b) => a.tick - b.tick);
    const ps = ev.map(e => e.midi);
    const barMap = {}, slotMap = {};
    ev.forEach(e => {
      const b = Math.floor(e.tick / (4 * C.TPQ));
      (barMap[b] = barMap[b] || new Set()).add(e.midi);
      (slotMap[e.tick] = slotMap[e.tick] || []).push(e.midi);
      lens.add(+(e.dur / (C.TPQ / 4)).toFixed(2));
      vmin = Math.min(vmin, e.vel); vmax = Math.max(vmax, e.vel); vsum += e.vel; vn++;
    });
    Object.values(barMap).forEach(sset => pb.push(sset.size));
    Object.values(slotMap).forEach(arr => {
      sizes[arr.length] = (sizes[arr.length] || 0) + 1;
      if (arr.length > 1) {
        const srt = arr.slice().sort((a, b) => a - b);
        for (let k = 1; k < srt.length; k++) { const d = srt[k] - srt[k - 1]; spacing[d] = (spacing[d] || 0) + 1; }
      }
    });
    dens.push(ev.length / 8); uq.push(new Set(ps).size); amb.push(Math.max(...ps) - Math.min(...ps));
    for (let k = 1; k < ps.length; k++) { ivTot++; if (ps[k] === ps[k - 1]) uni++; }
  }
  const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0;
  return {
    pitchesPerBar: avg(pb), notesPerBar: avg(dens), uniquePitches: avg(uq), ambitus: avg(amb),
    uniqueLengths: lens.size, unisonShare: +(uni / Math.max(1, ivTot)).toFixed(3),
    velMin: vmin, velMax: vmax, velAvg: +(vsum / Math.max(1, vn)).toFixed(1),
    chordSizes: sizes, spacing,
  };
}

const KEYS = ['pitchesPerBar', 'notesPerBar', 'uniquePitches', 'ambitus', 'unisonShare'];
console.log('vergelijking met het referentiecorpus  (mijn waarde / referentie / afwijking)\n');
let flagged = 0;
for (const [partId, refName, opts] of MAP) {
  const ref = TARGETS[refName];
  if (!ref) continue;
  const mine = measure(partId, opts);
  const cells = KEYS.map(k => {
    const m = mine[k], r = ref[k];
    const d = r === 0 ? m : (m - r) / Math.abs(r);
    const bad = r === 0 ? Math.abs(m) > 0.2 : Math.abs(d) > 0.45;
    if (bad) flagged++;
    return `${k} ${m}/${r}${bad ? ' ⚠' + (d > 0 ? '+' : '') + Math.round(d * 100) + '%' : ''}`;
  });
  console.log(`${partId} → ${refName}`);
  console.log('   ' + cells.join('   '));
  console.log(`   velocity ${mine.velMin}-${mine.velMax} (ref ${ref.velMin}-${ref.velMax})   lengtes ${mine.uniqueLengths} (ref ${ref.uniqueLengths})`);
  if (Object.keys(ref.spacing).length) {
    console.log(`   akkoordafstanden mijn ${JSON.stringify(mine.spacing)}  ref ${JSON.stringify(ref.spacing)}`);
  }
}
console.log('\nafwijkingen groter dan 45%: ' + flagged);
