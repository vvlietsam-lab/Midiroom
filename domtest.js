const fs = require('fs');
const { JSDOM } = require('jsdom');

const ITER = +(process.argv[2] || 400);
const errors = [];
const blobs = [];
let oscCreated = 0, ctxClosed = 0, startCalls = 0;

const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://local.test/midiroom.html',
  runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(win) {
    win.HTMLMediaElement.prototype.load=()=>{};
    win.HTMLMediaElement.prototype.play = () => Promise.resolve();
    win.HTMLMediaElement.prototype.pause = () => {};
    win.HTMLCanvasElement.prototype.getContext = function () {
      const noop = () => {};
      return new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true });
    };
    win.devicePixelRatio = 1;
    class FakeParam {
      constructor(){ this.value = 0; }
      setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){}
      cancelScheduledValues(){}
    }
    function node(ctx) {
      return {
        _ctx: ctx, buffer: null, connect(){}, disconnect(){},
        start(){ if (ctx.state === 'closed') ctxClosed++; startCalls++; },
        stop(){},
        gain: new FakeParam(), frequency: new FakeParam(),
        detune: new FakeParam(), Q: new FakeParam(), type: '', curve: null,
      };
    }
    win.AudioContext = function () {
      this.state = 'running'; this.currentTime = 0;
      this.createGain = () => node(this);
      this.createOscillator = () => { oscCreated++; return node(this); };
      this.createBiquadFilter = () => node(this);
      this.createWaveShaper = () => node(this);
      this.createBuffer = (c, len) => ({ getChannelData: () => new Float32Array(len || 1) });
      this.createBufferSource = () => { oscCreated++; return node(this); };
      this.createDynamicsCompressor = () => {
        const n = node(this);
        n.threshold = new FakeParam(); n.knee = new FakeParam(); n.ratio = new FakeParam();
        n.attack = new FakeParam(); n.release = new FakeParam();
        return n;
      };
      this.destination = node(this);
      this.resume = () => { this.state = 'running'; return { catch(){} }; };
      this.close = () => { this.state = 'closed'; };
      win.__AC = this;
    };
    let rafQ = [];
    win.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
    win.cancelAnimationFrame = () => {};
    win.__pumpRaf = () => {
      const q = rafQ; rafQ = [];
      q.forEach(cb => { try { cb(0); } catch (e) { errors.push('raf: ' + e.message); } });
    };
    // advance audio clock and run the lookahead scheduler N times
    win.__advance = (seconds, steps) => {
      const dt = seconds / steps;
      for (let i = 0; i < steps; i++) {
        if (win.__AC) win.__AC.currentTime += dt;
        try { win.eval('schedTick()'); } catch (e) { errors.push('sched: ' + e.message); }
        win.__pumpRaf();
      }
    };
    win.URL.createObjectURL = b => { blobs.push(b); return 'blob:x'; };
    win.URL.revokeObjectURL = () => {};
    win.HTMLAnchorElement.prototype.click = function () {};
    win.addEventListener('error', e => errors.push(String(e.error && e.error.stack || e.message)));
    win.onerror = (m, s, l, c, err) => errors.push(String(err && err.stack || m));
  },
});


// jsdom's Blob API differs between versions; read bytes whichever way is available
async function blobBytes(win, b) {
  if (typeof b.arrayBuffer === 'function') return Buffer.from(await b.arrayBuffer());
  if (typeof b.text === 'function') return Buffer.from(await b.text(), 'binary');
  return await new Promise((res, rej) => {
    const r = new win.FileReader();
    r.onload = () => res(Buffer.from(r.result));
    r.onerror = rej;
    r.readAsArrayBuffer(b);
  });
}
async function blobText(win, b) {
  if (typeof b.text === 'function') return await b.text();
  return (await blobBytes(win, b)).toString('utf8');
}

const win = dom.window, doc = win.document;
const $ = id => doc.getElementById(id);
let seed = 987654321;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];

