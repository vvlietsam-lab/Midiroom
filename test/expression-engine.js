const assert = require('node:assert/strict');
const { expressClip } = require('../src/expression-engine.js');

const ev = (tick, midi, vel = 88, dur = 360) => ({ tick, midi, vel, dur });
function fixture(vocalTiming = false) {
  const lead = [];
  for (let bar = 0; bar < 8; bar++) [0, 360, 720, 1320, 1560].forEach((at, i) => lead.push(ev(bar * 1920 + at, 60 + [0, 3, 5, 7, 5][i], 82 + i, 240)));
  return { marker: 'keep', vocalTiming, vocalSourceSerial: vocalTiming ? 4 : undefined, meta: { bars: 8, root: 0, scale: { steps: [0, 2, 3, 5, 7, 8, 10] } }, parts: [
    { id: 'kick', events: [0, 480, 960, 1440].flatMap(t => [ev(t, 36, 110, 80), ev(t + 1920, 36, 110, 80)]) },
    { id: 'drums', events: [ev(0, 36), ev(480, 38), ev(720, 42, 65, 90)] },
    { id: 'chords', events: [ev(0, 60, 76, 1700), ev(0, 64, 76, 1700), ev(0, 67, 76, 1700), ev(1920, 62, 76, 1700), ev(1920, 65, 76, 1700), ev(1920, 69, 76, 1700)] },
    { id: 'lead', events: lead },
    { id: 'bass', events: [ev(0, 36), ev(720, 39), ev(1920, 36)] }
  ] };
}

const source = fixture(), snapshot = structuredClone(source);
const a = expressClip(source, { mode: 'bold', seed: 'SAM' });
const b = expressClip(source, { mode: 'bold', seed: 'SAM' });
assert.deepEqual(a, b, 'same seed is deterministic');
assert.deepEqual(source, snapshot, 'source is immutable');
assert.equal(a.customEdit, true);
assert.deepEqual(a.parts.find(p => p.id === 'kick'), source.parts.find(p => p.id === 'kick'), 'kick remains exact');
assert.deepEqual(a.parts.find(p => p.id === 'drums').events.map(e => e.tick), source.parts.find(p => p.id === 'drums').events.map(e => e.tick), 'drum timing remains exact');
assert.notDeepEqual(a.parts.find(p => p.id === 'lead').events, source.parts.find(p => p.id === 'lead').events, 'melodic performance changes');
assert.notDeepEqual(expressClip(source, { mode: 'natural', seed: 'A' }), expressClip(source, { mode: 'natural', seed: 'B' }), 'seeds create different performances');

const chord = a.parts.find(p => p.id === 'chords').events.slice(0, 3);
assert.equal(new Set(chord.map(e => e.midi)).size, 3, 'chord pitches preserved');
assert.ok(Math.max(...chord.map(e => e.tick)) - Math.min(...chord.map(e => e.tick)) <= 26, 'chord stays one coherent strum');
assert.ok(chord.every(e => e.tick >= 0 && e.tick < 1920), 'strum stays inside its bar');
const preStrummed = structuredClone(source);
preStrummed.parts.find(p => p.id === 'chords').events.slice(0, 3).forEach((e, i) => { e.tick = i * 9; });
const regrouped = expressClip(preStrummed, { mode: 'pocket', seed: 'human chord' }).parts.find(p => p.id === 'chords').events.slice(0, 3);
assert.ok(Math.max(...regrouped.map(e => e.tick)) - Math.min(...regrouped.map(e => e.tick)) <= 16, 'slightly pre-strummed chord remains one gesture');

const protectedClip = expressClip(source, { mode: 'bold', seed: 8, locks: { lead: true }, targets: ['lead', 'bass'] });
assert.deepEqual(protectedClip.parts.find(p => p.id === 'lead'), source.parts.find(p => p.id === 'lead'), 'locked target exact');
assert.deepEqual(protectedClip.parts.find(p => p.id === 'chords'), source.parts.find(p => p.id === 'chords'), 'non-target exact');
assert.notDeepEqual(protectedClip.parts.find(p => p.id === 'bass'), source.parts.find(p => p.id === 'bass'), 'unlocked target expressed');

