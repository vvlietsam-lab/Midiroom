/* Stem Splitter panel. Decodes an audio file, separates it off the main thread,
   and offers each stem for listening and download. Everything stays on the device. */
if (typeof document !== 'undefined') {
(function () {
'use strict';
const STEMS = [['drums', 'Drums'], ['bass', 'Bas'], ['vocals', 'Zang / midden'], ['other', 'Rest']];

const panel = document.createElement('section');
panel.id = 'stemSplitter';
panel.className = 'future-tool stem-splitter';
panel.hidden = true;
panel.innerHTML =
 '<div class="tool-title"><span class="eyebrow">STEM SPLITTER</span>'
 + '<h2>Haal een track uit elkaar</h2>'
 + '<p>Kies een audiobestand. Drums, bas, zang en de rest worden op je eigen apparaat gescheiden — er gaat niets naar een server.</p></div>'
 + '<div class="groove-load"><label class="midi-drop" for="stemFile"><strong>Sleep of kies audio</strong>'
 + '<span>wav, mp3, flac of ogg · de eerste 45 seconden worden verwerkt</span>'
 + '<input id="stemFile" type="file" accept="audio/*"></label>'
 + '<div id="stemFileMeta" class="groove-file-meta">Nog geen audio geladen</div></div>'
 + '<div id="stemControls" class="groove-controls" hidden>'
 + '<div class="groove-actions"><button id="stemRun" class="primary">Splits in stems</button>'
 + '<button id="stemStop">Stop met luisteren</button></div>'
 + '<div id="stemProgress" class="stem-progress" hidden><i></i></div></div>'
 + '<div id="stemList" class="stem-list" hidden>'
 + STEMS.map(([k, label]) =>
     '<div class="stem-row" data-stem="' + k + '"><strong>' + label + '</strong>'
     + '<span class="stem-meter"><i id="stemBar-' + k + '"></i></span>'
     + '<span class="stem-db" id="stemDb-' + k + '">—</span>'
     + '<button data-play="' + k + '">Luister</button>'
     + '<button data-save="' + k + '">WAV</button></div>').join('')
 + '</div>'
 + '<p id="stemStatus" role="status">Dit is signaalbewerking (spectrale scheiding), geen getraind model. '
 + 'Op strakke, breed gemixte tracks werkt het goed; op dichte mixen lekken de stems in elkaar. '
 + 'Bruikbaar om een drumloop te pakken, het laag te isoleren of een mix te ontleden — niet om een release van te maken.</p>';

const host = document.getElementById('editingPanels') || document.querySelector('main');
if (host) host.appendChild(panel);

const ge = id => document.getElementById(id);
const setStatus = t => { const el = ge('stemStatus'); if (el) el.textContent = t; };

let audioBuffer = null, stems = null, worker = null, loadToken = 0;
let playCtx = null, playSource = null;

function fmtTime(s) { const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function dbOf(x) { return x > 1e-6 ? 20 * Math.log10(x) : -Infinity; }

ge('stemFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const token = ++loadToken;
  stopPlayback();
  stems = null;
  ge('stemList').hidden = true;
  ge('stemFileMeta').textContent = 'Laden…';
  try {
    if (file.size > 60 * 1024 * 1024) throw new Error('Bestand is groter dan 60 MB.');
    const bytes = await file.arrayBuffer();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Deze browser ondersteunt geen Web Audio.');
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData(bytes);
    ctx.close();
    if (token !== loadToken) return;
    audioBuffer = buf;
    ge('stemFileMeta').textContent = file.name + ' · ' + fmtTime(buf.duration)
      + ' · ' + Math.round(buf.sampleRate / 100) / 10 + ' kHz · '
      + (buf.numberOfChannels > 1 ? 'stereo' : 'mono');
    ge('stemControls').hidden = false;
    setStatus('Klaar om te splitsen. Dit duurt een paar seconden en gebeurt op je eigen apparaat.');
  } catch (err) {
    if (token !== loadToken) return;
    audioBuffer = null;
    ge('stemControls').hidden = true;
    ge('stemFileMeta').textContent = 'Nog geen audio geladen';
    setStatus('Kon dit bestand niet lezen: ' + err.message);
  }
});

function showProgress(p) {
  const box = ge('stemProgress');
  box.hidden = false;
  box.firstElementChild.style.width = Math.round(p * 100) + '%';
}

ge('stemRun').addEventListener('click', () => {
  if (!audioBuffer) { setStatus('Kies eerst een audiobestand.'); return; }
  if (worker) { worker.terminate(); worker = null; }
  stopPlayback();
  ge('stemRun').disabled = true;
  showProgress(0);
  setStatus('Bezig met scheiden…');
  const l = audioBuffer.getChannelData(0).slice();
  const r = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1).slice() : l.slice();
  let url = null;
  try {
    url = URL.createObjectURL(new Blob([MidiroomStems.workerScript()], { type: 'text/javascript' }));
    worker = new Worker(url);
  } catch (err) {
    ge('stemRun').disabled = false;
    ge('stemProgress').hidden = true;
    setStatus('Kon de achtergrondtaak niet starten: ' + err.message);
    return;
  }
  URL.revokeObjectURL(url);
  worker.onmessage = ev => {
    const d = ev.data || {};
    if (d.progress != null) { showProgress(d.progress); return; }
    if (d.error) {
      ge('stemRun').disabled = false; ge('stemProgress').hidden = true;
      setStatus('Splitsen mislukt: ' + d.error);
      worker.terminate(); worker = null; return;
    }
    if (d.done) {
      stems = d.done;
      window.__midiroomStems = stems;   // readable by the browser test
      ge('stemRun').disabled = false;
      ge('stemProgress').hidden = true;
      ge('stemList').hidden = false;
      let loudest = 0;
      STEMS.forEach(([k]) => { loudest = Math.max(loudest, MidiroomStems.levelOf(stems[k].l).rms); });
      STEMS.forEach(([k]) => {
        const lv = MidiroomStems.levelOf(stems[k].l);
        const rel = loudest > 0 ? lv.rms / loudest : 0;
        ge('stemBar-' + k).style.width = Math.round(Math.sqrt(rel) * 100) + '%';
        const d2 = dbOf(lv.rms);
        ge('stemDb-' + k).textContent = isFinite(d2) ? d2.toFixed(1) + ' dB' : 'stil';
      });
      setStatus('Klaar. Luister per stem, of download als WAV. Spectrale scheiding lekt altijd iets — '
        + 'beoordeel het met je eigen oren voordat je het gebruikt.');
      worker.terminate(); worker = null;
    }
  };
  worker.onerror = err => {
    ge('stemRun').disabled = false; ge('stemProgress').hidden = true;
    setStatus('Splitsen mislukt: ' + (err.message || 'onbekende fout'));
    if (worker) { worker.terminate(); worker = null; }
  };
  worker.postMessage({ l, r, sampleRate: audioBuffer.sampleRate, options: {} }, [l.buffer, r.buffer]);
});

function stopPlayback() {
  if (playSource) { try { playSource.stop(0); } catch (e) {} playSource = null; }
  if (playCtx) { try { playCtx.close(); } catch (e) {} playCtx = null; }
  document.querySelectorAll('[data-play]').forEach(b => b.classList.remove('on'));
}
ge('stemStop').addEventListener('click', () => { stopPlayback(); setStatus('Gestopt.'); });

ge('stemList').addEventListener('click', ev => {
  const play = ev.target.closest('[data-play]');
  const save = ev.target.closest('[data-save]');
  if (play) {
    const k = play.dataset.play;
    if (!stems || !stems[k]) return;
    const wasOn = play.classList.contains('on');
    stopPlayback();
    if (wasOn) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      playCtx = new Ctx();
      const buf = playCtx.createBuffer(2, stems[k].l.length, stems.sampleRate);
      buf.copyToChannel(stems[k].l, 0); buf.copyToChannel(stems[k].r, 1);
      playSource = playCtx.createBufferSource();
      playSource.buffer = buf;
      playSource.connect(playCtx.destination);
      playSource.onended = () => { play.classList.remove('on'); };
      playSource.start();
      play.classList.add('on');
      setStatus('Speelt: ' + (STEMS.find(s => s[0] === k) || [])[1] + '. Klik nog eens om te stoppen.');
    } catch (err) { setStatus('Afspelen mislukt: ' + err.message); }
    return;
  }
  if (save) {
    const k = save.dataset.save;
    if (!stems || !stems[k]) return;
    try {
      const wav = MidiroomStems.encodeWav(stems[k].l, stems[k].r, stems.sampleRate);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      a.download = 'stem-' + k + '.wav';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      setStatus('WAV opgeslagen.');
    } catch (err) { setStatus('Opslaan mislukt: ' + err.message); }
  }
});
})();
}