setTimeout(async () => {
  let fails = 0;
  const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

  ok(errors.length === 0, 'clean load' + (errors.length ? ': ' + errors[0] : ''));
  ok(/seed/.test($('meta').innerHTML), 'meta line on load');

  // --- the reported bug: does play actually schedule on a live context? ---
  oscCreated = 0; ctxClosed = 0; startCalls = 0;
  $('play').click();
  ok(oscCreated > 0, 'play creates oscillators (' + oscCreated + ')');
  ok(startCalls > 0, 'oscillators are started (' + startCalls + ')');
  ok(ctxClosed === 0, 'nothing scheduled on a closed context (' + ctxClosed + ' violations)');
  ok($('stop').disabled === false, 'stop enabled while playing');
  ok($('play').disabled === true, 'play disabled while playing');
  $('stop').click();
  ok($('play').disabled === false, 'play re-enabled after stop');

  // play -> stop -> play again
  oscCreated = 0; ctxClosed = 0;
  $('play').click(); $('stop').click(); $('play').click();
  ok(oscCreated > 0 && ctxClosed === 0, 'replay after stop still schedules (' + oscCreated + ' osc)');
  $('stop').click();

  // regenerate while playing must not leave a dead context
  $('play').click();
  const before = oscCreated;
  $('gen').click();
  ok(ctxClosed === 0, 'regenerating while playing does not use a closed context');
  ok(oscCreated > before, 'playback resumes after regenerate');
  $('stop').click();

  // --- loop: run 60 simulated seconds of playback ---
  $('loop').checked = true;
  $('bars').value = '32'; $('bars').dispatchEvent(new win.Event('change'));
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  oscCreated = 0; ctxClosed = 0;
  $('play').click();
  const atStart = oscCreated;
  ok(atStart < 4000, 'play does not front-load every oscillator (' + atStart + ' at t=0)');
  win.__advance(60, 600);
  const liveLen = win.eval('live.length');
  ok(errors.length === 0, '60s of looped playback runs clean' + (errors.length ? ': ' + errors[0] : ''));
  ok(oscCreated > atStart, 'scheduler keeps feeding voices (' + oscCreated + ' total)');
  ok(liveLen < 3000, 'node list stays bounded during looping (' + liveLen + ')');
  ok(ctxClosed === 0, 'no scheduling on a closed context while looping');
  ok(win.eval('playing') === true, 'still playing after 60s with loop on');
  $('stop').click();
  ok(win.eval('live.length') === 0, 'stop clears the node list');

  // non-loop playback ends by itself
  $('loop').checked = false;
  $('bars').value = '4'; $('bars').dispatchEvent(new win.Event('change'));
  $('play').click();
  win.__advance(30, 300);
  ok(win.eval('playing') === false, 'playback stops by itself when loop is off');
  $('bars').value = '8'; $('bars').dispatchEvent(new win.Event('change'));
  $('loop').checked = true;

  // --- random UI stress ---
  const scales = Array.from($('scale').options).map(o => o.value);
  const progs = Array.from($('prog').options).map(o => o.value);
  const roots = Array.from($('root').options).map(o => o.value);
  const barsO = Array.from($('bars').options).map(o => o.value);
  const chO = Array.from($('chordSize').options).map(o => o.value);
  const partIds = Array.from(doc.querySelectorAll('[data-part]')).map(c => c.dataset.part);

  let generated = 0, emptyRuns = 0;
  for (let i = 0; i < ITER; i++) {
    const act = Math.floor(rnd() * 8);
    if (act === 0) { $('scale').value = pick(scales); $('scale').dispatchEvent(new win.Event('change')); }
    else if (act === 1) { $('prog').value = pick(progs); $('prog').dispatchEvent(new win.Event('change')); }
    else if (act === 2) { $('root').value = pick(roots); $('root').dispatchEvent(new win.Event('change')); }
    else if (act === 3) { $('bars').value = pick(barsO); $('bars').dispatchEvent(new win.Event('change')); }
    else if (act === 4) { $('chordSize').value = pick(chO); $('chordSize').dispatchEvent(new win.Event('change')); }
    else if (act === 5) {
      const id = pick(partIds);
      const cb = doc.querySelector('[data-part="' + id + '"]');
      cb.checked = !cb.checked;
      cb.dispatchEvent(new win.Event('change', { bubbles: true }));
    }
    else if (act === 6) {
      const id = pick(partIds);
      const sel = doc.querySelector('[data-style="' + id + '"]');
      sel.value = pick(Array.from(sel.options).map(o => o.value));
      sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    }
    else {
      const btn = doc.querySelector('[data-oct="' + pick(partIds) + '"]');
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    }
    if (/mislukt/.test($('readout').innerHTML)) { ok(false, 'generation error at iteration ' + i + ': ' + $('readout').textContent); break; }
    if (/minstens één/.test($('readout').innerHTML)) emptyRuns++; else generated++;
    if (rnd() < 0.06) { $('play').click(); win.__pumpRaf(); $('stop').click(); }
    if (rnd() < 0.04 && $('exports').children.length) $('exports').children[0].click();
  }
  ok(true, ITER + ' random UI actions, ' + generated + ' generations, ' + emptyRuns + ' empty-selection states');
  ok(errors.length === 0, 'no runtime errors during stress' + (errors.length ? ': ' + errors[0] : ''));
  ok(ctxClosed === 0, 'no closed-context scheduling during stress');

  // exports valid
  let checked = 0;
  for (const b of blobs.filter(x => x.type === 'audio/midi').slice(-25)) {
    const buf = await blobBytes(win, b);
    if (buf.slice(0, 4).toString() !== 'MThd') { ok(false, 'bad export header'); break; }
    checked++;
  }
  ok(checked > 0, checked + ' exported files start with MThd');

  // every part on, every style, one at a time
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  let styleRuns = 0;
  for (const id of partIds) {
    const sel = doc.querySelector('[data-style="' + id + '"]');
    for (const o of Array.from(sel.options)) {
      sel.value = o.value; sel.dispatchEvent(new win.Event('change', { bubbles: true })); styleRuns++;
      if (/mislukt/.test($('readout').innerHTML)) { ok(false, 'style ' + id + '/' + o.value + ' broke generation'); break; }
    }
    sel.value = ''; sel.dispatchEvent(new win.Event('change', { bubbles: true }));
  }
  ok(!/mislukt/.test($('readout').innerHTML), styleRuns + ' style combinations all generate');
  ok($('exports').children.length === 13, 'all 12 parts + combined export (' + $('exports').children.length + ')');

  // articulation actually changes note lengths
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = c.dataset.part === 'screech'; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  const lens = {};
  for (const a of ['auto', 'groove', 'legato', 'staccato']) {
    const sel = doc.querySelector('[data-art="screech"]');
    sel.value = a; sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    lens[a] = win.eval('current.parts[0].events.map(e=>e.dur).join(",")');
  }
  ok(new Set(Object.values(lens)).size === 4, 'four articulations give four different length sets');
  ok(win.eval('Math.max(...current.parts[0].events.map(e=>e.dur))') <= win.eval('TICK16*1.2'), 'staccato really is short');
  doc.querySelector('[data-art="screech"]').value = 'auto';
  doc.querySelector('[data-art="screech"]').dispatchEvent(new win.Event('change', { bubbles: true }));

  // a screech should sit on few pitches with many different lengths
  doc.querySelector('[data-style="screech"]').value = 'klassiek';
  doc.querySelector('[data-style="screech"]').dispatchEvent(new win.Event('change', { bubbles: true }));
  const dSel = doc.querySelector('[data-optsel="screech"][data-key="density"]');
  if (dSel) { dSel.value = 'normaal'; dSel.dispatchEvent(new win.Event('change', { bubbles: true })); }
  const sPitch = win.eval('new Set(current.parts[0].events.map(e=>e.midi)).size');
  const sLen = win.eval('new Set(current.parts[0].events.map(e=>e.dur)).size');
  ok(sPitch <= 8, 'screech stays on a handful of pitches (' + sPitch + ')');
  ok(sLen >= 3, 'screech uses several distinct note lengths (' + sLen + ')');

  // arp phase must not restart every bar
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = c.dataset.part === 'arp'; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  const bar1 = win.eval('JSON.stringify(current.parts[0].events.filter(e=>e.tick<1920).map(e=>e.midi))');
  // the reference arps use exactly one note length; the cycle styles keep an accent
  doc.querySelector('[data-style="arp"]').value = 'walk';
  doc.querySelector('[data-style="arp"]').dispatchEvent(new win.Event('change', { bubbles: true }));
  const walkLens = win.eval('new Set(current.parts[0].events.map(e=>e.dur)).size');
  ok(walkLens === 1, 'the through-composed arp uses one note length, as the corpus does (' + walkLens + ')');
  doc.querySelector('[data-style="arp"]').value = 'updown';
  doc.querySelector('[data-style="arp"]').dispatchEvent(new win.Event('change', { bubbles: true }));
  const cycLens = win.eval('new Set(current.parts[0].events.map(e=>e.dur)).size');
  ok(cycLens >= 2, 'the cycle arp keeps an accent length (' + cycLens + ')');
  doc.querySelector('[data-style="arp"]').value = '';
  doc.querySelector('[data-style="arp"]').dispatchEvent(new win.Event('change', { bubbles: true }));
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // mute / solo
  const muteBtn = doc.querySelector('[data-mute="lead"]');
  muteBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  ok(win.eval('muted.lead') === true, 'mute toggles');
  ok(win.eval('audible("lead")') === false, 'muted part is inaudible');
  ok(doc.querySelector('[data-part="lead"]').checked === true, 'mute does not disable the part itself');
  const soloBtn = doc.querySelector('[data-solo="bass"]');
  soloBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  ok(win.eval('audible("bass")') === true && win.eval('audible("chords")') === false, 'solo silences everything else');
  soloBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  muteBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  ok(win.eval('audible("chords")') === true, 'clearing solo and mute restores everything');

  // per-part re-roll changes only that part
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = ['bass','lead'].includes(c.dataset.part); c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  const bassBefore = win.eval('JSON.stringify(current.parts.find(p=>p.id==="bass").events)');
  const leadBefore = win.eval('JSON.stringify(current.parts.find(p=>p.id==="lead").events)');
  doc.querySelector('[data-vary="lead"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const bassAfter = win.eval('JSON.stringify(current.parts.find(p=>p.id==="bass").events)');
  const leadAfter = win.eval('JSON.stringify(current.parts.find(p=>p.id==="lead").events)');
  ok(bassBefore === bassAfter, 're-rolling the lead leaves the bass untouched');
  ok(leadBefore !== leadAfter, 're-rolling the lead actually changes it');
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // swing shifts offbeat sixteenths without breaking anything
  $('swing').value = '0'; $('swing').dispatchEvent(new win.Event('change'));
  const flat0 = win.eval('current.parts.map(p=>p.events.map(e=>e.tick)).flat().join(",")');
  $('swing').value = '40'; $('swing').dispatchEvent(new win.Event('change'));
  const flat1 = win.eval('current.parts.map(p=>p.events.map(e=>e.tick)).flat().join(",")');
  ok(flat0 !== flat1, 'swing changes the timing');
  ok(!/mislukt/.test($('readout').innerHTML), 'swing does not break generation');
  $('swing').value = '0'; $('swing').dispatchEvent(new win.Event('change'));

  // URL state round-trip
  $('root').value = '3'; $('root').dispatchEvent(new win.Event('change'));
  $('bpm').value = '178'; $('bpm').dispatchEvent(new win.Event('change'));
  const hash = win.location.hash;
  ok(hash.length > 10, 'settings written to the URL');
  $('root').value = '0'; $('bpm').value = '120';
  win.eval('restoreFromHash()');
  ok($('root').value === '3' && $('bpm').value === '178', 'settings restored from the URL');
  $('copyLink').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  ok(errors.length === 0, 'copy-link button does not throw');

  // drums use drum-rack pitches, not the scale
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = c.dataset.part === 'drums'; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  const dp = win.eval('JSON.stringify([...new Set(current.parts[0].events.map(e=>e.midi))].sort((a,b)=>a-b))');
  ok(/36/.test(dp) && JSON.parse(dp).every(v => v >= 35 && v <= 52), 'drums land on drum-rack pitches ' + dp);
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // empty selection then recover
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = false; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  ok(/minstens één/.test($('readout').innerHTML), 'empty selection message');
  $('play').click();
  ok(errors.length === 0, 'play with nothing selected does not crash');
  doc.querySelector('[data-part="lead"]').checked = true;
  doc.querySelector('[data-part="lead"]').dispatchEvent(new win.Event('change', { bubbles: true }));
  ok(!/minstens één/.test($('readout').innerHTML), 'recovers after re-enabling a part');

  // harmonic rhythm holds a chord across bars
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = c.dataset.part === 'chords'; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  // fully pinned down: the random stress above leaves arbitrary key/scale/chord settings,
  // and in a pentatonic scale or with ninth chords two chords can share every pitch class
  $('root').value = '0'; $('root').dispatchEvent(new win.Event('change'));
  $('scale').value = 'aeolian'; $('scale').dispatchEvent(new win.Event('change'));
  $('prog').value = 'euphoric'; $('prog').dispatchEvent(new win.Event('change'));
  $('chordSize').value = '3'; $('chordSize').dispatchEvent(new win.Event('change'));   // ninth chords share pitch classes
  const flSel = doc.querySelector('[data-opt="chords"][data-key="followLead"]');
  if (flSel) { flSel.checked = false; flSel.dispatchEvent(new win.Event('change', { bubbles: true })); }
  const csSel = doc.querySelector('[data-style="chords"]');
  if (csSel) { csSel.value = 'whole'; csSel.dispatchEvent(new win.Event('change', { bubbles: true })); }
  const pcOf = i => win.eval('JSON.stringify([...new Set(current.parts[0].events.filter(e=>Math.floor(e.tick/1920)===' + i + ').map(e=>((e.midi%12)+12)%12))].sort())');
  $('chordBars').value = '1'; $('chordBars').dispatchEvent(new win.Event('change'));
  const oneBar = pcOf(0) !== pcOf(1);
  $('chordBars').value = '2'; $('chordBars').dispatchEvent(new win.Event('change'));
  ok(pcOf(0) === pcOf(1), 'a two-bar harmonic rhythm holds the chord across the bar line');
  ok(oneBar, 'a one-bar harmonic rhythm changes chord every bar (m1 ' + pcOf(0) + ' vs m2 ' + pcOf(1) + ' | prog=' + $('prog').value + ' chordBars=' + $('chordBars').value + ' root=' + $('root').value + ' scale=' + $('scale').value + ' style=' + win.eval('current.parts[0].part.rhythmLabel') + ')');
  $('chordBars').value = '1'; $('chordBars').dispatchEvent(new win.Event('change'));
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // every genre at every energy level must produce something playable
  const genres = Array.from(doc.querySelectorAll('[data-genre]')).map(b => b.dataset.genre);
  let genreRuns = 0, emptyGenre = 0;
  for (const gid of genres) {
    for (const lvl of ['0', '1', '2']) {
      $('energy').value = lvl; $('energy').dispatchEvent(new win.Event('input'));
      doc.querySelector('[data-genre="' + gid + '"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      genreRuns++;
      if (/mislukt/.test($('readout').innerHTML)) { ok(false, 'genre ' + gid + ' energie ' + lvl + ' brak: ' + $('readout').textContent); break; }
      const n = win.eval('current ? current.parts.reduce((a,p)=>a+p.events.length,0) : 0');
      if (n === 0) emptyGenre++;
      $('play').click(); win.__advance(4, 40); $('stop').click();
    }
  }
  ok(!/mislukt/.test($('readout').innerHTML), genreRuns + ' genre-en-energie combinaties genereren');
  ok(emptyGenre === 0, 'geen enkele combinatie levert nul noten (' + emptyGenre + ')');
  ok(errors.length === 0, 'genres afspelen zonder fouten' + (errors.length ? ': ' + errors[0] : ''));

  // house must actually cross the bar line and stack notes
  $('energy').value = '1'; $('energy').dispatchEvent(new win.Event('input'));
  doc.querySelector('[data-genre="house"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const leadPhase = win.eval(`(()=>{const L=current.parts.find(p=>p.id==='lead'); if(!L) return 'geen lead';
    const offs=[0,1,2,3].map(b=>Math.min(...L.events.filter(e=>Math.floor(e.tick/1920)===b).map(e=>e.tick%1920)));
    return new Set(offs).size;})()`);
  ok(leadPhase > 1, 'de house-lead begint niet elke maat op dezelfde plek (' + leadPhase + ' verschillende offsets)');
  const stacked = win.eval(`(()=>{const L=current.parts.find(p=>p.id==='lead');
    const m={}; L.events.forEach(e=>m[e.tick]=(m[e.tick]||0)+1);
    return Object.values(m).filter(v=>v>1).length;})()`);
  ok(stacked > 0, 'de house-lead speelt dubbele noten (' + stacked + ' gestapelde aanslagen)');
  const sw = win.eval("+$('swing').value");
  ok(sw > 0, 'house zet swing aan (' + sw + '%)');

  // gabber must be short and stabby
  doc.querySelector('[data-genre="gabber"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const maxLen = win.eval(`(()=>{const S=current.parts.find(p=>p.id==='screech'); return Math.max(...S.events.map(e=>e.dur))/(TPQ/4);})()`);
  ok(maxLen <= 1.1, 'gabber-screech is staccato, langste noot ' + maxLen.toFixed(2) + ' zestiende');

  doc.querySelector('[data-genre="free"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // song structure
  doc.querySelector('[data-genre="rawstyle"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  for (const sid of Array.from($('structure').options).map(o => o.value)) {
    $('structure').value = sid; $('structure').dispatchEvent(new win.Event('change'));
    if (/mislukt/.test($('readout').innerHTML)) { ok(false, 'structuur ' + sid + ' brak'); break; }
    const bars = win.eval('current.meta.bars');
    const notes = win.eval('current.parts.reduce((a,p)=>a+p.events.length,0)');
    ok(notes > 0, 'structuur "' + (sid || 'uit') + '": ' + bars + ' maten, ' + notes + ' noten');
    $('play').click(); win.__advance(6, 60); $('stop').click();
    if ($('exports').children.length) $('exports').children[0].click();
  }
  $('structure').value = 'full'; $('structure').dispatchEvent(new win.Event('change'));
  ok(win.eval('current.meta.bars') === 64, 'de volledige structuur is 64 maten');
  ok(win.eval('current.meta.marks.length') === 6, 'zes secties met markeringen');
  ok($('bars').disabled === true, 'het matenveld staat uit zolang een structuur actief is');
  // every section must contain notes
  const emptySections = win.eval(`current.meta.marks.filter(m =>
      !current.parts.some(p => p.events.some(e => e.tick >= m.bar*1920 && e.tick < (m.bar+m.bars)*1920))).length`);
  ok(emptySections === 0, 'geen lege secties (' + emptySections + ')');
  // sections must differ from one another
  const dropA = win.eval(`JSON.stringify(current.parts.map(p=>p.events.filter(e=>e.tick>=16*1920&&e.tick<32*1920).map(e=>e.midi)))`);
  const dropB = win.eval(`JSON.stringify(current.parts.map(p=>p.events.filter(e=>e.tick>=48*1920&&e.tick<64*1920).map(e=>e.midi)))`);
  ok(dropA !== dropB, 'drop 2 is een variatie, geen kopie van drop 1');
  $('structure').value = ''; $('structure').dispatchEvent(new win.Event('change'));
  doc.querySelector('[data-genre="free"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // kick and drums must not double, bass must dodge the kick
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = ['kick','drums','bass'].includes(c.dataset.part); c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  const dbl = win.eval(`(()=>{const k=new Set(current.parts.find(p=>p.id==='kick').events.map(e=>e.tick));
     return current.parts.find(p=>p.id==='drums').events.filter(e=>e.midi===36&&k.has(e.tick)).length;})()`);
  ok(dbl === 0, 'drums verdubbelt de kick niet (' + dbl + ')');
  const clash = win.eval(`(()=>{const k=new Set(current.parts.find(p=>p.id==='kick').events.map(e=>e.tick));
     return current.parts.find(p=>p.id==='bass').events.filter(e=>k.has(e.tick)).length;})()`);
  ok(clash === 0, 'de bas valt niet bovenop de kick (' + clash + ')');
  doc.querySelectorAll('[data-part]').forEach(c => { c.checked = true; c.dispatchEvent(new win.Event('change', { bubbles: true })); });

  // every export must also produce a notes.md
  doc.querySelector('[data-genre="rawphoric"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  $('structure').value = 'short'; $('structure').dispatchEvent(new win.Event('change'));
  blobs.length = 0;
  $('exports').children[0].click();
  ok(blobs.length === 2, 'de export levert twee bestanden op (' + blobs.length + ')');
  const md = await blobText(win, blobs[1]);
  ok(/^# MIDIROOM/.test(md), 'notes.md begint met een kop');
  ['Toonsoort', 'Camelot', 'Seed', 'Secties', 'Sporen in het MIDI-bestand', 'Delaytijden', 'Kick stemmen', 'Harmonisch mixen', 'reproduceren']
    .forEach(k => ok(md.includes(k), 'notes.md bevat de sectie "' + k + '"'));
  ok(/\| Drop \| 16 maten \|/.test(md), 'notes.md noemt de secties van de structuur');
  ok(md.includes(win.eval("$('seed').value")), 'notes.md noemt de seed');
  blobs.length = 0;
  $('exports').children[1].click();
  ok(blobs.length === 2, 'ook een losse partij-export krijgt een notes.md');
  $('structure').value = ''; $('structure').dispatchEvent(new win.Event('change'));

  // studio panel
  ok($('studio').innerHTML.includes('Hz'), 'studiopaneel toont kickfrequenties');
  ok($('studio').innerHTML.includes('Delaytijden'), 'studiopaneel toont delaytijden');
  ok(/\dA|\dB/.test($('studio').innerHTML), 'studiopaneel toont een Camelot-code');
  $('root').value = '2'; $('root').dispatchEvent(new win.Event('change'));
  ok($('studio').innerHTML.includes('D '), 'studiopaneel volgt de toonsoort');

  // session log
  $('clearLog').click();
  const logBefore = win.eval('sessionLog.length');
  $('reroll').click(); $('reroll').click();
  ok(win.eval('sessionLog.length') > logBefore, 'sessielog groeit mee (' + win.eval('sessionLog.length') + ')');
  ok($('logRows').querySelectorAll('[data-restore]').length > 0, 'log heeft herstelknoppen');
  const restoreSeed = win.eval('sessionLog[1].seed');
  doc.querySelectorAll('[data-restore]')[1].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  ok(win.eval("$('seed').value") === restoreSeed, 'herstellen zet de seed terug (' + restoreSeed + ')');
  const logMd = win.eval('logAsMarkdown()');
  ok(/^# MIDIROOM sessielog/.test(logMd) && logMd.split('\n').length > 4, 'log exporteert als markdown-tabel');
  $('clearLog').click();
  ok(win.eval('sessionLog.length') === 0, 'log leegmaken werkt');

  // bpm edge values
  for (const v of ['', '0', '-5', '999', '40', '300', 'abc']) {
    $('bpm').value = v; $('bpm').dispatchEvent(new win.Event('change'));
    if (/mislukt/.test($('readout').innerHTML)) { ok(false, 'bpm "' + v + '" broke generation'); break; }
  }
  ok(!/mislukt/.test($('readout').innerHTML), 'bpm edge values handled');
  $('bpm').value = '160'; $('bpm').dispatchEvent(new win.Event('change'));

  console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS') + '   (errors captured: ' + errors.length + ')');
  if (errors.length) console.log(errors.slice(0, 3).join('\n---\n'));
  process.exit(fails ? 1 : 0);
}, 300);
