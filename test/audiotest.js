const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const problems = [];
const voiceLog = [];

const dom = new JSDOM(html, {
  url: 'https://local.test/k.html', runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(win) {
    win.HTMLMediaElement.prototype.load=()=>{};
    win.HTMLMediaElement.prototype.play=()=>Promise.resolve();
    win.HTMLMediaElement.prototype.pause=()=>{};
    win.HTMLCanvasElement.prototype.getContext = function () {
      const noop = () => {};
      return new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true });
    };
    win.devicePixelRatio = 1;

    // AudioParam that records automation and can be evaluated at any time
    class Param {
      constructor(name, owner) { this.name = name; this.owner = owner; this.events = []; this._v = 0; }
      get value() { return this._v; }
      set value(v) { this._v = v; this.events.push({ type: 'set', t: -1, v }); }
      setValueAtTime(v, t) { this.events.push({ type: 'set', t, v }); }
      linearRampToValueAtTime(v, t) { this.events.push({ type: 'lin', t, v }); }
      exponentialRampToValueAtTime(v, t) {
        const prev = this.events.length ? this.events[this.events.length - 1].v : this._v;
        if (prev === 0 && this.name === 'gain') {
          problems.push('exponential ramp from zero on ' + this.owner + ' (silent in real Web Audio)');
        }
        this.events.push({ type: 'exp', t, v });
      }
      cancelScheduledValues() { this.events.length = 0; }
      peak() { return this.events.reduce((m, e) => Math.max(m, e.v), this._v); }
    }
    let currentVoice = 'unknown';
    win.__setVoice = n => { currentVoice = n; };
    function node(ctx, kind) {
      const n = {
        _kind: kind, _voice: currentVoice, _started: null, _stopped: null,
        connect() {}, disconnect() {},
        start(t) { n._started = t; }, stop(t) { n._stopped = t; },
        type: '', curve: null,
      };
      n.gain = new Param('gain', currentVoice + '/' + kind);
      n.frequency = new Param('frequency', currentVoice + '/' + kind);
      n.detune = new Param('detune', currentVoice); n.Q = new Param('Q', currentVoice);
      if (kind === 'gain' || kind === 'osc') voiceLog.push(n);
      return n;
    }
    win.AudioContext = function () {
      this.state = 'running'; this.currentTime = 0; this.sampleRate = 48000;
      this.createGain = () => node(this, 'gain');
      this.createOscillator = () => node(this, 'osc');
      this.createBiquadFilter = () => node(this, 'filter');
      this.createWaveShaper = () => node(this, 'shaper');
      this.createBuffer = (ch, len, sr) => ({ getChannelData: () => new Float32Array(len || 1), __sr: sr });
      this.createBufferSource = () => { const n = node(this, 'osc'); n.buffer = null; return n; };
      this.createDynamicsCompressor = () => {
        const n = node(this, 'comp');
        n.threshold = new Param('threshold', 'comp'); n.knee = new Param('knee', 'comp');
        n.ratio = new Param('ratio', 'comp'); n.attack = new Param('attack', 'comp');
        n.release = new Param('release', 'comp');
        return n;
      };
      this.destination = node(this, 'dest');
      this.resume = () => { this.state = 'running'; return Promise.resolve(); };
      this.close = () => { this.state = 'closed'; };
      win.__AC = this;
    };
    win.requestAnimationFrame = () => 0; win.cancelAnimationFrame = () => {};
    win.URL.createObjectURL = () => 'blob:x'; win.URL.revokeObjectURL = () => {};
    win.HTMLAnchorElement.prototype.click = function () {};
    win.onerror = (m, s, l, c, e) => problems.push('error: ' + (e && e.stack || m));
  },
});

const win = dom.window, doc = win.document;
const $ = id => doc.getElementById(id);

setTimeout(() => {
  let fails = 0;
  const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

  // exercise every voice type by soloing each part in turn
  const parts = win.eval('PART_ORDER');
  const results = {};
  for (const id of parts) {
    doc.querySelectorAll('[data-part]').forEach(c => {
      c.checked = c.dataset.part === id;
      c.dispatchEvent(new win.Event('change', { bubbles: true }));
    });
    voiceLog.length = 0;
    win.__setVoice(id);
    $('play').click();
    // advance the clock so the scheduler feeds several windows
    for (let i = 0; i < 40; i++) { win.__AC.currentTime += 0.05; win.eval('schedTick()'); }
    const gains = voiceLog.filter(n => n._kind === 'gain' && n._voice === id);
    const oscs = voiceLog.filter(n => n._kind === 'osc' && n._voice === id);
    const audible = gains.filter(g => g.gain.peak() > 0.0005).length;
    const badTiming = oscs.filter(o => o._started == null || o._stopped == null || o._stopped <= o._started).length;
    results[id] = { gains: gains.length, audible, oscs: oscs.length, badTiming };
    $('stop').click();
  }

  for (const id of parts) {
    const r = results[id];
    ok(r.oscs > 0, id + ': oscillators created (' + r.oscs + ')');
    ok(r.audible > 0, id + ': gain envelope rises above zero (' + r.audible + '/' + r.gains + ' voices)');
    ok(r.badTiming === 0, id + ': every oscillator has start < stop (' + r.badTiming + ' bad)');
  }

  ok(problems.length === 0, 'no invalid automation' + (problems.length ? ': ' + problems[0] : ''));

  // the iOS unlock path
  doc.querySelectorAll('[data-part]').forEach((c, i) => { c.checked = i < 3; c.dispatchEvent(new win.Event('change', { bubbles: true })); });
  win.eval('unlockAudio()');
  ok(win.eval('unlockTried') === true, 'unlock runs');
  ok(win.eval('silentEl !== null'), 'silent media element created for the iOS ringer switch');
  ok($('audioStatus').textContent === (win.eval('playing') ? 'Preview speelt · Spatie om te stoppen' : ''), 'running context has no suspension warning');

  // suspended context must surface a hint instead of failing silently
  win.__AC.state = 'suspended';
  win.eval('updateAudioStatus()');
  ok(/gepauzeerd.*Play/.test($('audioStatus').textContent), 'suspended context shows a hint');
  win.__AC.state = 'running';

  // volume control reaches the master gain
  $('play').click();
  const before = win.eval('master.gain.value');
  $('vol').value = '20'; $('vol').dispatchEvent(new win.Event('input'));
  const after = win.eval('master.gain.value');
  ok(after < before, 'volume slider lowers the master gain (' + before.toFixed(3) + ' -> ' + after.toFixed(3) + ')');
  $('stop').click();

  console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS'));
  process.exit(fails ? 1 : 0);
}, 300);
