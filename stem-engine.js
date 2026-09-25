/* Offline stem separation. Pure DSP, no model, no network.
   Harmonic/percussive separation by median filtering the spectrogram (Fitzgerald 2010),
   combined with per-bin centre detection from the stereo image.
   Masks are normalised so the stems sum back to the input — see test/stem-engine.js. */
(function (root) {
'use strict';

/* ---------- radix-2 FFT, in place ---------- */
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2], bi = im[i + k + len / 2];
        const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
        re[i + k] = ar + tr; im[i + k] = ai + ti;
        re[i + k + len / 2] = ar - tr; im[i + k + len / 2] = ai - ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

function hann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n);
  return w;
}

/* ---------- STFT / ISTFT with Hann analysis and synthesis ---------- */
function stft(sig, frame, hop, win) {
  const frames = Math.max(1, Math.ceil(sig.length / hop));
  const bins = frame / 2 + 1;
  const re = new Float32Array(frames * bins), im = new Float32Array(frames * bins);
  const br = new Float64Array(frame), bi = new Float64Array(frame);
  for (let f = 0; f < frames; f++) {
    const start = f * hop - (frame >> 1);
    for (let i = 0; i < frame; i++) {
      const s = start + i;
      br[i] = (s >= 0 && s < sig.length) ? sig[s] * win[i] : 0;
      bi[i] = 0;
    }
    fft(br, bi, false);
    for (let k = 0; k < bins; k++) { re[f * bins + k] = br[k]; im[f * bins + k] = bi[k]; }
  }
  return { re, im, frames, bins };
}

function istft(re, im, frames, bins, frame, hop, win, length) {
  const out = new Float64Array(length + frame);
  const norm = new Float64Array(length + frame);
  const br = new Float64Array(frame), bi = new Float64Array(frame);
  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < bins; k++) {
      br[k] = re[f * bins + k]; bi[k] = im[f * bins + k];
      if (k > 0 && k < frame / 2) { br[frame - k] = re[f * bins + k]; bi[frame - k] = -im[f * bins + k]; }
    }
    br[frame / 2] = re[f * bins + bins - 1]; bi[frame / 2] = 0;
    fft(br, bi, true);
    const start = f * hop - (frame >> 1);
    for (let i = 0; i < frame; i++) {
      const s = start + i;
      if (s < 0 || s >= length) continue;
      out[s] += br[i] * win[i];
      norm[s] += win[i] * win[i];
    }
  }
  const sig = new Float32Array(length);
  for (let i = 0; i < length; i++) sig[i] = norm[i] > 1e-8 ? out[i] / norm[i] : 0;
  return sig;
}

/* ---------- median of a small window ---------- */
function medianOf(buf, count) {
  const a = buf.subarray(0, count);
  // insertion sort: count is small (typically 17 or 31)
  for (let i = 1; i < count; i++) {
    const v = a[i]; let j = i - 1;
    while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; }
    a[j + 1] = v;
  }
  return count & 1 ? a[count >> 1] : (a[(count >> 1) - 1] + a[count >> 1]) / 2;
}

/* Harmonic content is steady over time, percussive content is steady over frequency:
   median-filter one way for each and compare. */
function hpssMasks(mag, frames, bins, kTime, kFreq, power) {
  const harm = new Float32Array(frames * bins);
  const perc = new Float32Array(frames * bins);
  const buf = new Float32Array(Math.max(kTime, kFreq));
  const hT = kTime >> 1, hF = kFreq >> 1;
  for (let k = 0; k < bins; k++) {
    for (let f = 0; f < frames; f++) {
      let c = 0;
      for (let d = -hT; d <= hT; d++) {
        const ff = f + d;
        if (ff >= 0 && ff < frames) buf[c++] = mag[ff * bins + k];
      }
      harm[f * bins + k] = medianOf(buf, c);
    }
  }
  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < bins; k++) {
      let c = 0;
      for (let d = -hF; d <= hF; d++) {
        const kk = k + d;
        if (kk >= 0 && kk < bins) buf[c++] = mag[f * bins + kk];
      }
      perc[f * bins + k] = medianOf(buf, c);
    }
  }
  // soft Wiener-style masks
  for (let i = 0; i < harm.length; i++) {
    const h = Math.pow(harm[i], power), p = Math.pow(perc[i], power);
    const s = h + p;
    harm[i] = s > 1e-12 ? h / s : 0.5;
    perc[i] = s > 1e-12 ? p / s : 0.5;
  }
  return { harm, perc };
}

/* ---------- smooth band edges so a stem never has a hard spectral cut ---------- */
function ramp(x, lo, hi) {
  if (x <= lo) return 0;
  if (x >= hi) return 1;
  const t = (x - lo) / (hi - lo);
  return t * t * (3 - 2 * t);
}

const DEFAULTS = {
  frame: 2048, hop: 512, kTime: 17, kFreq: 17, power: 2,
  bassTop: 260,        // Hz: everything harmonic below this becomes the bass stem
  voiceLow: 180, voiceHigh: 7000,
  maxSeconds: 45,
};

/* Separate into drums / bass / vocals / other.
   left and right are Float32Array; mono input may pass the same array twice. */
