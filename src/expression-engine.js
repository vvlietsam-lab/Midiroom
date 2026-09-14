/* Pure, deterministic performance expression for MIDIROOM clips. */
(function (scope) {
  'use strict';
  const BAR = 1920;
  const MODES = {
    natural: { timing: 10, velocity: 7, gate: [.88, 1], strum: 5 },
    pocket:  { timing: 20, velocity: 11, gate: [.72, .96], strum: 8 },
    bold:    { timing: 34, velocity: 17, gate: [.55, 1], strum: 13 }
  };
  const POLY = new Set(['chords', 'pad', 'harmony']);
  const MELODIC = new Set(['lead', 'melody', 'screech', 'darkmelody', 'pluck', 'arp']);

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function random(seed) {
    let n = 2166136261;
    for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return function () {
      n = (n + 0x6D2B79F5) | 0;
      let t = Math.imul(n ^ n >>> 15, n | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function barsOf(clip) {
    const bars = Number(clip && clip.meta && clip.meta.bars);
    if (Number.isFinite(bars) && bars > 0) return Math.max(1, Math.floor(bars));
    const end = (clip.parts || []).flatMap(p => p.events || []).reduce((m, e) => Math.max(m, Number(e.tick) + Number(e.dur)), 0);
    return Math.max(1, Math.ceil(end / BAR));
  }
  function onsetGroups(events, tolerance) {
    const map = new Map();
    events.forEach(e => {
      const tick = Math.round(Number(e.tick));
      if (!Number.isFinite(tick)) return;
      if (!map.has(tick)) map.set(tick, []);
      map.get(tick).push(e);
    });
    const exact = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([tick, notes]) => ({ tick, notes }));
    if (!tolerance) return exact;
    const clustered = [];
    exact.forEach(group => {
      const previous = clustered[clustered.length - 1];
      if (previous && group.tick - previous.tick <= tolerance) previous.notes.push(...group.notes);
      else clustered.push({ tick: group.tick, notes: group.notes.slice() });
    });
    return clustered;
  }
  function scaleNotes(clip) {
    const root = clamp(Math.round(Number(clip.meta && clip.meta.root) || 0), 0, 11);
    const raw = clip.meta && clip.meta.scale && clip.meta.scale.steps;
    const steps = Array.isArray(raw) && raw.length ? raw.map(Number).filter(Number.isFinite).map(n => ((Math.round(n) % 12) + 12) % 12) : [0, 2, 3, 5, 7, 8, 10];
    const notes = [];
    for (let midi = 0; midi < 128; midi++) if (steps.includes((midi - root + 120) % 12)) notes.push(midi);
    return notes;
  }
  function adjacentScaleNote(notes, midi, direction) {
    let i = notes.reduce((best, n, at) => Math.abs(n - midi) < Math.abs(notes[best] - midi) ? at : best, 0);
    return notes[clamp(i + direction, 0, notes.length - 1)];
  }
  function velocityFor(event, tick, index, cfg, rand, id) {
    const source = Number.isFinite(Number(event.vel)) ? Number(event.vel) : 90;
    const beat = Math.floor((tick % BAR) / 480), phraseBar = Math.floor(tick / BAR) % 4;
    const beatAccent = beat === 0 ? 4 : beat === 2 ? 2 : -2;
    const phraseContour = [-2, 1, 3, -1][phraseBar];
    const alternating = index % 2 ? -2 : 2;
    const drumAccent = id === 'drums' && [36, 38, 39].includes(Number(event.midi)) ? 2 : 0;
    const jitter = Math.round((rand() * 2 - 1) * cfg.velocity * .45);
    return clamp(Math.round(source + beatAccent + phraseContour + alternating + drumAccent + jitter), 1, 127);
  }
  function timingOffset(tick, groupIndex, cfg, rand) {
    if (tick % BAR === 0) return 0; // downbeats remain a dependable DAW anchor
    const step = Math.round(tick / 120) % 16;
    const pocket = step % 4 === 2 ? cfg.timing * .35 : step % 4 === 3 ? cfg.timing * .18 : 0;
    const motifJitter = (rand() * 2 - 1) * cfg.timing * .55;
    return Math.round(pocket + motifJitter + (groupIndex % 4 === 3 ? cfg.timing * .12 : 0));
  }
  function expressPart(part, clip, mode, seed, vocalTiming) {
    if (part.id === 'kick') return clone(part);
    const cfg = MODES[mode], rand = random(String(seed) + ':expression:' + part.id + ':' + mode);
    const total = barsOf(clip) * BAR, poly = POLY.has(part.id), drums = part.id === 'drums';
    const groups = onsetGroups(part.events || [], poly && !vocalTiming ? 30 : 0), result = [];
    groups.forEach((group, gi) => {
      const originalTick = group.tick, barStart = Math.floor(originalTick / BAR) * BAR;
      const sharedOffset = vocalTiming || drums ? 0 : timingOffset(originalTick, gi, cfg, rand);
      const sharedTick = clamp(originalTick + sharedOffset, barStart, Math.min(total - 1, barStart + BAR - 1));
      const sorted = group.notes.slice().sort((a, b) => Number(a.midi) - Number(b.midi));
      sorted.forEach((event, ni) => {
        const strum = vocalTiming || drums || !poly ? 0 : ni * cfg.strum;
        const sourceDur = Math.max(1, Math.round(Number(event.dur) || 1));
        const originalEnd = clamp(Math.round(Number(event.tick) || 0) + sourceDur, 1, total);
        // Moving an onset may shorten the note, but can never extend its original
        // active range into a deliberate breath or across a section boundary.
        const tick = clamp(sharedTick + strum, barStart, Math.min(total - 1, barStart + BAR - 1, originalEnd - 1));
        const roleGate = part.id === 'pad' ? Math.max(.93, cfg.gate[0]) : cfg.gate[0];
        const gate = roleGate + rand() * (cfg.gate[1] - roleGate);
        const dur = clamp(Math.round(sourceDur * gate) - strum, 1, Math.min(total - tick, originalEnd - tick));
        result.push({ ...event, tick, dur, midi: clamp(Math.round(Number(event.midi) || 0), 0, 127), vel: velocityFor(event, originalTick, gi + ni, cfg, rand, part.id) });
      });
    });

    // Bold mode adds one coherent answer at selected four-bar phrase endings.
    // It only extends already-active, dense melodic phrases and never populates an empty bar.
    if (mode === 'bold' && !vocalTiming && !clip.arrangement && MELODIC.has(part.id)) {
      const allowed = scaleNotes(clip);
      for (let bar = 3; bar < barsOf(clip); bar += 4) {
        const inBar = result.filter(e => Math.floor(e.tick / BAR) === bar).sort((a, b) => a.tick - b.tick);
        if (inBar.length < 3) continue;
        const last = inBar[inBar.length - 1], barEnd = (bar + 1) * BAR;
        if (last.tick < bar * BAR + 1200 || last.tick + 180 >= barEnd) continue;
        const tick = last.tick + 120;
        if (inBar.some(e => Math.abs(e.tick - tick) < 45)) continue;
        result.push({ ...last, tick, dur: Math.max(30, Math.min(90, barEnd - tick)), midi: adjacentScaleNote(allowed, last.midi, rand() < .5 ? -1 : 1), vel: clamp(last.vel - 12, 1, 127) });
      }
    }
    result.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
    // MIDI retriggers must not leave a hanging voice over the next onset.
    // Monophonic roles trim at every onset; poly/drum roles trim per pitch.
    for (let i = 0; i < result.length; i++) {
      const event = result[i];
      let nextTick = total;
      for (let j = i + 1; j < result.length; j++) {
        if (!poly && !drums || result[j].midi === event.midi) { nextTick = result[j].tick; break; }
      }
      if (nextTick > event.tick) event.dur = Math.max(1, Math.min(event.dur, nextTick - event.tick));
    }
    return { ...clone(part), events: result };
  }
  function expressClip(source, options) {
    if (!source || !Array.isArray(source.parts)) throw new Error('Ongeldige bronclip.');
    options = options || {};
    const mode = options.mode || 'natural';
    if (!MODES[mode]) throw new Error('Onbekende expressiemodus: ' + mode);
    const count = source.parts.reduce((sum, p) => sum + (Array.isArray(p.events) ? p.events.length : 0), 0);
    if (count > 50000) throw new Error('Deze clip bevat meer dan 50.000 noten.');
    const locks = options.locks || {}, targets = Array.isArray(options.targets) ? new Set(options.targets) : null;
    const vocalTiming = source.vocalTiming === true;
    const out = clone(source);
    out.parts = source.parts.map(part => locks[part.id] || (targets && !targets.has(part.id)) ? clone(part) : expressPart(part, source, mode, options.seed == null ? 'expression' : options.seed, vocalTiming));
    const outputCount = out.parts.reduce((sum, p) => sum + (Array.isArray(p.events) ? p.events.length : 0), 0);
    if (outputCount > 50000) throw new Error('Expressie zou meer dan 50.000 noten opleveren.');
    out.customEdit = true;
    return out;
  }

  const api = { expressClip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.MidiroomExpression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