const vocal = fixture(true), voiced = expressClip(vocal, { mode: 'bold', seed: 9 });
for (const originalPart of vocal.parts) {
  const changed = voiced.parts.find(p => p.id === originalPart.id);
  assert.deepEqual(changed.events.map(e => e.tick), originalPart.events.map(e => e.tick), 'vocal timing exact for ' + originalPart.id);
  assert.equal(changed.events.length, originalPart.events.length, 'vocal provenance adds no notes');
}
assert.equal(voiced.vocalTiming, true);
assert.equal(voiced.vocalSourceSerial, 4);

const retrigger = { meta: { bars: 1 }, parts: [{ id: 'lead', events: [ev(100, 60, 90, 500), ev(300, 62, 90, 300)] }] };
const retriggered = expressClip(retrigger, { mode: 'natural', seed: 3 }).parts[0].events;
assert.ok(retriggered[0].tick + retriggered[0].dur <= retriggered[1].tick, 'monophonic gate stops at next onset');
const arranged = fixture(); arranged.arrangement = true;
const arrangedLeadCount = arranged.parts.find(p => p.id === 'lead').events.length;
assert.equal(expressClip(arranged, { mode: 'bold', seed: 7 }).parts.find(p => p.id === 'lead').events.length, arrangedLeadCount, 'arrangement breaths never receive ornaments');
const late = { arrangement: true, meta: { bars: 1 }, parts: [{ id: 'lead', events: [ev(1700, 60, 90, 80)] }] };
const lateOut = expressClip(late, { mode: 'bold', seed: 4 }).parts[0].events[0];
assert.ok(lateOut.tick + lateOut.dur <= 1780, 'expression never extends the original active ending');

for (const mode of ['natural', 'pocket', 'bold']) for (let seed = 0; seed < 80; seed++) {
  const out = expressClip(source, { mode, seed });
  for (const p of out.parts) for (const e of p.events) {
    assert.ok(Number.isInteger(e.tick) && e.tick >= 0 && e.tick < 15360, 'tick bounded');
    assert.ok(Number.isInteger(e.dur) && e.dur >= 1 && e.tick + e.dur <= 15360, 'duration bounded');
    assert.ok(Number.isInteger(e.midi) && e.midi >= 0 && e.midi <= 127, 'pitch bounded');
    assert.ok(Number.isInteger(e.vel) && e.vel >= 1 && e.vel <= 127, 'velocity bounded');
  }
  const lead = out.parts.find(p => p.id === 'lead').events;
  const silentBars = [];
  for (let bar = 0; bar < 8; bar++) if (!source.parts.find(p => p.id === 'lead').events.some(e => Math.floor(e.tick / 1920) === bar)) silentBars.push(bar);
  assert.ok(silentBars.every(bar => !lead.some(e => Math.floor(e.tick / 1920) === bar)), 'intentional empty bars stay empty');
}

const huge = { meta: { bars: 1 }, parts: [{ id: 'lead', events: Array.from({ length: 50001 }, (_, i) => ev(i % 1920, 60)) }] };
assert.throws(() => expressClip(huge, {}), /50\.000/);
const almostHuge = { meta: { bars: 4, root: 0, scale: { steps: [0, 2, 3, 5, 7, 8, 10] } }, parts: [
  { id: 'kick', events: Array.from({ length: 49997 }, (_, i) => ev(i % 1920, 36)) },
  { id: 'lead', events: [ev(7000, 60, 90, 90), ev(7200, 62, 90, 90), ev(7320, 64, 90, 90)] }
] };
assert.throws(() => expressClip(almostHuge, { mode: 'bold', seed: 2 }), /50\.000/, 'post-transform cap enforced');
assert.throws(() => expressClip(source, { mode: 'chaos' }), /Onbekende/);
console.log('EXPRESSION ENGINE PASS · deterministic · modes · locks · vocal timing · chord strum · 240 randomized performances');