function splitStems(left, right, sampleRate, options, onProgress) {
  const o = Object.assign({}, DEFAULTS, options || {});
  if (!left || !left.length) throw new Error('Geen audio om te splitsen.');
  const limit = Math.min(left.length, Math.floor(o.maxSeconds * sampleRate));
  const L = left.subarray(0, limit);
  const R = (right && right.length ? right : left).subarray(0, limit);
  const win = hann(o.frame);
  const report = p => { if (onProgress) onProgress(Math.max(0, Math.min(1, p))); };

  report(0.05);
  const sl = stft(L, o.frame, o.hop, win);
  report(0.2);
  const sr = stft(R, o.frame, o.hop, win);
  report(0.35);

  const { frames, bins } = sl;
  const n = frames * bins;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const mr = (sl.re[i] + sr.re[i]) / 2, mi = (sl.im[i] + sr.im[i]) / 2;
    mono[i] = Math.hypot(mr, mi);
  }
  report(0.45);
  const { harm, perc } = hpssMasks(mono, frames, bins, o.kTime, o.kFreq, o.power);
  report(0.7);

  // per-bin band weights, precomputed once
  const binHz = sampleRate / o.frame;
  const lowW = new Float32Array(bins), voxW = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const hz = k * binHz;
    lowW[k] = 1 - ramp(hz, o.bassTop * 0.55, o.bassTop);
    voxW[k] = ramp(hz, o.voiceLow * 0.6, o.voiceLow) * (1 - ramp(hz, o.voiceHigh, o.voiceHigh * 1.5));
  }

  const names = ['drums', 'bass', 'vocals', 'other'];
  const acc = {};
  names.forEach(k => { acc[k] = { lre: new Float32Array(n), lim: new Float32Array(n), rre: new Float32Array(n), rim: new Float32Array(n) }; });

  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < bins; k++) {
      const i = f * bins + k;
      const lr = sl.re[i], li = sl.im[i], rr = sr.re[i], ri = sr.im[i];
      // centre detection: identical in both channels means centre-panned
      const diff = Math.hypot(lr - rr, li - ri);
      const sum = Math.hypot(lr, li) + Math.hypot(rr, ri);
      const centre = sum > 1e-9 ? Math.max(0, 1 - diff / sum) : 1;

      const pm = perc[i], hm = harm[i];
      let mDrums = pm;
      let mBass = hm * lowW[k];
      let mVox = hm * (1 - lowW[k]) * voxW[k] * centre;
      let mOther = hm - mBass - mVox;
      if (mOther < 0) mOther = 0;
      // normalise so nothing is created or lost
      const tot = mDrums + mBass + mVox + mOther;
      if (tot > 1e-9) {
        const g = 1 / tot;
        mDrums *= g; mBass *= g; mVox *= g; mOther *= g;
      } else { mDrums = mBass = mVox = mOther = 0.25; }

      const ms = [mDrums, mBass, mVox, mOther];
      for (let s = 0; s < 4; s++) {
        const a = acc[names[s]], m = ms[s];
        a.lre[i] = lr * m; a.lim[i] = li * m;
        a.rre[i] = rr * m; a.rim[i] = ri * m;
      }
    }
  }
  report(0.8);

  const out = {};
  names.forEach((name, idx) => {
    const a = acc[name];
    out[name] = {
      l: istft(a.lre, a.lim, frames, bins, o.frame, o.hop, win, limit),
      r: istft(a.rre, a.rim, frames, bins, o.frame, o.hop, win, limit),
    };
    report(0.8 + 0.05 * (idx + 1));
  });
  out.sampleRate = sampleRate;
  out.length = limit;
  report(1);
  return out;
}

/* ---------- 16-bit WAV writer so a stem can be downloaded ---------- */
function encodeWav(l, r, sampleRate) {
  const channels = r ? 2 : 1, n = l.length;
  const bytes = 44 + n * channels * 2;
  const buf = new ArrayBuffer(bytes), view = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, bytes - 8, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, n * channels * 2, true);
  let p = 44;
  const clip = v => Math.max(-1, Math.min(1, v));
  for (let i = 0; i < n; i++) {
    view.setInt16(p, clip(l[i]) * 32767, true); p += 2;
    if (r) { view.setInt16(p, clip(r[i]) * 32767, true); p += 2; }
  }
  return new Uint8Array(buf);
}

/* peak and RMS, for showing how much ended up in each stem */
function levelOf(sig) {
  let peak = 0, sum = 0;
  for (let i = 0; i < sig.length; i++) { const v = Math.abs(sig[i]); if (v > peak) peak = v; sum += sig[i] * sig[i]; }
  return { peak, rms: Math.sqrt(sum / Math.max(1, sig.length)) };
}

/* Self-contained worker source, built from the very functions tested above:
   there is no second implementation that could drift from this one. */
function workerScript() {
  return [fft, hann, stft, istft, medianOf, hpssMasks, ramp]
      .map(f => f.toString()).join('\n')
    + '\nconst DEFAULTS=' + JSON.stringify(DEFAULTS) + ';\n'
    + splitStems.toString()
    + '\nonmessage=function(e){try{'
    + 'var d=e.data;'
    + 'var out=splitStems(d.l,d.r,d.sampleRate,d.options,function(p){postMessage({progress:p});});'
    + 'var keys=["drums","bass","vocals","other"];var pay={sampleRate:out.sampleRate,length:out.length};'
    + 'var moves=[];keys.forEach(function(k){pay[k]={l:out[k].l,r:out[k].r};moves.push(out[k].l.buffer,out[k].r.buffer);});'
    + 'postMessage({done:pay},moves);'
    + '}catch(err){postMessage({error:err.message});}};';
}

const api = { fft, stft, istft, hpssMasks, splitStems, encodeWav, levelOf, hann, workerScript, DEFAULTS };
if (typeof module !== 'undefined') module.exports = api;
Object.assign(root, { MidiroomStems: api });
})(typeof globalThis !== 'undefined' ? globalThis : this);
