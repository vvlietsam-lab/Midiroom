/* Chord detection round-trip: generate known harmony, read it back, assert we recover it. */
const assert = require('assert');
const C = require('../src/core.js');
let checks = 0;
const check = (v, label) => { assert.ok(v, label); checks++; };

const keys = [0, 4, 8, 11];
const scales = ['aeolian', 'phrygian', 'harmonicMinor'];
let top1 = 0, top3 = 0, pitchOk = 0, pitchTotal = 0, cases = 0;

for (const prog of C.PROGRESSIONS.map(p => p.id)) {
  for (const root of keys) {
    for (const scale of scales) {
      for (const chordBars of [1, 2]) {
        const sec = C.generateSection({
          seed: 'HD' + root + prog + chordBars, octave: 5, root, scale,
          progression: prog, bars: 8, bpm: 150, chordBars,
          parts: ['chords', 'bass'], partOpts: { chords: { style: 'whole' } },
        });
        const src = sec.parts.flatMap(p => p.events);
        const d = C.detectHarmony(src, {});
        cases++;
        check(d.ok, 'detectie slaagt voor ' + prog);
        check(d.candidates.length >= 3, 'er zijn alternatieven om uit te kiezen');
        check(d.degrees.length >= 1 && d.degrees.every(x => Number.isInteger(x) && x >= 0 && x < 7),
              'graden zijn geldige schaaltrappen');
        check(d.chordBars >= 1 && d.chordBars <= 4, 'harmonisch ritme is plausibel');
        const hit = c => c.root === root && c.scale === scale;
        if (hit(d.candidates[0])) top1++;
        if (d.candidates.slice(0, 3).some(hit)) top3++;

        // the decisive property: are the actual chord notes read back exactly?
        for (let b = 0; b < 4; b++) {
          const want = [...new Set(src.filter(e => e.tick < (b + 1) * 1920 && e.tick + e.dur > b * 1920)
            .map(e => ((e.midi % 12) + 12) % 12))].sort((x, y) => x - y).join(',');
          const got = ((d.chords[b] || { pitches: [] }).pitches).slice().sort((x, y) => x - y).join(',');
          pitchTotal++; if (want === got) pitchOk++;
        }

        // a detected progression must actually drive generation
        const rebuilt = C.generateSection({
          seed: 'RB', octave: 5, root: d.candidates[0].root, scale: d.candidates[0].scale,
          progression: 'euphoric', customDegrees: d.degrees, bars: 8, bpm: 150,
          chordBars: d.chordBars, parts: ['chords'], partOpts: { chords: { style: 'whole' } },
        });
        check(rebuilt.parts[0].events.length > 0, 'hergenereren op het herkende schema levert noten');
      }
    }
  }
}

const pct = (n, d) => (n / d * 100);
check(pct(top3, cases) >= 90, 'juiste toonsoort staat in de top 3 (' + pct(top3, cases).toFixed(0) + '%)');
check(pct(pitchOk, pitchTotal) >= 99, 'akkoordnoten exact herkend (' + pct(pitchOk, pitchTotal).toFixed(1) + '%)');
check(C.detectHarmony([], {}).ok === false, 'leeg invoerbestand faalt netjes');
check(C.detectHarmony([{ tick: 0, dur: 100, midi: 60 }], {}).ok === false, 'te weinig noten faalt netjes');

console.log(JSON.stringify({
  suite: 'harmony-detect', checks, cases,
  keyTop1: pct(top1, cases).toFixed(0) + '%',
  keyTop3: pct(top3, cases).toFixed(0) + '%',
  chordPitches: pct(pitchOk, pitchTotal).toFixed(1) + '%',
}, null, 2));
