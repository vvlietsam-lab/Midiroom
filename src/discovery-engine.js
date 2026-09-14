/* Pure MIDI discovery transforms. No DOM, audio or mutable shared state. */
(function (scope) {
  'use strict';
  const BAR = 1920;

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
  function choose(rand, values) { return values[Math.floor(rand() * values.length)]; }
  function barsOf(clip) {
    const metaBars = Number(clip && clip.meta && clip.meta.bars);
    if (Number.isFinite(metaBars) && metaBars > 0) return Math.max(1, Math.floor(metaBars));
    const last = (clip && clip.parts || []).flatMap(p => p.events || []).reduce((m, e) => Math.max(m, Number(e.tick) + Number(e.dur)), 0);
    return Math.max(1, Math.ceil(last / BAR));
  }
  function groups(events) {
    const map = new Map();
    (events || []).forEach(e => {
      const tick = Math.round(Number(e.tick));
      if (!Number.isFinite(tick)) return;
      if (!map.has(tick)) map.set(tick, []);
      map.get(tick).push(e);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([tick, notes]) => ({ tick, notes }));
  }
  function bounded(events, total, mono) {
    const used = new Set();
    return (events || []).map(e => {
      const tick = Math.max(0, Math.round(Number(e.tick) || 0));
      return { ...e, tick, dur: Math.max(1, Math.min(Math.round(Number(e.dur) || 1), total - tick)), midi: Math.max(0, Math.min(127, Math.round(Number(e.midi) || 0))), vel: Math.max(1, Math.min(127, Math.round(Number(e.vel) || 1))) };
    }).filter(e => e.tick < total && e.dur > 0).sort((a, b) => a.tick - b.tick || a.midi - b.midi).filter(e => {
      const key = e.tick + ':' + (mono ? 'mono' : e.midi);
      if (used.has(key)) return false;
      used.add(key); return true;
    });
  }
  function isPoly(id) { return ['chords', 'pad', 'harmony'].includes(id); }
  function finish(source, parts, recipe, seed) {
    const out = clone(source);
    out.parts = parts;
    out.customEdit = true;
    out.vocalTiming = false;
    delete out.vocalSourceSerial;
    delete out.vocalMode;
    out.meta = { ...(out.meta || {}), discovery: { recipe, seed: String(seed) } };
    return out;
  }
  function restylePart(part, recipe, seed, bars) {
    const rand = random(String(seed) + ':' + recipe + ':' + part.id);
    const total = bars * BAR, sourceGroups = groups(part.events);
    if (!sourceGroups.length) return clone(part);
    let result = [];
    if (recipe === 'space') {
      // Phrase-level gaps are more useful than random missing hits: one whole bar
      // rests in each four-bar phrase, while the remaining bars breathe too.
      const phraseGaps = Array.from({ length: Math.ceil(bars / 4) }, () => 2 + Math.floor(rand() * 2));
      for (let bar = 0; bar < bars; bar++) {
        const phraseGap = bar % 4 === phraseGaps[Math.floor(bar / 4)];
        if (phraseGap && !['kick', 'drums'].includes(part.id)) continue;
        groups(part.events.filter(e => Math.floor(e.tick / BAR) === bar)).forEach((g, gi) => {
          if (!['kick', 'drums'].includes(part.id) && gi % 3 === 2 && rand() < .72) return;
          g.notes.forEach(e => result.push({ ...e, dur: Math.max(30, Math.round(e.dur * choose(rand, [.42, .62, .84]))) }));
        });
      }
    } else if (recipe === 'drive') {
      sourceGroups.forEach((g, gi) => {
        g.notes.forEach(e => result.push({ ...e, dur: Math.max(30, Math.round(e.dur * .62)), vel: Math.min(127, e.vel + (gi % 4 === 0 ? 7 : 0)) }));
        if (g.tick % BAR >= 960 && rand() < .46) {
          const repeats = 1 + Math.floor(rand() * 2); // deliberately bounded: at most two echoes
          for (let r = 1; r <= repeats; r++) {
            const tick = g.tick + r * 120;
            if (tick >= Math.floor(g.tick / BAR) * BAR + BAR) break;
            g.notes.forEach(e => result.push({ ...e, tick, dur: Math.min(90, e.dur), vel: Math.max(1, e.vel - r * 11) }));
          }
        }
      });
    } else if (recipe === 'evolve') {
      const motifBars = [0, 1].map(bar => groups(part.events.filter(e => Math.floor(e.tick / BAR) === bar)));
      for (let bar = 0; bar < bars; bar++) {
        const motif = motifBars[bar % 2].length ? motifBars[bar % 2] : sourceGroups;
        motif.forEach((g, gi) => {
          const rel = ((g.tick % BAR) + BAR) % BAR;
          let tick = bar * BAR + rel, notes = g.notes;
          if (bar % 4 === 3 && gi >= Math.max(0, motif.length - 2)) tick = Math.min(bar * BAR + 1800, tick + choose(rand, [-120, 120, 240]));
          notes.forEach(e => result.push({ ...e, tick, dur: Math.min(e.dur, bar * BAR + BAR - tick), vel: Math.max(1, Math.min(127, e.vel + (bar % 4 === 3 ? 5 : 0))) }));
        });
      }
    } else if (recipe === 'rhythm') {
      // Internal rhythm remix: odd bars borrow the preceding bar's groove while
      // pitches rotate through the part's own material.
      const donorBar = Math.floor(rand() * Math.min(2, bars));
      const donor = groups(part.events.filter(e => Math.floor(e.tick / BAR) === donorBar));
      const pitches = sourceGroups.flatMap(g => [g.notes]);
      for (let bar = 0; bar < bars; bar++) (donor.length ? donor : sourceGroups).forEach((g, i) => {
        const tick = bar * BAR + g.tick % BAR, notes = pitches[(i + bar) % pitches.length];
        notes.forEach(e => result.push({ ...e, tick, dur: Math.min(e.dur, bar * BAR + BAR - tick) }));
      });
    } else throw new Error('Onbekend discovery-recept: ' + recipe);
    return { ...clone(part), events: bounded(result, total, !isPoly(part.id) && part.id !== 'drums'), part: { ...(clone(part.part) || {}), rhythmLabel: 'Discover · ' + recipe } };
  }

  function discoverClip(source, recipe, seed, locks) {
    if (!source || !Array.isArray(source.parts)) throw new Error('Ongeldige bronclip.');
    locks = locks || {};
    const bars = barsOf(source);
    const parts = source.parts.map(part => locks[part.id] ? clone(part) : restylePart(part, recipe, seed, bars));
    return finish(source, parts, recipe, seed);
  }

  function transplantRhythm(clip, donorId, targetId, locks) {
    if (!clip || !Array.isArray(clip.parts)) throw new Error('Ongeldige bronclip.');
    locks = locks || {};
    const donor = clip.parts.find(p => p.id === donorId), target = clip.parts.find(p => p.id === targetId);
    if (!donor || !target) throw new Error('Donor en doeltrack zijn verplicht.');
    if (donorId === targetId || locks[targetId] || !target.events.length || !donor.events.length) return clone(clip);
    const bars = barsOf(clip), total = bars * BAR, targetGroups = groups(target.events), donorGroups = groups(donor.events);
    const events = [];
    for (let bar = 0; bar < bars; bar++) {
      let rhythm = donorGroups.filter(g => Math.floor(g.tick / BAR) === bar);
      if (!rhythm.length) rhythm = donorGroups.filter(g => Math.floor(g.tick / BAR) === bar % Math.max(1, Math.ceil(donorGroups[donorGroups.length - 1].tick / BAR + 1)));
      let notes = targetGroups.filter(g => Math.floor(g.tick / BAR) === bar);
      if (!notes.length) notes = targetGroups;
      rhythm.forEach((g, i) => {
        const targetNotes = notes[i % notes.length].notes;
        const tick = bar * BAR + g.tick % BAR;
        const donorDur = Math.max(...g.notes.map(e => e.dur));
        targetNotes.forEach(e => events.push({ ...e, tick, dur: Math.max(1, Math.min(donorDur, bar * BAR + BAR - tick)) }));
      });
    }
    const parts = clip.parts.map(p => p.id === targetId ? { ...clone(p), events: bounded(events, total, !isPoly(p.id) && p.id !== 'drums'), part: { ...(clone(p.part) || {}), rhythmLabel: 'Ritme van ' + donorId } } : clone(p));
    return finish(clip, parts, 'transplant:' + donorId + '>' + targetId, 'rhythm');
  }

  const api = { discoverClip, transplantRhythm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(scope, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
