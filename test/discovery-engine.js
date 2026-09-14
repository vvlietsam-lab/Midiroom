const assert = require('node:assert/strict');
const { discoverClip, transplantRhythm } = require('../src/discovery-engine.js');

const chord = (tick, root) => [root, root + 3, root + 7].map(midi => ({ tick, dur: 360, midi, vel: 86 }));
const source = { bpm: 155, vocalTiming: true, vocalMode: 'follow', vocalSourceSerial: 8, meta: { bars: 8, root: 0, scale: { steps: [0, 2, 3, 5, 7, 8, 10] }, extra: 'keep' }, parts: [
  { id: 'kick', label: 'Kick', colour: '#f00', events: Array.from({ length: 32 }, (_, i) => ({ tick: i * 480, dur: 80, midi: 36, vel: 110 })), part: { bars: [] } },
  { id: 'bass', events: Array.from({ length: 24 }, (_, i) => ({ tick: i * 600, dur: 300, midi: 36 + i % 3 * 3, vel: 92 })), part: {} },
  { id: 'chords', events: Array.from({ length: 8 }, (_, b) => chord(b * 1920, 60 + b % 2 * 2)).flat(), part: {} },
  { id: 'lead', events: Array.from({ length: 16 }, (_, i) => ({ tick: i * 900, dur: 420, midi: 60 + i % 7, vel: 90 })), part: {} }
] };
const snapshot = JSON.stringify(source);
const sig = x => JSON.stringify(x.parts.map(p => p.events));
function valid(clip) { clip.parts.forEach(p => p.events.forEach(e => { assert.ok(Number.isInteger(e.tick) && Number.isInteger(e.dur)); assert.ok(e.tick >= 0 && e.dur > 0 && e.tick + e.dur <= clip.meta.bars * 1920); assert.ok(e.midi >= 0 && e.midi <= 127 && e.vel >= 1 && e.vel <= 127); })); }

const outputs = ['space', 'drive', 'evolve', 'rhythm'].map(recipe => {
  const a = discoverClip(source, recipe, 'same-seed', {}), b = discoverClip(source, recipe, 'same-seed', {});
  assert.deepEqual(a, b, recipe + ' deterministic');
  assert.equal(a.customEdit, true); assert.equal(a.vocalTiming, false); assert.equal(a.vocalSourceSerial, undefined);
  assert.equal(a.meta.extra, 'keep'); assert.equal(a.meta.discovery.recipe, recipe); valid(a); return a;
});
assert.equal(new Set(outputs.map(sig)).size, 4, 'recipes meaningfully differ');
assert.ok(outputs[0].parts.find(p => p.id === 'lead').events.length < source.parts.find(p => p.id === 'lead').events.length, 'space creates phrase gaps');
assert.ok(outputs[1].parts.find(p => p.id === 'bass').events.length > source.parts.find(p => p.id === 'bass').events.length, 'drive adds bounded repeats');
assert.deepEqual(discoverClip(source, 'drive', 'x', { chords: true }).parts.find(p => p.id === 'chords'), source.parts.find(p => p.id === 'chords'), 'locked track exact');
assert.equal(JSON.stringify(source), snapshot, 'source never mutated');

const transplanted = transplantRhythm(source, 'kick', 'chords');
assert.deepEqual(transplanted.parts.find(p => p.id === 'kick'), source.parts.find(p => p.id === 'kick'), 'donor exact');
assert.deepEqual(transplanted.parts.find(p => p.id === 'bass'), source.parts.find(p => p.id === 'bass'), 'unrelated exact');
assert.equal(new Set(transplanted.parts.find(p => p.id === 'chords').events.map(e => e.tick)).size, source.parts.find(p => p.id === 'kick').events.length, 'donor onsets applied');
assert.ok(transplanted.parts.find(p => p.id === 'chords').events.every(e => [60, 63, 67, 62, 65, 69].includes(e.midi)), 'target chord pitches preserved');
assert.deepEqual(transplantRhythm(source, 'kick', 'chords', { chords: true }), source, 'locked target returns exact clone'); valid(transplanted);

const empty = { meta: { bars: 2 }, marker: 1, parts: [{ id: 'lead', events: [], part: {} }] };
assert.deepEqual(discoverClip(empty, 'space', 1).parts[0].events, [], 'empty part safe');
assert.equal(JSON.stringify(source), snapshot, 'transplant never mutated source');
console.log('DISCOVERY ENGINE PASS · 4 recipes · locks · poly rhythm transplant · empty safety');
