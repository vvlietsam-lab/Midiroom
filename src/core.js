/* ============================================================
   MIDIROOM — generator core v2
   Rule-based MIDI. No network, no model.
   Parts use normal MIDI roles; the genre lives in the style per part.
   ============================================================ */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const RNG = {
  make(seed) {
    const r = mulberry32(typeof seed === 'number' ? seed : hashSeed(String(seed)));
    return {
      f: r,
      int: (n) => Math.floor(r() * n),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      range: (a, b) => a + r() * (b - a),
    };
  }
};

/* ---------- scales ---------- */
const SCALES = {
  aeolian:          { name: 'Natuurlijk mineur',   steps: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor:    { name: 'Harmonisch mineur',   steps: [0, 2, 3, 5, 7, 8, 11] },
  phrygian:         { name: 'Frygisch',            steps: [0, 1, 3, 5, 7, 8, 10] },
  phrygianDominant: { name: 'Frygisch dominant',   steps: [0, 1, 4, 5, 7, 8, 10] },
  dorian:           { name: 'Dorisch',             steps: [0, 2, 3, 5, 7, 9, 10] },
  minorPent:        { name: 'Mineur pentatonisch', steps: [0, 3, 5, 7, 10] },
  ionian:           { name: 'Majeur',              steps: [0, 2, 4, 5, 7, 9, 11] },
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function degToSemi(deg, scaleSteps) {
  const n = scaleSteps.length;
  const oct = Math.floor(deg / n);
  const idx = ((deg % n) + n) % n;
  return scaleSteps[idx] + 12 * oct;
}
function midiName(m) { return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

/* ---------- progressions ---------- */
const PROGRESSIONS = [
  { id: 'euphoric',   label: 'i – VI – III – VII',  degs: [0, 5, 2, 6], note: 'de hardstyle-standaard, opgaand' },
  { id: 'driving',    label: 'i – VII – VI – VII',  degs: [0, 6, 5, 6], note: 'stuwend, blijft rond de tonica' },
  { id: 'andalusian', label: 'i – VII – VI – V',    degs: [0, 6, 5, 4], note: 'dalende Andalusische cadens' },
  { id: 'darkloop',   label: 'i – VI – VII – i',    degs: [0, 5, 6, 0], note: 'donker, sluit zichzelf' },
  { id: 'lift',       label: 'VI – VII – i – i',    degs: [5, 6, 0, 0], note: 'de klassieke lift de drop in' },
  { id: 'drama',      label: 'i – iv – VI – V',     degs: [0, 3, 5, 4], note: 'met harmonisch mineur maximaal gespannen' },
  { id: 'descent',    label: 'i – III – VII – VI',  degs: [0, 2, 6, 5], note: 'breed en melodieus' },
  { id: 'phryg',      label: 'i – bII – i – VII',   degs: [0, 1, 0, 6], note: 'frygisch, donkerste optie' },
  { id: 'suspend',    label: 'i – i – VI – VII',    degs: [0, 0, 5, 6], note: 'twee maten stil, dan beweging' },
  { id: 'minorswing', label: 'i – v – VI – VII',    degs: [0, 4, 5, 6], note: 'zachtere spanning, midtempo' },
  { id: 'twochord',   label: 'i – VI',              degs: [0, 5], note: 'twee akkoorden, hypnotisch' },
  { id: 'pedal',      label: 'i (blijft staan)',    degs: [0], note: 'één akkoord — alles komt uit ritme en melodie' },
  { id: 'eight',      label: 'i–VI–III–VII–i–VI–iv–V', degs: [0, 5, 2, 6, 0, 5, 3, 4], note: 'schema over acht maten' },
];

function chordDegrees(rootDeg, size) { if (size === 2) return [rootDeg, rootDeg + 4]; const o = []; for (let i = 0; i < size; i++) o.push(rootDeg + 2 * i); return o; }
function chordPitches(rootDeg, scaleSteps, rootMidi, size) {
  return chordDegrees(rootDeg, size).map(d => rootMidi + degToSemi(d, scaleSteps));
}
function chordToneClasses(rootDeg, scaleSteps, size, rootMidi) {
  const base = rootMidi || 0;
  return chordDegrees(rootDeg, size).map(d => (((base + degToSemi(d, scaleSteps)) % 12) + 12) % 12);
}

/* ============================================================
   STYLES — 16 sixteenths per bar, written by hand
   ============================================================ */
const STYLES = {
  bass: [
    { id: 'dubspace', label: 'Dubstep • ruimte', steps: [0, 3, 6, 10, 14], lens: [2, 1, 1, 3, 1], w: 2, note: 'subfrase met ruimte rond de halftime-snare' },
    { id: 'reese', label: 'Reese • sustain', steps: [0, 10], lens: [9, 5], w: 2, note: 'lange basnoten met een anticipatie; Reese-klank maak je in je synth' },
    { id: 'dnb', label: 'DnB • syncopated', steps: [0, 3, 6, 10, 14], lens: [2, 2, 3, 2, 1], w: 2, note: 'gesyncopeerde bas met korte turnaround' },
    { id: 'ukg', label: 'Garage • bounce', steps: [0, 3, 7, 10, 14], lens: [2, 1, 2, 2, 1], w: 1, note: 'rusten en anticipaties voor een 2-step groove' },
    { id: 'offbeat',   label: 'Offbeat (reverse bass)', steps: [2, 6, 10, 14], w: 3, note: 'achtsten tussen de kicks door' },
    { id: 'rolling',   label: 'Rollend (16den)',        steps: [2, 3, 6, 7, 10, 11, 14, 15], w: 2, note: 'dubbele zestienden' },
    { id: 'gallop',    label: 'Gallop',                 steps: [2, 3, 6, 10, 11, 14], w: 2, note: 'dubbel-enkel-dubbel-enkel' },
    { id: 'onbeat',    label: 'Op de tel',              steps: [0, 4, 8, 12], w: 2, note: 'kwarten, samen met de kick' },
    { id: 'eighths',   label: 'Doorlopende achtsten',   steps: [0, 2, 4, 6, 8, 10, 12, 14], w: 2, note: 'techno-achtig' },
    { id: 'pushed',    label: 'Vooruit geduwd',         steps: [2, 6, 9, 10, 14], w: 2, note: 'extra 16e na de derde tel' },
    { id: 'aangehouden', label: 'Aangehouden',          steps: [0, 8], lens: [8, 8], w: 2, note: 'grondtoon en kwint, allebei lang' },
    { id: 'heel',      label: 'Hele maat',              steps: [0], lens: [16], w: 3, note: 'één noot per maat' },
    { id: 'halftime',  label: 'Halftime',               steps: [6, 14], w: 1, note: 'twee noten per maat, veel ruimte' },
    { id: 'syncop',    label: 'Gesyncopeerd',           steps: [0, 3, 6, 10, 13], w: 2, note: 'schuivende accenten' },
    { id: 'sixteenth', label: 'Doorlopende 16den',      steps: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], w: 1, note: 'volle 16den, uptempo' },
  ],
  lead: [
    { id: 'overmaat3',  label: 'Over de maat (3 tellen)', steps: [0, 3, 6, 8], lens: [3, 3, 2, 4], span: 12, w: 2, note: 'cel van 3 tellen — schuift elke maat op' },
    { id: 'overmaat5',  label: 'Over de maat (5 tellen)', steps: [0, 4, 6, 10, 14, 16], lens: [4, 2, 4, 4, 2, 4], span: 20, w: 2, note: 'cel van 5 tellen, lange drift' },
    { id: 'overmaat6',  label: 'Over de maat (6 tellen)', steps: [0, 4, 8, 11, 14, 18, 20], lens: [4, 4, 3, 3, 4, 2, 4], span: 24, w: 2, note: 'cel van 6 tellen, houserig' },
    { id: 'tresillo',  label: '3-3-2',                  steps: [0, 3, 6, 8, 11, 14], lens: [3, 3, 2, 3, 3, 2], w: 3, note: 'het meest gebruikte hard-dance ritme' },
    { id: 'stab',      label: 'Stabs',                  steps: [0, 4, 6, 10, 12, 14], lens: [3, 1, 3, 1, 1, 2], w: 3, note: 'kort, op en naast de tel' },
    { id: 'gallopLead',label: 'Gallop',                 steps: [0, 3, 4, 8, 11, 12], lens: [3, 1, 4, 3, 1, 4], w: 2, note: 'agressief, vooruit' },
    { id: 'offbeat',   label: 'Offbeat',                steps: [2, 6, 10, 14], w: 2, note: 'ademt met de kick mee' },
    { id: 'longshort', label: 'Lang-kort',              steps: [0, 6, 8, 14], lens: [6, 2, 6, 2], w: 2, note: 'laat noten uitzingen' },
    { id: 'sixteenth', label: '16den-run',              steps: [0, 1, 2, 4, 6, 8, 9, 10, 12, 14], lens: [1, 1, 2, 2, 2, 1, 1, 2, 2, 2], w: 2, cell: 8, note: 'dicht, voor screech-runs' },
    { id: 'anticipate',label: 'Geanticipeerd',          steps: [3, 6, 7, 11, 14, 15], lens: [3, 1, 4, 3, 1, 1], w: 2, note: 'alles vooruit geschoven' },
    { id: 'sparse',    label: 'Sober',                  steps: [0, 6, 12], lens: [6, 6, 4], w: 1, note: 'drie noten per maat' },
    { id: 'triplet',   label: 'Trioolgevoel',           steps: [0, 3, 5, 8, 11, 13], w: 1, note: 'verschuivende accenten' },
  ],
  chords: [
    { id: 'whole',     label: 'Heel',                   steps: [0], w: 3, note: 'één akkoord per maat' },
    { id: 'half',      label: 'Half',                   steps: [0, 8], w: 2, note: 'twee stoten per maat' },
    { id: 'pumped',    label: 'Kwarten',                steps: [0, 4, 8, 12], w: 2, note: 'pompend' },
    { id: 'offstab',   label: 'Offbeat stabs',          steps: [2, 6, 10, 14], w: 2, note: 'tussen de kicks' },
    { id: 'syncop',    label: 'Gesyncopeerd',           steps: [0, 6, 10], w: 1, note: 'los van het raster' },
    { id: 'charleston',label: 'Charleston',             steps: [0, 6], w: 1, note: 'tel 1 en de en-van-2' },
    { id: 'achtsten',  label: 'Achtsten',               steps: [0, 2, 4, 6, 8, 10, 12, 14], w: 3, note: 'doorlopende achtsten' },
    { id: 'rawphoric', label: 'Rawphoric',              steps: [0, 3, 6, 8, 11, 14], w: 3, note: '3-3-2, zoals een lead' },
    { id: 'dicht',     label: 'Dicht',                  steps: [0, 2, 3, 6, 8, 10, 11, 14], w: 2, note: 'acht stoten per maat' },
  ],
  pad: [
    { id: 'whole',     label: 'Hele noten',             steps: [0], w: 3, note: 'één akkoord per maat, aangehouden' },
    { id: 'twobar',    label: 'Om de maat',             steps: [0], w: 2, note: 'trager, elke twee maten', everyOther: true },
    { id: 'half',      label: 'Halve noten',            steps: [0, 8], w: 1, note: 'twee akkoorden per maat' },
  ],
  pluck: [
    { id: 'steady8',   label: 'Achtsten',               steps: [0, 2, 4, 6, 8, 10, 12, 14], lens: [2, 1, 1, 2, 2, 1, 1, 2], w: 3, cell: 8, note: 'doorlopend, kort' },
    { id: 'steady16',  label: 'Zestienden',             steps: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], w: 2, cell: 4, note: 'vol, voor buildups' },
    { id: 'skip',      label: 'Huppelend',              steps: [0, 2, 3, 6, 8, 10, 11, 14], lens: [2, 1, 3, 2, 2, 1, 3, 2], w: 2, cell: 8, note: 'gaten op de tel' },
    { id: 'offGrid',   label: 'Offbeat 16den',          steps: [2, 3, 6, 7, 10, 11, 14, 15], lens: [1, 3, 1, 3, 1, 3, 1, 1], w: 2, cell: 8, note: 'volledig naast de tel' },
    { id: 'tresillo',  label: '3-3-2',                  steps: [0, 3, 6, 8, 11, 14], w: 2, note: 'zelfde ritme als de lead' },
  ],
  melody: [
    { id: 'flowing',   label: 'Vloeiend',               steps: [0, 4, 6, 10, 12], w: 3, note: 'lange noten, zingend' },
    { id: 'halfnote',  label: 'Halve noten',            steps: [0, 8], w: 2, note: 'heel rustig' },
    { id: 'phrased',   label: 'Gefraseerd',             steps: [0, 6, 8, 12], w: 3, note: 'ademt tussen de frasen' },
    { id: 'anacrusis', label: 'Met opmaat',             steps: [0, 3, 8, 11], w: 2, note: 'valt telkens net voor de tel' },
    { id: 'walk',      label: 'Wandelend',              steps: [0, 2, 4, 8, 10, 12], w: 2, note: 'stapsgewijs door de maat' },
  ],
  arp: [
    { id: 'walk',      label: 'Doorlopend',     w: 4, note: 'doorgecomponeerde 16den-lijn, herhaalt zichzelf niet' },
    { id: 'walkWide',  label: 'Doorlopend wijd', w: 3, note: 'zelfde, met grotere sprongen en octaafduiken' },
    { id: 'up',        label: 'Omhoog',                 w: 3, note: 'akkoordtonen omhoog' },
    { id: 'updown',    label: 'Op en neer',             w: 3, note: 'omhoog en terug' },
    { id: 'upOct',     label: 'Omhoog + octaaf',        w: 2, note: 'twee octaven omhoog' },
    { id: 'thumb',     label: 'Duimpatroon',            w: 2, note: 'grondtoon tussen elke noot' },
    { id: 'broken',    label: 'Gebroken',               w: 1, note: 'vaste maar onregelmatige volgorde' },
  ],
  screech: [
    { id: 'trioolroll', label: 'Triool - roll', steps: [0.0, 1.3333, 2.6667, 4.0, 5.3333, 6.6667, 8.0, 9.3333, 10.6667, 12.0, 13.3333, 14.6667], lens: [1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333, 1.3333], w: 2, triplet: true, note: 'alle twaalf achtste-triolen, doorlopend' },
    { id: 'trioolstoot', label: 'Triool - stoot', steps: [0.0, 2.6667, 4.0, 6.6667, 8.0, 10.6667, 12.0, 14.6667], lens: [2.6667, 1.3333, 2.6667, 1.3333, 2.6667, 1.3333, 2.6667, 1.3333], w: 3, triplet: true, note: 'eerste en derde van elke triool - de klassieke swingstoot' },
    { id: 'trioolgallop', label: 'Triool - gallop', steps: [0.0, 1.3333, 4.0, 5.3333, 8.0, 9.3333, 12.0, 13.3333], lens: [1.3333, 2.6667, 1.3333, 2.6667, 1.3333, 2.6667, 1.3333, 2.6667], w: 3, triplet: true, note: 'paren met een gat, rollend vooruit' },
    { id: 'trioolshuffle', label: 'Triool - shuffle', steps: [0.0, 2.6667, 5.3333, 8.0, 10.6667, 13.3333], lens: [2.6667, 2.6667, 2.6667, 2.6667, 2.6667, 2.6667], w: 2, triplet: true, note: 'elke tweede triool, shufflegevoel' },
    { id: 'trioolzwaar', label: 'Triool - zwaar', steps: [0.0, 4.0, 6.6667, 8.0, 12.0, 14.6667], lens: [4.0, 2.6667, 1.3333, 4.0, 2.6667, 1.3333], w: 2, triplet: true, note: 'lang-medium-kort, twee keer per maat' },
    { id: 'trioolademend', label: 'Triool - ademend', steps: [0.0, 4.0, 8.0, 13.3333], lens: [4.0, 4.0, 5.3333, 2.6667], w: 2, triplet: true, note: 'vier noten, veel ruimte' },
    { id: 'trioolbreak', label: 'Triool - break', steps: [0.0, 4.0, 8.0, 12.0, 12.6667, 13.3333, 14.0, 14.6667, 15.3333], lens: [4.0, 4.0, 4.0, 0.6667, 0.6667, 0.6667, 0.6667, 0.6667, 0.6667], w: 1, triplet: true, note: 'laatste tel in zestiende-triolen' },
    { id: 'callresponse', label: 'Call & response', steps: [0, 2, 6, 8, 11, 14], lens: [1.6, 2.8, 1, 2.5, 1, 1.4], w: 3, modern: true, note: 'herkenbare vraag, gevarieerd antwoord over twee maten' },
    { id: 'tripletburst', label: 'Triplet bursts', steps: [0, 4/3, 8/3, 8, 28/3, 32/3, 14], lens: [1, 1, 2, 1, 1, 2, 1], w: 2, modern: true, note: 'echte triolen: exact 160 ticks tussen aanslagen bij 480 PPQ' },
    { id: 'machine', label: 'Machine stutter', steps: [0, .5, 1, 1.5, 4, 8, 8.5, 9, 12, 14], lens: [.45, .45, .45, .45, 2, .45, .45, 1.5, 1, 1], w: 2, modern: true, note: '32ste bursts afgewisseld met gaten' },
    { id: 'answer', label: 'Late answer', steps: [2, 6, 9, 10, 13, 15], lens: [2, 1, .7, 1.5, 1, .7], w: 2, modern: true, note: 'laat de downbeat vrij; antwoordt op de kick' },
    { id: 'rising', label: 'Tension climb', steps: [0, 4, 8, 10, 12, 13, 14, 15], lens: [3, 3, 1.5, 1.5, .8, .8, .8, .8], w: 2, modern: true, note: 'loopt op in toonhoogte en ritmische dichtheid' },
    { id: 'broken', label: 'Broken phrase', steps: [0, 3, 5, 8, 11, 13, 15], lens: [1, 1.5, 1, 2, .8, 1, .6], w: 2, modern: true, note: 'gebroken syncopen met een herkenbaar tweematenmotief' },
    { id: 'reverse', label: 'Reverse pull', steps: [1, 5, 7, 9, 13, 15], lens: [2.5, 1, .7, 2.5, 1, .7], w: 2, modern: true, note: 'anticiperende noten voor reverse envelopes in je synth' },
    { id: 'longshort', label: 'Hold & cut', steps: [0, 8, 8.5, 9, 12, 14], lens: [6, .4, .4, 1.5, 1, 1], w: 2, modern: true, note: 'lange noot gevolgd door een korte stutter-respons' },
    { id: 'klassiek',  label: 'Klassiek',     steps: [0, 6, 8, 11, 12, 14],                 lens: [5.5, 1.67, 2.83, 0.83, 1.93, 2],      w: 3, note: 'lange kop, dan korte stoten' },
    { id: 'stotter',   label: 'Stotterend',   steps: [0, 1, 2, 4, 8, 9, 10, 12],            lens: [0.83, 0.67, 1.67, 4, 0.83, 0.67, 1.93, 4], w: 3, note: 'drie korte, één lange — twee keer per maat' },
    { id: 'langekop',  label: 'Lange kop',    steps: [0, 8, 10, 12],                        lens: [6, 1.67, 1.93, 4],                    w: 2, note: 'halve maat aanhouden, dan bewegen' },
    { id: 'gallop',    label: 'Gallop',       steps: [0, 3, 4, 6, 8, 11, 12, 14],           lens: [2.83, 0.67, 1.93, 2, 2.83, 0.83, 1.67, 2], w: 3, note: 'lang-kort-medium, rollend' },
    { id: 'omgekeerd', label: 'Omgekeerd',    steps: [0, 2, 7, 8, 10],                      lens: [1.67, 4.83, 0.67, 1.93, 6],           w: 2, note: 'kort gevolgd door lang, tegen de tel in' },
    { id: 'triool',    label: 'Trioolgevoel', steps: [0, 3, 6, 8, 11, 12, 14],              lens: [2.67, 2.67, 1.33, 2.67, 0.67, 1.33, 2], w: 3, note: 'trioollengtes over een 16den-raster' },
    { id: 'hakkend',   label: 'Hakkend',      steps: [0, 3, 4, 6, 10, 11, 12, 14],          lens: [2.83, 0.83, 1.93, 3.67, 0.67, 0.83, 1.67, 2], w: 2, note: 'geen twee lengtes achter elkaar gelijk' },
    { id: 'ademend',   label: 'Ademend',      steps: [0, 4, 6, 12],                         lens: [3.67, 1.67, 5.83, 4],                 w: 2, note: 'veel ruimte tussen de noten' },
    { id: 'rollend',   label: 'Rollend',      steps: [0, 1, 2, 3, 6, 7, 8, 11, 12, 14, 15], lens: [0.83, 0.67, 0.83, 2.83, 0.67, 0.83, 2.67, 0.83, 1.67, 0.67, 1], w: 2, note: 'dicht, met onregelmatige lengtes' },
    { id: 'dubbel',    label: 'Dubbele tijd', steps: [0, 2, 3, 8, 10, 11, 12, 13],          lens: [1.67, 0.67, 4.83, 1.93, 0.83, 0.67, 0.83, 2.67], w: 2, note: 'twee halve maten die elkaar spiegelen' },
    { id: 'zwaar',     label: 'Zwaar',        steps: [0, 8, 14],                            lens: [6, 5.83, 2],                          w: 2, note: 'drie noten per maat, klap net voor de maatstreep' },
    { id: 'kaal',      label: 'Kaal',         steps: [10, 14],                              lens: [3.67, 2],                             w: 1, note: 'twee noten, allebei offbeat' },
    { id: 'aanloop',   label: 'Aanloop',      steps: [0, 6, 10, 12, 14],                    lens: [5.83, 3.67, 1.93, 1.67, 2],           w: 2, note: 'lang naar kort — bouwt spanning per maat' },
  ],
  darkmelody: [
    { id: 'achtsten',  label: 'Achtsten',      steps: [0, 2, 4, 6, 8, 10, 12, 14],       lens: [2, 2, 2, 2, 2, 2, 2, 2], w: 3, note: 'doorlopende achtsten, gate 75%' },
    { id: 'syncoop',   label: 'Gesyncopeerd',  steps: [0, 2, 6, 8, 10, 12, 14],          lens: [2, 4, 2, 2, 2, 2, 2],    w: 3, note: 'accent naast de tel, zoals in de referentie' },
    { id: 'zestien',   label: 'Met 16den',     steps: [0, 2, 3, 6, 8, 10, 11, 12, 14],   lens: [2, 1, 3, 2, 2, 1, 1, 2, 2], w: 3, note: 'achtsten met zestienden ertussen' },
    { id: 'traag',     label: 'Traag',         steps: [0, 6, 8, 14],                     lens: [6, 2, 6, 2],             w: 2, note: 'vier noten, veel ruimte' },
    { id: 'dringend',  label: 'Dringend',      steps: [0, 2, 4, 6, 8, 10, 11, 12, 13, 14], lens: [2, 2, 2, 2, 2, 1, 1, 1, 1, 2], w: 2, note: 'verdicht naar het eind van de maat' },
    { id: 'zwaaiend',  label: 'Zwaaiend',      steps: [0, 3, 6, 10, 12, 14],             lens: [3, 3, 4, 2, 2, 2],       w: 2, note: 'ongelijke frasering' },
  ],
  drums: [
    { id: 'dubstep', label: 'Dubstep • halftime', w: 2, note: 'snare op tel 3, gebroken kick en snelle hataccenten' },
    { id: 'dnb', label: 'DnB • two-step', w: 2, note: 'snare op 2 en 4, kick op 1 en de & van 3' },
    { id: 'liquid', label: 'Liquid • ghost groove', w: 1, note: 'DnB met zachte ghost-snares en luchtige hats' },
    { id: 'ukg', label: 'UK garage • 2-step', w: 1, note: 'gebroken kicks, swung hats en snare op 2 en 4' },
    { id: 'hardstyle', label: 'Hardstyle', w: 3, note: 'kick op de kwarten, clap op 2 en 4, offbeat hats' },
    { id: 'uptempo',   label: 'Uptempo',   w: 2, note: 'kick op achtsten, 16den hats' },
    { id: 'techno',    label: 'Techno',    w: 2, note: 'open hat op de offbeat, clap op 2 en 4' },
    { id: 'minimal',   label: 'Minimaal',  w: 2, note: 'alleen kick en offbeat hat' },
    { id: 'breakbeat', label: 'Breakbeat', w: 1, note: 'gebroken kick-snare patroon' },
    { id: 'riser',     label: 'Snare-roll', w: 1, note: 'snare die per maat verdicht — voor buildups' },
  ],
  kick: [
    { id: 'quarters',  label: 'Kwarten',                steps: [0, 4, 8, 12], w: 3, note: 'four to the floor' },
    { id: 'withGhost', label: 'Met ghost',              steps: [0, 4, 8, 12, 14], w: 2, note: 'extra kick voor de maatstreep' },
    { id: 'rolling',   label: 'Rollend',                steps: [0, 2, 4, 6, 8, 10, 12, 14], w: 2, note: 'achtsten, uptempo' },
    { id: 'frenchcore',label: 'Frenchcore-roll',        steps: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], w: 1, note: 'volle 16den-roll' },
  ],
};

/* ---------- contours ---------- */
const CONTOURS = [
  { id: 'arch',       shape: [0, 2, 4, 5, 4, 2, 1, 0], w: 3, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'rise',       shape: [0, 1, 3, 4, 6, 7], w: 2, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'fall',       shape: [4, 3, 2, 0, -1, -3], w: 2, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'zigzag',     shape: [0, 3, 1, 4, 2, 5, 3], w: 3, kinds: ['lead', 'pluck'] },
  { id: 'pendulum',   shape: [0, 4, 0, 3, 0, 2, 0], w: 2, kinds: ['lead', 'pluck'] },
  { id: 'leapfill',   shape: [0, 5, 4, 3, 2, 1, 0], w: 3, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'terrace',    shape: [0, 0, 2, 2, 4, 4, 3], w: 2, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'drop',       shape: [5, 4, 5, 2, 3, 0], w: 2, kinds: ['lead', 'melody'] },
  { id: 'hammer',     shape: [0, 0, -2, 0, 0, -3, -2, 0], w: 1, kinds: ['lead', 'pluck'] },
  { id: 'runDown',    shape: [7, 6, 5, 4, 3, 2, 1, 0], w: 1, kinds: ['lead', 'pluck'] },
  { id: 'wave',       shape: [0, 2, 1, 3, 2, 4, 3, 5], w: 2, kinds: ['lead', 'melody', 'pluck'] },
  { id: 'anchorLeap', shape: [0, 0, 4, 0, 5, 0, 3], w: 2, kinds: ['lead', 'pluck'] },
  { id: 'stepUp',     shape: [0, 1, 2, 3, 4, 3, 2], w: 2, kinds: ['melody', 'pluck'] },
  { id: 'sigh',       shape: [4, 5, 4, 2, 1, 0, -1], w: 2, kinds: ['melody'] },
  { id: 'neighbour',  shape: [0, 1, 0, -1, 0, 1, 2], w: 3, kinds: ['melody', 'pluck'] },
  { id: 'scaleUp',    shape: [0, 1, 2, 3, 4, 5, 4, 3], w: 3, kinds: ['melody'] },
  { id: 'turn',       shape: [2, 3, 2, 1, 2, 4, 3, 2], w: 3, kinds: ['melody'] },
  { id: 'suspension', shape: [3, 3, 2, 2, 1, 1, 0], w: 2, kinds: ['melody'] },
];

function weightedPick(rng, arr) {
  const total = arr.reduce((s, x) => s + (x.w || 1), 0);
  let r = rng.f() * total;
  for (const x of arr) { r -= (x.w || 1); if (r <= 0) return x; }
  return arr[arr.length - 1];
}

/* ---------- pitch helpers ---------- */
function snapToChord(midi, chordClasses, rootMidi, scaleSteps) {
  for (let d = 0; d <= 6; d++) {
    for (const s of (d === 0 ? [0] : [-d, d])) {
      const c = ((midi + s) % 12 + 12) % 12;
      if (chordClasses.includes(c)) return midi + s;
    }
  }
  return midi;
}
function snapToScale(midi, rootMidi, scaleSteps) {
  const rel = ((midi - rootMidi) % 12 + 12) % 12;
  if (scaleSteps.includes(rel)) return midi;
  for (let d = 1; d <= 2; d++) {
    for (const s of [-d, d]) {
      const r2 = ((midi + s - rootMidi) % 12 + 12) % 12;
      if (scaleSteps.includes(r2)) return midi + s;
    }
  }
  return midi;
}
function nearestDegree(midi, rootMidi, scaleSteps) {
  const n = scaleSteps.length;
  const semi = midi - rootMidi;
  const oct = Math.floor(semi / 12);
  const rel = ((semi % 12) + 12) % 12;
  let best = 0, bd = 99;
  for (let i = 0; i < n; i++) { const d = Math.abs(scaleSteps[i] - rel); if (d < bd) { bd = d; best = i; } }
  return best + oct * n;
}
function wrapShift(shift, scaleLen) {
  let sh = shift;
  while (sh > Math.floor(scaleLen / 2)) sh -= scaleLen;
  while (sh < -Math.floor(scaleLen / 2)) sh += scaleLen;
  return sh;
}
function clampRegister(notes, centre, maxSpan) {
  return notes.map(n => {
    let m = n.midi;
    while (m - centre > maxSpan) m -= 12;
    while (centre - m > maxSpan) m += 12;
    return { ...n, midi: m };
  });
}

/* ============================================================
   MELODIC ENGINE (lead / melody / pluck)
   ============================================================ */
function buildMotif(rng, opts) {
  const { scaleSteps, rootMidi, chordDeg, chordSize, rhythm, startDeg, kind } = opts;
  const pool = CONTOURS.filter(c => c.kinds.includes(kind));
  const contour = weightedPick(rng, pool.length ? pool : CONTOURS);
  const shape = contour.shape;
  const n = rhythm.steps.length;
  const chordClasses = chordToneClasses(chordDeg, scaleSteps, chordSize, rootMidi);
  // dense rhythms get a repeating half-bar cell instead of one contour stretched thin,
  // which is what turned 16 notes into an endless two-note wobble
  const cell = rhythm.cell || 0;
  const sampleAt = (idx, count) => {
    const t = count <= 1 ? 0 : idx / (count - 1);
    const pos = t * (shape.length - 1);
    const lo = Math.floor(pos), hi = Math.min(shape.length - 1, lo + 1);
    return Math.round(shape[lo] + (shape[hi] - shape[lo]) * (pos - lo));
  };
  const degs = [];
  if (cell) {
    const groups = new Map();
    rhythm.steps.forEach((st, i) => {
      const g = Math.floor(st / cell);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(i);
    });
    const keys = [...groups.keys()].sort((a, b) => a - b);
    keys.forEach((g, gi) => {
      const idxs = groups.get(g);
      idxs.forEach((iAbs, k) => { degs[iAbs] = sampleAt(k, idxs.length) + (gi % 2 === 1 ? (rng.chance(0.6) ? 1 : -1) : 0); });
    });
  } else {
    for (let i = 0; i < n; i++) degs.push(sampleAt(i, n));
  }
  const cap = opts.maxDegStep;
  if (cap) {
    for (let i = 1; i < degs.length; i++) {
      const d = degs[i] - degs[i - 1];
      if (Math.abs(d) > cap) degs[i] = degs[i - 1] + Math.sign(d) * cap;
    }
  }
  const notes = [];
  for (let i = 0; i < n; i++) {
    const degOff = degs[i];
    let midi = rootMidi + degToSemi(startDeg + degOff, scaleSteps);
    const step = rhythm.steps[i];
    const len = rhythm.lens ? rhythm.lens[i] : null;
    if (step % 8 === 0) midi = snapToChord(midi, chordClasses, rootMidi, scaleSteps);
    else if (step % 4 === 0 && rng.chance(0.7)) midi = snapToChord(midi, chordClasses, rootMidi, scaleSteps);
    else midi = snapToScale(midi, rootMidi, scaleSteps);
    notes.push({ step, midi, len });
  }
  for (let i = 2; i < notes.length; i++) {
    if (notes[i].midi === notes[i - 1].midi && notes[i - 1].midi === notes[i - 2].midi) {
      notes[i].midi = snapToScale(notes[i].midi + (rng.chance(0.5) ? -2 : 2), rootMidi, scaleSteps);
    }
  }
  return { notes, contourId: contour.id };
}

function refitMotif(motif, opts) {
  const { scaleSteps, rootMidi, chordDeg, chordSize, shiftDeg } = opts;
  const chordClasses = chordToneClasses(chordDeg, scaleSteps, chordSize, rootMidi);
  return motif.notes.map(nt => {
    const deg = nearestDegree(nt.midi, rootMidi, scaleSteps) + shiftDeg;
    let midi = rootMidi + degToSemi(deg, scaleSteps);
    midi = (nt.step % 8 === 0) ? snapToChord(midi, chordClasses, rootMidi, scaleSteps)
                               : snapToScale(midi, rootMidi, scaleSteps);
    return { step: nt.step, midi, len: nt.len };
  });
}

function varyMotif(rng, notes, opts, kind, partKind) {
  if (partKind === 'melody' && kind === 'octaveLift') kind = 'tailChange';
  const { scaleSteps, rootMidi, chordDeg, chordSize } = opts;
  const chordClasses = chordToneClasses(chordDeg, scaleSteps, chordSize, rootMidi);
  const out = notes.map(n => ({ ...n }));
  if (!out.length) return out;
  if (kind === 'octaveLift') {
    const idx = out.length - 1 - rng.int(Math.min(3, out.length));
    out[idx].midi += 12;
  } else if (kind === 'tailChange' && out.length > 2) {
    const k = out.length - 1;
    const deg = nearestDegree(out[k].midi, rootMidi, scaleSteps) + (rng.chance(0.5) ? -2 : 2);
    out[k].midi = snapToChord(rootMidi + degToSemi(deg, scaleSteps), chordClasses, rootMidi, scaleSteps);
    const deg2 = nearestDegree(out[k - 1].midi, rootMidi, scaleSteps) + 1;
    out[k - 1].midi = snapToScale(rootMidi + degToSemi(deg2, scaleSteps), rootMidi, scaleSteps);
  } else if (kind === 'thin' && out.length > 3) {
    out.splice(rng.int(out.length - 1) + 1, 1);
  } else if (kind === 'fill') {
    const used = new Set(out.map(n => n.step));
    const cands = [11, 12, 13, 14, 15].filter(s => !used.has(s));
    const add = cands.slice(0, 2 + rng.int(2));
    let deg = nearestDegree(out[out.length - 1].midi, rootMidi, scaleSteps);
    for (const s of add) {
      deg += rng.chance(0.65) ? 1 : -1;
      out.push({ step: s, midi: snapToScale(rootMidi + degToSemi(deg, scaleSteps), rootMidi, scaleSteps) });
    }
    out.sort((a, b) => a.step - b.step);
  }
  return out;
}

function anchorClasses(deg, scaleSteps, size, rootMidi, colour) {
  return chordToneClasses(deg, scaleSteps, colour ? size + 2 : size, rootMidi);
}
function displace(notes, d, wrap) {
  // Truncating dropped whatever fell past the bar line, which cost the bar its downbeat
  // in about one bar in forty and read as a mistake rather than as syncopation.
  // Rotating keeps every note and every note length inside the bar.
  if (wrap === false) {
    return notes.map(n => ({ ...n, step: n.step + d }))
                .filter(n => n.step >= 0 && n.step < 16)
                .sort((a, b) => a.step - b.step);
  }
  const seen = new Set();
  return notes.map(n => ({ ...n, step: ((n.step + d) % 16 + 16) % 16 }))
              .sort((a, b) => a.step - b.step)
              .filter(n => { if (seen.has(n.step)) return false; seen.add(n.step); return true; });
}
function generateMelodic(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize, kind } = cfg;
  const rhythm = cfg.forcedRhythm || weightedPick(rng, STYLES[kind]);
  const baseMidi = rootMidi;
  const startDeg = rng.pick(kind === 'melody' ? [0, 0, 2, 4, 4] : [0, 0, 2, 4]);
  const L = scaleSteps.length;

  const motif = buildMotif(rng, { scaleSteps, rootMidi: baseMidi, chordDeg: prog[0], chordSize, rhythm, startDeg, kind, maxDegStep: cfg.maxDegStep });
  const centre = motif.notes.reduce((a, n) => a + n.midi, 0) / motif.notes.length;

  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const chordDeg = prog[b % prog.length];
    const opts = { scaleSteps, rootMidi: baseMidi, chordDeg, chordSize };
    const shift = wrapShift(chordDeg - prog[0], L);
    const phrase = Math.floor(b / 4), pos = b % 4;
    let notes;
    if (pos === 0) {
      notes = b === 0 ? motif.notes.map(n => ({ ...n })) : refitMotif(motif, { ...opts, shiftDeg: shift });
    } else if (pos === 1) {
      notes = refitMotif(motif, { ...opts, shiftDeg: shift });
      notes = varyMotif(rng, notes, opts, rng.chance(0.5) ? 'tailChange' : 'thin', kind);
    } else if (pos === 2) {
      notes = refitMotif(motif, { ...opts, shiftDeg: shift });
      notes = varyMotif(rng, notes, opts, 'octaveLift', kind);
    } else {
      notes = refitMotif(motif, { ...opts, shiftDeg: shift });
      notes = varyMotif(rng, notes, opts, 'tailChange', kind);
      if (kind !== 'melody' && rng.chance(0.6)) notes = varyMotif(rng, notes, opts, 'fill', kind);
    }
    if (phrase >= 1) {
      const rot = ['tailChange', 'octaveLift', 'thin', 'fill'];
      notes = varyMotif(rng, notes, opts, rot[(phrase + pos) % 4], kind);
      if (pos === 3 && kind !== 'melody') notes = varyMotif(rng, notes, opts, 'fill', kind);
    }
    if (b === bars - 1 && kind !== 'melody') notes = varyMotif(rng, notes, opts, 'fill', kind);

    notes = clampRegister(notes, centre, cfg.maxSpan ?? 11);
    const ccBar = anchorClasses(chordDeg, scaleSteps, chordSize, baseMidi, cfg.colour);
    const anchorMod = (kind === 'melody') ? 16 : 8;
    notes = notes.map(n => (n.step % anchorMod === 0)
      ? { ...n, midi: snapToChord(n.midi, ccBar, baseMidi, scaleSteps) }
      : { ...n, midi: snapToScale(n.midi, baseMidi, scaleSteps) });
    // shifting the whole cell off the grid is what stops a riff sounding like a nursery rhyme
    if (cfg.displace && b % 4 === 2 && rng.chance(0.55)) {
      notes = displace(notes, rng.pick([-2, -1, 1, 2]));
    }
    // chromatic approach from below into the next note — the standard "evil" move in raw
    if (cfg.tension) {
      for (let i = 0; i < notes.length - 1; i++) {
        const gapSemis = notes[i + 1].midi - notes[i].midi;
        if (notes[i].step % 8 !== 0 && gapSemis >= 2 && gapSemis <= 4 && rng.chance(0.38)) {
          notes[i].midi = notes[i + 1].midi - 1;
        }
      }
    }
    const seen = new Set();
    notes = notes.filter(n => { if (seen.has(n.step)) return false; seen.add(n.step); return true; })
                 .sort((a, b) => a.step - b.step);
    // Without an onset in the first beat a bar reads as adrift rather than as syncopated.
    // Off by default: plenty of styles are deliberately anticipated.
    if (cfg.anchorDownbeat && !notes.some(n => n.step < 4)) {
      const first = notes[0];
      if (first) notes = [{ ...first, step: 0 }, ...notes.slice(1)].sort((a, x) => a.step - x.step);
    }
    barsOut.push({ bar: b, notes });
  }
  const last = barsOut[barsOut.length - 1];
  if (last && last.notes.length) {
    const cc = chordToneClasses(prog[(bars - 1) % prog.length], scaleSteps, chordSize, baseMidi);
    const n = last.notes[last.notes.length - 1];
    n.midi = snapToChord(n.midi, cc, baseMidi, scaleSteps);
  }
  return { bars: barsOut, rhythmId: rhythm.id, rhythmLabel: rhythm.label, contourId: motif.contourId, base: baseMidi };
}

/* ---------- phrased over the bar line: a cell of 12, 20 or 24 steps tiles across the section,
   so the riff lands in a different place in every bar instead of resetting ---------- */
function generatePhased(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize, kind } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES[kind]);
  const cellLen = style.span || 16;
  const base = rootMidi;
  const total = bars * 16;
  const startDeg = rng.pick([0, 0, 2, 4]);

  const motif = buildMotif(rng, {
    scaleSteps, rootMidi: base, chordDeg: prog[0], chordSize,
    rhythm: { steps: style.steps, lens: style.lens, cell: 0 }, startDeg, kind,
    maxDegStep: cfg.maxDegStep,
  });
  const centre = motif.notes.reduce((a, n) => a + n.midi, 0) / motif.notes.length;

  const flat = [];
  const reps = Math.ceil(total / cellLen);
  for (let r = 0; r < reps; r++) {
    motif.notes.forEach((n, i) => {
      const abs = r * cellLen + n.step;
      if (abs >= total) return;
      const bar = Math.floor(abs / 16);
      const chordDeg = prog[bar % prog.length];
      const shift = wrapShift(chordDeg - prog[0], scaleSteps.length);
      let deg = nearestDegree(n.midi, base, scaleSteps) + shift;
      // every third pass gets a small change so it develops instead of merely drifting
      if (r % 3 === 2 && i === motif.notes.length - 1) deg += rng.chance(0.5) ? 1 : -1;
      let midi = base + degToSemi(deg, scaleSteps);
      const cc = anchorClasses(chordDeg, scaleSteps, chordSize, base, cfg.colour);
      midi = (abs % 16 === 0) ? snapToChord(midi, cc, base, scaleSteps) : snapToScale(midi, base, scaleSteps);
      while (midi - centre > (cfg.maxSpan ?? 12)) midi -= 12;
      while (centre - midi > (cfg.maxSpan ?? 12)) midi += 12;
      flat.push({ abs, midi, len: n.len });
    });
  }
  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const seen = new Set();
    barsOut.push({
      bar: b,
      notes: flat.filter(f => Math.floor(f.abs / 16) === b)
                 .map(f => ({ step: f.abs % 16, midi: f.midi, len: f.len }))
                 .filter(n => { if (seen.has(n.step)) return false; seen.add(n.step); return true; })
                 .sort((a, x) => a.step - x.step),
    });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label, contourId: motif.contourId, base, phased: cellLen };
}

/* ---------- double notes: a second voice a fixed interval above every note ---------- */
function addDyad(part, cfg, degrees) {
  part.bars.forEach(b => {
    const extra = b.notes.map(n => ({
      step: n.step, len: n.len,
      midi: cfg.rootMidi + degToSemi(nearestDegree(n.midi, cfg.rootMidi, cfg.scaleSteps) + degrees, cfg.scaleSteps),
    }));
    b.notes = b.notes.concat(extra);
  });
  return part;
}

/* ---------- scoring ---------- */
const SCORE_PROFILE = {
  lead:   { stepLo: 0.30, stepHi: 0.82, rangeLo: 7, rangeHi: 13, repMul: 12, repTarget: 0.19, uniqTarget: 7, leapBonus: 1.8 },
  pluck:  { stepLo: 0.30, stepHi: 0.85, rangeLo: 5, rangeHi: 15, repMul: 20, repTarget: 0.12, uniqTarget: 8, leapBonus: 1.6 },
  melody: { stepLo: 0.38, stepHi: 0.92, rangeLo: 7, rangeHi: 14, repMul: 55, uniqTarget: 8, leapBonus: 1.0 },
};
function scoreMelodic(part, cfg) {
  const prof = SCORE_PROFILE[cfg.kind] || SCORE_PROFILE.lead;
  const all = [];
  part.bars.forEach(b => b.notes.forEach(n => all.push({ ...n, abs: b.bar * 16 + n.step })));
  all.sort((a, b) => a.abs - b.abs);
  if (all.length < 3) return -999;
  const pitches = all.map(n => n.midi);
  let s = 0;

  const uniq = new Set(pitches).size;
  const uniqTarget = prof.uniqTarget || 8;
  s += 24 - Math.abs(uniq - uniqTarget) * 3.5;
  if (uniq < 4) s -= 40;

  let steps = 0, leaps = 0, big = 0, reps = 0, resolved = 0;
  for (let i = 1; i < pitches.length; i++) {
    const iv = pitches[i] - pitches[i - 1], a = Math.abs(iv);
    if (a === 0) reps++; else if (a <= 2) steps++; else if (a <= 7) leaps++; else big++;
    if (a > 4 && i + 1 < pitches.length) {
      const nxt = pitches[i + 1] - pitches[i];
      if (Math.sign(nxt) === -Math.sign(iv) && Math.abs(nxt) <= 3) resolved++;
    }
  }
  const tot = pitches.length - 1;
  const density = pitches.length / part.bars.length;
  const stepRatio = steps / tot, repRatio = reps / tot;
  s += (stepRatio > prof.stepLo && stepRatio < prof.stepHi) ? 14 : -8;
  if (prof.repTarget != null) s -= Math.abs(repRatio - prof.repTarget) * prof.repMul * 2.2;
  else s -= repRatio * (density >= 8 ? prof.repMul * 0.4 : prof.repMul);
  s += Math.min(leaps, 6) * prof.leapBonus;
  s -= big * 4;
  s += resolved * 3;

  const max = Math.max(...pitches), min = Math.min(...pitches);
  const peakIdx = pitches.indexOf(max), peakCount = pitches.filter(p => p === max).length;
  s += peakCount <= 2 ? 10 : -5;
  const rel = peakIdx / pitches.length;
  s += (rel > 0.45 && rel < 0.95) ? 9 : 0;

  const range = max - min;
  s += (range >= prof.rangeLo && range <= prof.rangeHi) ? 14 : (range < prof.rangeLo - 2 ? -18 : -8);

  let strong = 0, strongOk = 0;
  part.bars.forEach(b => {
    const cc = chordToneClasses(cfg.prog[b.bar % cfg.prog.length], cfg.scaleSteps, cfg.chordSize, part.base);
    b.notes.forEach(n => { if (n.step % 8 === 0) { strong++; if (cc.includes(((n.midi % 12) + 12) % 12)) strongOk++; } });
  });
  if (strong) s += (strongOk / strong) * 18;

  const sigs = part.bars.map(b => b.notes.map(n => n.step + ':' + n.midi).join(','));
  s += new Set(sigs).size >= Math.min(3, part.bars.length) ? 10 : -12;

  let dirChanges = 0;
  for (let i = 1; i < part.bars.length; i++) {
    const a = part.bars[i - 1].notes, b = part.bars[i].notes;
    if (!a.length || !b.length) continue;
    const da = a[a.length - 1].midi - a[0].midi, db = b[b.length - 1].midi - b[0].midi;
    if (Math.sign(da) !== Math.sign(db) && da !== 0 && db !== 0) dirChanges++;
  }
  s += Math.min(dirChanges, 3) * 3;

  if (part.bars.length >= 8) {
    let same = 0;
    for (let i = 0; i < 4; i++) if (sigs[i] === sigs[i + 4]) same++;
    s -= same * 7;
  }
  return s;
}
function bestMelodic(seedRng, cfg, tries) {
  let best = null, bestScore = -1e9;
  const rhythm = cfg.forcedRhythm || weightedPick(seedRng, STYLES[cfg.kind]);
  // a cell longer than one bar has to go through the phased generator, or its steps overflow the bar
  if (rhythm.span && rhythm.span !== 16) {
    const p = generatePhased(seedRng, { ...cfg, forcedRhythm: rhythm });
    p.score = Math.round(scoreMelodic(p, cfg) * 10) / 10;
    return p;
  }
  for (let i = 0; i < Math.max(1, tries); i++) {
    const sub = RNG.make(seedRng.int(1e9));
    const cand = generateMelodic(sub, { ...cfg, forcedRhythm: rhythm });
    const sc = scoreMelodic(cand, cfg);
    if (sc > bestScore) { bestScore = sc; best = cand; }
  }
  best.score = Math.round(bestScore * 10) / 10;
  return best;
}

/* ============================================================
   BASS
   ============================================================ */
function generateBass(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.bass);
  const base = rootMidi;
  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const deg = prog[b % prog.length];
    const rootPitch = base + degToSemi(deg, scaleSteps);
    const cc = chordToneClasses(deg, scaleSteps, 3, base);
    const steps = style.steps;
    const notes = steps.map((s, i) => {
      let midi = rootPitch;
      const rel = steps.length > 1 ? i / (steps.length - 1) : 0;
      if (cfg.movement) {
        if (b % 4 === 3 && rel > 0.6) midi = snapToChord(rootPitch + [7, 10, 3][i % 3], cc, base, scaleSteps);
        else if (rel > 0.75 && rng.chance(0.3)) midi = snapToChord(rootPitch + 7, cc, base, scaleSteps);
      }
      if (cfg.octaveJump && i % 2 === 1) midi += 12;
      // a sustained bass that repeats the same pitch twice reads as one note; move to the fifth
      else if (style.lens && i % 2 === 1) midi = snapToChord(rootPitch + 7, cc, base, scaleSteps);
      return { step: s, midi, len: style.lens ? style.lens[i] : undefined };
    });
    // a reverse bass belongs between the kicks; where it lands on one, move it or drop it
    let out = notes;
    if (cfg.kickOnsets && cfg.avoidKick) {
      const taken = new Set(notes.map(n => n.step));
      out = [];
      notes.forEach(n => {
        if (!cfg.kickOnsets.has(b * 16 + n.step)) { out.push(n); return; }
        const alt = n.step + 1;
        if (alt < 16 && !taken.has(alt) && !cfg.kickOnsets.has(b * 16 + alt)) {
          taken.add(alt); out.push({ ...n, step: alt });
        }
      });
      if (out.length < notes.length / 2) out = notes;   // a full kick roll leaves no room; leave the bass alone
    }
    barsOut.push({ bar: b, notes: out });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label };
}

/* ============================================================
   CHORDS / PAD
   ============================================================ */
function voiceLead(prevVoicing, pitches, startInv) {
  if (!prevVoicing) {
    const inv = startInv || 0;
    return pitches.map((p, i) => p + (i < inv ? 12 : 0)).sort((a, b) => a - b);
  }
  let best = null, bestCost = 1e9;
  for (let inv = 0; inv < pitches.length; inv++) {
    const v = pitches.map((p, i) => p + (i < inv ? 12 : 0)).sort((a, b) => a - b);
    for (const oct of [-12, 0, 12]) {
      const cand = v.map(p => p + oct);
      let cost = 0;
      cand.forEach(c => { cost += prevVoicing.reduce((m, q) => Math.min(m, Math.abs(q - c)), 99); });
      // measured: the reference chords sit in inversion far more often than in root position
      if (cand.length > 1 && (cand[1] - cand[0]) <= 4) cost += 2.5;
      if (cost < bestCost) { bestCost = cost; best = cand; }
    }
  }
  return best;
}
function generateChords(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize, kind } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES[kind === 'pad' ? 'pad' : 'chords']);
  const base = rootMidi;
  let prev = null;
  const startInv = rng.pick([1, 1, 2, 0]);   // the corpus voices its chords in inversion far more than in root position
  const barsOut = [];
  // in the reference arrangements the chords hit exactly where the lead hits
  const follow = cfg.followLead && cfg.leadPart ? cfg.leadPart.bars : null;
  const borrow = cfg.chordVoicings ? cfg.chordVoicings.bars : null;
  for (let b = 0; b < bars; b++) {
    if (!follow && style.everyOther && b % 2 === 1) { barsOut.push({ bar: b, notes: [] }); continue; }
    const deg = prog[b % prog.length];
    let voiced;
    if (borrow && borrow[b] && borrow[b].notes.length) {
      voiced = [...new Set(borrow[b].notes.map(n => n.midi))].sort((a, x) => a - x);
    } else {
      voiced = voiceLead(prev, chordPitches(deg, scaleSteps, base, chordSize), startInv);
    }
    prev = voiced;
    const notes = [];
    const hits = follow
      ? (follow[b] ? follow[b].notes.map(n => ({ step: n.step, len: n.len })) : [])
      : style.steps.map((st, i) => ({ step: st, len: style.lens ? style.lens[i] : undefined }));
    hits.forEach(h => {
      voiced.forEach(p => notes.push({ step: h.step, midi: p, len: h.len }));
      if (cfg.bassNote) notes.push({ step: h.step, midi: base - 12 + degToSemi(deg, scaleSteps), len: h.len });
    });
    barsOut.push({ bar: b, notes });
  }
  return { bars: barsOut, rhythmId: follow ? 'volgt lead' : style.id, rhythmLabel: follow ? 'Volgt de lead' : style.label };
}

/* ---------- harmony: the lead a diatonic third below, same rhythm ---------- */
function harmonise(leadPart, cfg, interval) {
  const { scaleSteps, rootMidi } = cfg;
  const bars = leadPart.bars.map(b => ({
    bar: b.bar,
    notes: b.notes.map(n => ({
      step: n.step, len: n.len,
      midi: rootMidi + degToSemi(nearestDegree(n.midi, rootMidi, scaleSteps) - interval, scaleSteps),
    })),
  }));
  return { bars, rhythmId: 'harmonie', rhythmLabel: 'Terts onder de lead', base: leadPart.base };
}

/* ============================================================
   KICK (tuned)
   ============================================================ */
function generateKick(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.kick);
  const base = rootMidi;
  const shape = [0, 0, 7, 0, 0, 3, 7, 10];
  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const deg = prog[b % prog.length];
    const cc = chordToneClasses(deg, scaleSteps, 3, base);
    const isTurn = (b % 4 === 3);
    const steps = (isTurn && cfg.rolls && style.id !== 'frenchcore')
      ? [0, 2, 4, 6, 8, 10, 12, 13, 14, 15] : style.steps;
    const notes = steps.map((s, i) => {
      let midi = base + degToSemi(deg, scaleSteps);
      if (cfg.tonal) midi = snapToChord(midi + shape[i % shape.length], cc, base, scaleSteps);
      return { step: s, midi };
    });
    barsOut.push({ bar: b, notes });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label };
}

/* ============================================================
   SCREECH — one note that keeps moving slightly, groove from note lengths
   ============================================================ */
function generateScreech(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.screech);
  if (style.modern) return generateScreechPhrase(rng, cfg, style);
  const base = rootMidi;
  // reference material sits on the root 86% of the time; movement is the exception, not the rule
  const moveChance = cfg.wander ? 0.28 : 0.08;
  const octChance = cfg.octaveAccent ? 0.11 : 0;
  const keep = cfg.density === 'dicht' ? 1 : cfg.density === 'normaal' ? 0.62 : 0.30;
  const tonic = nearestDegree(base, base, scaleSteps);
  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const deg = prog[b % prog.length];
    const cc = chordToneClasses(deg, scaleSteps, chordSize, base);
    const home = cfg.followChords ? nearestDegree(base + degToSemi(deg, scaleSteps), base, scaleSteps) : tonic;
    let cur = home;
    const notes = style.steps.map((st, i) => {
      const len = style.lens ? style.lens[i] : 2;
      if (i === 0) cur = home;
      else if (rng.chance(moveChance)) {
        // when it does move it is almost always the second or the third, never a melody
        cur = home + rng.pick([1, 1, 2, 2, -1, 4]);
      } else cur = home;
      let midi = base + degToSemi(cur, scaleSteps);
      midi = (cfg.followChords && st % 8 === 0) ? snapToChord(midi, cc, base, scaleSteps) : snapToScale(midi, base, scaleSteps);
      if (i > 0 && rng.chance(octChance)) midi += rng.chance(0.65) ? 12 : -12;
      return { step: st, midi, len };
    });
    // thin the pattern out: dropped onsets are absorbed into the note before them,
    // which is what produces the very long notes in the reference loops
    let out = notes;
    if (keep < 1) {
      out = [];
      notes.forEach((n, i) => {
        if (i === 0 || rng.chance(keep)) out.push({ ...n });
        else if (out.length) out[out.length - 1].len += n.len;
      });
    }
    if (b % 4 === 3 && out.length > 2) {
      out[out.length - 1].len = Math.max(0.67, out[out.length - 1].len / 2);
      out[out.length - 2].len = Math.max(0.67, out[out.length - 2].len / 2);
    }
    barsOut.push({ bar: b, notes: out });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label, base };
}

// A stable two-bar motif; variation changes answers, never randomises every note.
function generateScreechPhrase(rng, cfg, style) {
  const {rootMidi, scaleSteps, prog, bars} = cfg;
  const shape = rng.pick([[0,0,2,0,4,1,0,2], [0,1,0,4,2,1,0,-1], [0,0,-1,0,2,4,1,0]]);
  const phrase = cfg.phrase || 'evolving';
  const movement = cfg.motion || 'tonal';
  const baseNotes = style.steps.map((step,i) => ({step, len:style.lens[i], index:i}));
  const barsOut = [];
  for (let b=0;b<bars;b++) {
    const home = cfg.followChords ? prog[b % prog.length] : 0;
    const answer = phrase !== 'fixed' && b % 2 === 1;
    let hits = baseNotes.map(n=>({...n}));
    if(answer) hits = hits.filter((n,i)=> i !== 1).map(n=>({...n,step:Math.min(15.5,n.step + (n.step>=8 && style.id !== 'tripletburst' ? .5 : 0))}));
    if(cfg.density === 'sober') hits = hits.filter((n,i)=>i%4===0 || i===hits.length-1);
    else if(cfg.density === 'normaal') hits = hits.filter((n,i)=>i!==3 || style.id==='tripletburst');
    if(phrase==='evolving' && b%4===3 && cfg.density!=='sober') {
      hits=hits.filter(n=>n.step<14);
      [14,14.5,15,15.5].forEach((step,i)=>hits.push({step,len:.4,index:i+4}));
    }
    const notes=hits.map((n,i)=>{
      let degree=0;
      if(movement==='tonal') degree=shape[(n.index+(answer?2:0))%shape.length];
      if(movement==='rising' || style.id==='rising') degree=Math.min(6,Math.floor(i/2));
      if(movement==='falling') degree=Math.max(0,4-Math.floor(i/2));
      if(movement==='root') degree=cfg.wander && i%6===5 ? 1 : (rng.chance(0.14) ? rng.pick([2,2,3]) : 0);
      let midi=rootMidi+degToSemi(home+degree,scaleSteps);
      if(cfg.octaveAccent && i===hits.length-1 && b%2===1 && rng.chance(0.22)) midi+=12;
      return {step:n.step,midi,len:Math.min(n.len,16-n.step)};
    });
    barsOut.push({bar:b,notes});
  }
  return {bars:barsOut,rhythmId:style.id,rhythmLabel:style.label,base:rootMidi};
}

function kickOnsetSet(kickPart) {
  const set = new Set();
  kickPart.bars.forEach(b => b.notes.forEach(n => set.add(b.bar * 16 + n.step)));
  return set;
}

/* ============================================================
   DRUMS — fixed pitches, Ableton drum-rack mapping
   ============================================================ */
const DRUM_MAP = { kick: 36, snare: 38, clap: 39, hat: 42, openhat: 46, ride: 51 };
function generateDrums(rng, cfg) {
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.drums);
  const bars = cfg.bars;
  const barsOut = [];
  for (let b = 0; b < bars; b++) {
    const notes = [];
    const dropKick = cfg.kickOnsets && cfg.noDoubleKick !== false;
    const add = (steps, pitch, velocity) => steps.forEach(s => {
      // a separate tuned Kick part already covers the low end; doubling it just phases
      if (pitch === DRUM_MAP.kick && dropKick && cfg.kickOnsets.has(b * 16 + s)) return;
      notes.push({ step: s, midi: pitch, drum: true, velocity });
    });
    const isFill = (b % 4 === 3) && cfg.fills !== false;
    if (style.id === 'disco') {
      add([0,4,8,12],DRUM_MAP.kick);add([4,12],DRUM_MAP.snare,100);add([4,12],DRUM_MAP.clap,80);add([2,6,10,14],DRUM_MAP.openhat,85);add([0,4,8,12],DRUM_MAP.hat,62);if(isFill)add([15],DRUM_MAP.snare,55);
    } else if (style.id === 'dubstep') {
      add(b%2 ? [0,6,11] : [0,6], DRUM_MAP.kick);
      add([8], DRUM_MAP.snare);
      add([0,2,4,6,8,10,12,14], DRUM_MAP.hat, 80);
      if(isFill) add([14,14.5,15,15.5], DRUM_MAP.hat, 60);
    } else if(style.id === 'dnb' || style.id === 'liquid') {
      add(b%2 ? [0,7,10] : [0,10], DRUM_MAP.kick);
      add([4,12], DRUM_MAP.snare, 112);
      add([0,2,4,6,8,10,12,14], DRUM_MAP.hat, 78);
      if(style.id==='liquid') add([7,15], DRUM_MAP.snare, 46);
      if(isFill) add([14,15], DRUM_MAP.snare, 64);
    } else if(style.id === 'ukg') {
      add(b%2 ? [0,7,10] : [0,6,10], DRUM_MAP.kick);
      add([4,12], DRUM_MAP.snare);
      add([2,5,7,10,13,15], DRUM_MAP.hat, 80);
      if(isFill) add([15], DRUM_MAP.snare, 52);
    } else if (style.id === 'hardstyle') {
      add([0, 4, 8, 12], DRUM_MAP.kick);
      add([4, 12], DRUM_MAP.clap);
      add([2, 6, 10, 14], DRUM_MAP.hat);
      if (isFill) add([14, 15], DRUM_MAP.snare);
    } else if (style.id === 'uptempo') {
      add([0, 2, 4, 6, 8, 10, 12, 14], DRUM_MAP.kick);
      add([4, 12], DRUM_MAP.clap);
      add([1, 3, 5, 7, 9, 11, 13, 15], DRUM_MAP.hat);
      if (isFill) add([12, 13, 14, 15], DRUM_MAP.snare);
    } else if (style.id === 'techno') {
      add([0, 4, 8, 12], DRUM_MAP.kick);
      add([4, 12], DRUM_MAP.clap);
      add([2, 6, 10, 14], DRUM_MAP.openhat);
      add([1, 3, 5, 7, 9, 11, 13, 15], DRUM_MAP.hat);
    } else if (style.id === 'minimal') {
      add([0, 4, 8, 12], DRUM_MAP.kick);
      add([2, 6, 10, 14], DRUM_MAP.hat);
      if (isFill) add([14], DRUM_MAP.clap);
    } else if (style.id === 'breakbeat') {
      add([0, 3, 8, 10], DRUM_MAP.kick);
      add([4, 12], DRUM_MAP.snare);
      add([2, 6, 10, 14], DRUM_MAP.hat);
      if (isFill) add([13, 14, 15], DRUM_MAP.snare);
    } else { // riser
      const density = Math.min(4, 1 + Math.floor(b / Math.max(1, bars / 4)));
      const step = Math.max(1, 8 / density);
      const st = [];
      for (let s = 0; s < 16; s += step) st.push(Math.round(s));
      add([...new Set(st)], DRUM_MAP.snare);
      add([0, 8], DRUM_MAP.kick);
    }
    barsOut.push({ bar: b, notes });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label, drums: true };
}

/* ============================================================
   ARP
   ============================================================ */
function generateArp(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.arp);
  const base = rootMidi;
  const barsOut = [];
  const rate = cfg.eighths ? 2 : Math.max(1, cfg.rate || 1);

  if (style.id === 'walk' || style.id === 'walkWide') {
    // the reference arps never repeat a cycle: they walk, with the direction kept in balance
    const wide = style.id === 'walkWide';
    const jumps = wide
      ? [1, -1, 2, -2, 3, -3, 4, -4, 7, -7, 2, -2, 1, -1]
      : [1, -1, 1, -1, 2, -2, 2, -2, 3, -3, 4, -4];
    let deg = 0, drift = 0, lastMidi = null;
    for (let b = 0; b < bars; b++) {
      const cd = prog[b % prog.length];
      const cc = chordToneClasses(cd, scaleSteps, chordSize, base);
      const notes = [];
      for (let st = 0; st < 16; st += rate) {
        if (st === 0) {
          const before = deg;
          deg = nearestDegree(snapToChord(base + degToSemi(deg, scaleSteps), cc, base, scaleSteps), base, scaleSteps);
          if (deg === before && b > 0) deg += rng.chance(0.5) ? 1 : -1;
        } else {
          let j = rng.pick(jumps);
          if (j === 0) j = rng.chance(0.5) ? 1 : -1;
          if (drift > 3 && j > 0) j = -j;          // keep up and down roughly even
          if (drift < -3 && j < 0) j = -j;
          if (Math.abs(deg + j) > (wide ? 6 : 4)) j = -j;   // stay inside a workable window
          deg += j; drift += Math.sign(j);
        }
        // the reference arps average 10.4 notes per bar, not a full 16 — they breathe
        if (st !== 0 && cfg.gaps !== false && rng.chance(0.3)) continue;
        let midi = base + degToSemi(deg, scaleSteps);
        if (lastMidi != null && rng.chance(0.022)) { midi = lastMidi; }
        else if (midi === lastMidi) { deg += rng.chance(0.5) ? 1 : -1; midi = base + degToSemi(deg, scaleSteps); }
        lastMidi = midi;
        if (cfg.rise && bars > 1) midi += 12 * Math.floor(b / Math.max(1, Math.ceil(bars / 2)));
        notes.push({ step: st, midi, len: rate });
      }
      barsOut.push({ bar: b, notes });
    }
    return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label };
  }

  for (let b = 0; b < bars; b++) {
    const deg = prog[b % prog.length];
    const ch = chordPitches(deg, scaleSteps, base, chordSize);
    let seq;
    if (style.id === 'up') seq = ch;
    else if (style.id === 'updown') seq = ch.concat(ch.slice(1, -1).reverse());
    else if (style.id === 'upOct') seq = ch.concat(ch.map(p => p + 12));
    else if (style.id === 'thumb') seq = ch.flatMap((p, i) => (i === 0 ? [p] : [ch[0], p]));
    else seq = [ch[0], ch[2 % ch.length], ch[1 % ch.length], ch[0] + 12, ch[1 % ch.length], ch[2 % ch.length]];
    if (!seq.length) seq = ch.slice();
    const notes = [];
    for (let st = 0; st < 16; st += rate) {
      const idx = Math.floor((b * 16 + st) / rate) % seq.length;
      let midi = seq[idx];
      if (cfg.rise && bars > 1) midi += 12 * Math.floor(b / Math.max(1, Math.ceil(bars / 2)));
      notes.push({ step: st, midi, len: (st % 4 === 0) ? rate : rate * 0.6 });
    }
    barsOut.push({ bar: b, notes });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label };
}

/* ============================================================
   DARK MELODY — root-heavy, phrygian colour, chromatic neighbours
   ============================================================ */
function generateDarkMelody(rng, cfg) {
  const { scaleSteps, rootMidi, prog, bars, chordSize } = cfg;
  const style = cfg.forcedRhythm || weightedPick(rng, STYLES.darkmelody);
  const base = rootMidi;
  const barsOut = [];
  let prevMidi = null;
  for (let b = 0; b < bars; b++) {
    const cd = prog[b % prog.length];
    const cc = chordToneClasses(cd, scaleSteps, chordSize, base);
    // anchored to the tonic like the reference loops, with the chord only colouring beat 1
    const home = cfg.followChords ? base + degToSemi(nearestDegree(base + degToSemi(cd, scaleSteps), base, scaleSteps), scaleSteps) : base;
    // a fixed handful of pitches per bar keeps the unique-pitch count near the reference
    const pool = [home, home,
                  snapToScale(home + 3, base, scaleSteps),
                  snapToScale(home + 5, base, scaleSteps),
                  snapToScale(home + 7, base, scaleSteps),
                  snapToScale(home - 2, base, scaleSteps)];
    if (cfg.chromatic !== false) pool.push(home + 1, home + 1);
    const notes = style.steps.map((st, i) => {
      let midi;
      if (i === 0 || prevMidi == null) midi = home;
      else {
        const r = rng.f();
        if (r < 0.12) midi = prevMidi;                     // some repetition, but far less than a screech
        else midi = rng.pick(pool);
      }
      if (st % 16 === 0) midi = snapToChord(midi, cc, base, scaleSteps);
      while (midi - home > 14) midi -= 12;
      while (home - midi > 14) midi += 12;
      prevMidi = midi;
      return { step: st, midi, len: style.lens ? style.lens[i] : 2 };
    });
    barsOut.push({ bar: b, notes });
  }
  return { bars: barsOut, rhythmId: style.id, rhythmLabel: style.label, base };
}

/* ---------- register fitting ---------- *//* ---------- register fitting ---------- */
function fitRegister(part, targetCentre, maxSpan) {
  const all = [];
  part.bars.forEach(b => b.notes.forEach(n => all.push(n)));
  if (!all.length) return part;
  if (maxSpan) {
    const sorted = all.map(n => n.midi).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    all.forEach(n => {
      while (n.midi - med > maxSpan) n.midi -= 12;
      while (med - n.midi > maxSpan) n.midi += 12;
    });
  }
  const mean = all.reduce((a, n) => a + n.midi, 0) / all.length;
  const shift = Math.round((targetCentre - mean) / 12) * 12;
  if (shift) all.forEach(n => { n.midi += shift; });
  all.forEach(n => { while (n.midi > 108) n.midi -= 12; while (n.midi < 12) n.midi += 12; });
  return part;
}

/* ============================================================
   RENDER
   ============================================================ */
const TPQ = 480;
const TICK16 = TPQ / 4;

function accentVelocity(step, rng, base, spread) {
  // the reference loops are almost flat: 80/80, 98/98, 100-112. Accents live in the sound, not the MIDI.
  let v = base;
  if (step % 4 === 0) v += 6;
  else if (step % 2 === 0) v += 2;
  else v -= 3;
  if (spread > 0) v += Math.round(rng.range(-spread / 2, spread / 2));
  return Math.max(28, Math.min(127, v));
}

function renderPart(part, cfg, rng) {
  const gate = cfg.gate ?? 0.85;
  let flat = [];
  part.bars.forEach(b => b.notes.forEach(n => flat.push({ abs: b.bar * 16 + n.step, midi: n.midi, len: n.len, velocity: n.velocity })));
  flat.sort((a, b) => a.abs - b.abs || a.midi - b.midi);
  // one note per pitch per onset — a doubled note reads as a stuck note in a DAW
  const seen = new Set();
  flat = flat.filter(f => { const k = f.abs + ':' + f.midi; if (seen.has(k)) return false; seen.add(k); return true; });

  const total = part.bars.length * 16;
  flat = flat.filter(f => f.abs >= 0 && f.abs < total);
  const onsets = [...new Set(flat.map(f => f.abs))].sort((a, b) => a - b);
  const nextOf = {};
  onsets.forEach((o, i) => { nextOf[o] = onsets[i + 1] ?? total; });
  const spread = cfg.humanize === false ? 0 : 6;
  // 'grid' pins onsets and note ends to a subdivision. Without it, lengths are the gap
  // minus a fixed release, so ends land between the lines — musical, but it can read as sloppy.
  const GRID_Q = { '16': 1, '8': 2, '4': 4, 'triool': 4 / 3, 'triool16': 2 / 3 };
  const gridQ = GRID_Q[cfg.grid] || 0;
  const swing = gridQ ? 0 : Math.max(0, Math.min(0.6, cfg.swing || 0));
  const drift = (!gridQ && cfg.timingHumanize) ? Math.round(TICK16 * 0.06) : 0;
  const art = cfg.articulation || 'auto';
  const events = flat.map(f => {
    const span = Math.max(0.25, nextOf[f.abs] - f.abs);
    const declared = (typeof f.len === 'number' && f.len > 0) ? f.len : null;
    let lenSteps;
    const base = declared != null ? declared : span;
    if (cfg.sustain) lenSteps = span;
    else if (art === 'legato') lenSteps = base - 0.05;
    else if (art === 'staccato') lenSteps = Math.min(base, 1) - 0.25;
    else if (art === 'groove') lenSteps = base >= 3 ? base - 0.35 : base * 0.5;
    else lenSteps = base - (cfg.release ?? 0.45);
    lenSteps = Math.max(0.2, lenSteps);
    if (gridQ) lenSteps = Math.max(gridQ, Math.round(lenSteps / gridQ) * gridQ);
    let tick = f.abs * TICK16;
    if (swing && (f.abs % 2 === 1)) tick += Math.round(swing * TICK16 * 0.5);
    if (drift) tick += Math.round(rng.range(-drift, drift));
    tick = Math.max(0, Math.min(total * TICK16 - 1, Math.round(tick)));
    return {
      tick,
      dur: Math.min(total * TICK16 - tick, Math.max(30, Math.round(lenSteps * TICK16))),
      midi: f.midi,
      vel: f.velocity != null ? f.velocity : Math.max(28, Math.min(127,
            accentVelocity(f.abs % 16, rng, cfg.velBase ?? 100, spread)
            + (declared != null ? Math.round(Math.min(3, declared)) - 2 : 0))),
    };
  });
  events.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
  // no same-pitch overlap: trim the earlier note so its note-off cannot cut the next one
  const lastByPitch = new Map();
  events.slice().sort((a, b) => a.tick - b.tick).forEach(e => {
    const prev = lastByPitch.get(e.midi);
    if (prev && prev.tick + prev.dur > e.tick) {
      prev.dur = Math.max(1, e.tick - prev.tick - (gridQ ? 0 : 1));
    }
    lastByPitch.set(e.midi, e);
  });
  // Bass and screech are monophonic phrases, including when pitches change.
  if (cfg.kind === 'bass' || cfg.kind === 'screech') {
    for (let i=0;i<events.length-1;i++) if(events[i].tick+events[i].dur>events[i+1].tick)
      events[i].dur=Math.max(1,events[i+1].tick-events[i].tick);
  }
  return events;
}

/* ============================================================
   MIDI FILE WRITER (SMF type 1)
   ============================================================ */
function vlq(n) {
  const bytes = [n & 0x7F];
  n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7F) | 0x80); n >>= 7; }
  return bytes;
}
function strBytes(s) { return Array.from(s).map(c => c.charCodeAt(0) & 0xFF); }
function chunk(id, data) {
  const len = data.length;
  return strBytes(id).concat([(len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255], data);
}
function trackChunk(name, events, tempo, extra = {}) {
  let data = [];
  const nm = strBytes(name).slice(0, 120);
  data = data.concat(vlq(0), [0xFF, 0x03, nm.length], nm);
  if (tempo) {
    const mpq = Math.round(60000000 / tempo);
    data = data.concat(vlq(0), [0xFF, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255]);
    data = data.concat(vlq(0), [0xFF, 0x58, 0x04, 4, 2, 24, 8]);
  }
  const list = [];
  events.forEach(e => {
    list.push({ t: e.tick, type: 1, midi: e.midi, vel: e.vel });
    list.push({ t: e.tick + e.dur, type: 0, midi: e.midi, vel: 0 });
  });
  list.sort((a, b) => a.t - b.t || a.type - b.type);
  let last = 0;
  const ch = extra.channel ?? 0;
  list.forEach(ev => {
    data.push(...vlq(Math.max(0, ev.t - last)));
    data.push((ev.type ? 0x90 : 0x80) | ch, ev.midi & 127, ev.type ? ev.vel : 0);
    last = ev.t;
  });
  data = data.concat(vlq(Math.max(0, (extra.endTick || last) - last)), [0xFF, 0x2F, 0x00]);
  return chunk('MTrk', data);
}
function buildMidi(tracks, tempo, totalTicks = 0) {
  const n = tracks.length + 1;
  const header = chunk('MThd', [0, 1, (n >> 8) & 255, n & 255, (TPQ >> 8) & 255, TPQ & 255]);
  let out = header.concat(trackChunk('Tempo', [], tempo, {endTick:totalTicks}));
  const channels = [0,1,2,3,4,5,6,7,8,10,11,12,13,14,15];
  let melodicIndex=0;
  tracks.forEach(t => { const ch=t.id==='drums'||t.name==='Drums'?9:channels[melodicIndex++ % channels.length]; out = out.concat(trackChunk(t.name, t.events, null, { channel: ch, endTick:totalTicks })); });
  return Uint8Array.from(out);
}

/* ============================================================
   PART REGISTRY
   ============================================================ */
const EXTRAS = {
  kick: [{ key: 'tonal', label: 'Toonhoogte volgt het akkoord', def: true },
         { key: 'rolls', label: 'Roll in de vierde maat', def: true }],
  bass: [{ key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'avoidKick', label: 'Wijkt voor de kick', def: true },
         { key: 'movement', label: 'Beweging op de turnaround', def: true },
         { key: 'octaveJump', label: 'Octaafsprongen', def: false }],
  pad:  [{ key: 'followChords', label: 'Zelfde akkoorden als Chords', def: false }],
  arp:  [{ key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'gaps', label: 'Gaten laten vallen', def: true },
         { key: 'rise', label: 'Octaaf omhoog in tweede helft', def: false },
         { key: 'eighths', label: 'Achtsten in plaats van zestienden', def: false }],
  drums: [{ key: 'fills', label: 'Fill in de vierde maat', def: true },
           { key: 'noDoubleKick', label: 'Geen kick als de Kick-partij aanstaat', def: true }],
  screech: [{ key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'density', label: 'Dichtheid', options: ['sober', 'normaal', 'dicht'], def: 'normaal' },
            { key: 'phrase', label: 'Frase • nieuwe stijlen', options: ['fixed', 'call-response', 'evolving'], def: 'fixed' },
            { key: 'motion', label: 'Toonbeweging • nieuwe stijlen', options: ['root', 'tonal', 'rising', 'falling'], def: 'root' },
            { key: 'followChords', label: 'Volgt het akkoordenschema', def: false },
            { key: 'wander', label: 'Meer notenwisseling', def: false },
            { key: 'octaveAccent', label: 'Octaafaccenten', def: false }],
  lead: [{ key: 'anchorDownbeat', label: 'Altijd een noot op tel 1', def: false },
         { key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'dyad', label: 'Dubbele noten', options: ['uit', 'terts', 'kwart', 'kwint', 'octaaf'], def: 'uit' },
         { key: 'colour', label: 'Kleurnoten toestaan (none, kwart)', def: true },
         { key: 'displace', label: 'Motief ritmisch verschuiven', def: true },
         { key: 'tension', label: 'Chromatische aanloopnoten', def: false }],
  melody: [{ key: 'anchorDownbeat', label: 'Altijd een noot op tel 1', def: false },
         { key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'colour', label: 'Kleurnoten toestaan', def: true }],
  pluck: [{ key: 'anchorDownbeat', label: 'Altijd een noot op tel 1', def: false },
         { key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'dyad', label: 'Dubbele noten', options: ['uit', 'terts', 'kwart', 'kwint', 'octaaf'], def: 'uit' },
          { key: 'colour', label: 'Kleurnoten toestaan', def: true },
          { key: 'displace', label: 'Motief ritmisch verschuiven', def: false }],
  chords: [{ key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'bassNote', label: 'Grondtoon een octaaf lager erbij', def: false },
           { key: 'followLead', label: 'Zelfde ritme als de lead', def: false }],
  darkmelody: [{ key: 'grid', label: 'Raster', options: ['los', '16', '8', '4', 'triool', 'triool16'], def: 'los' },
         { key: 'chromatic', label: 'Chromatische buurnoten', def: true },
               { key: 'followChords', label: 'Volgt het akkoordenschema', def: false }],
  harmony: [{ key: 'sixths', label: 'Sext in plaats van terts', def: false }],
};
const PART_DEFS = {
  drums:  { label: 'Drums',  colour: '#9AA9BC', centre: 0,  span: 0,  gate: 0.45, velBase: 104, styles: 'drums', fixedPitch: true },
  kick:   { label: 'Kick',   colour: '#F1AC75', centre: 33, span: 7,  gate: 0.90, velBase: 112, styles: 'kick' },
  bass:   { label: 'Bass',   colour: '#67C5F0', centre: 40, span: 8,  gate: 0.55, velBase: 100, styles: 'bass' },
  chords: { label: 'Chords', colour: '#E2CC78', centre: 60, span: 10, gate: 0.95, velBase: 104, styles: 'chords', sustain: true },
  pad:    { label: 'Pad',    colour: '#A692E8', centre: 64, span: 12, gate: 1.00, velBase: 100, styles: 'pad',    sustain: true },
  screech:{ label: 'Screech',colour: '#F784A5', centre: 71, span: 9,  gate: 0.90, velBase: 80, styles: 'screech', release: 0.45 },
  lead:   { label: 'Lead',   colour: '#C0ED7B', centre: 72, span: 12, gate: 0.90, velBase: 104, styles: 'lead',   melodic: true },
  darkmelody:{label:'Dark melody', colour:'#B7A1E8', centre: 67, span: 12, gate: 0.75, velBase: 98, styles: 'darkmelody', release: 0.5 },
  harmony:{ label: 'Harmony',colour: '#8CDDAD', centre: 68, span: 12, gate: 0.90, velBase: 96,  styles: 'lead' },
  melody: { label: 'Melody', colour: '#ECD6A0', centre: 74, span: 11, gate: 0.95, velBase: 98,  styles: 'melody', melodic: true, maxDegStep: 2 },
  pluck:  { label: 'Pluck',  colour: '#74D9B5', centre: 76, span: 12, gate: 0.35, velBase: 96,  styles: 'pluck',  melodic: true },
  arp:    { label: 'Arp',    colour: '#74D6DA', centre: 74, span: 19, gate: 0.55, velBase: 86,  styles: 'arp' },
};
const GENRES = [
  { id: 'free', label: 'Vrij', free: true, note: 'geen voorinstelling — alles zelf' },

  { id: 'rawstyle', label: 'Rawstyle', bpm: 155, scale: 'phrygian', chordBars: 1, chordSize: 3, swing: 0,
    progressions: ['phryg', 'darkloop', 'andalusian'],
    note: 'screech op één noot, offbeat bas, tonale kick',
    parts: {
      drums: { style: 'hardstyle' }, kick: { style: 'quarters' },
      bass: { style: 'offbeat' }, chords: { style: 'offstab' },
      screech: { style: 'klassiek', opts: { density: 'normaal', octaveAccent: true } },
      lead: { style: 'tresillo', articulation: 'groove', opts: { colour: true, displace: true } },
    },
    energy: { kalm: ['kick', 'bass', 'screech'], normaal: ['drums', 'kick', 'bass', 'screech'], vol: ['drums', 'kick', 'bass', 'chords', 'screech', 'lead'] } },

  { id: 'rawphoric', label: 'Rawphoric', bpm: 150, scale: 'aeolian', chordBars: 2, chordSize: 3, swing: 0,
    progressions: ['euphoric', 'descent', 'lift', 'drama'],
    note: 'lead met harmonie, akkoorden op hetzelfde ritme, aangehouden bas',
    parts: {
      bass: { style: 'heel' }, pad: { style: 'whole', opts: { followChords: true } },
      chords: { opts: { followLead: true } },
      lead: { style: 'tresillo', articulation: 'auto', opts: { colour: true, displace: true } },
      harmony: {}, drums: { style: 'hardstyle' },
    },
    energy: { kalm: ['bass', 'pad', 'lead'], normaal: ['bass', 'pad', 'chords', 'lead', 'harmony'], vol: ['drums', 'bass', 'pad', 'chords', 'lead', 'harmony'] } },

  { id: 'gabber', label: 'Gabber', bpm: 180, scale: 'phrygianDominant', chordBars: 1, chordSize: 3, swing: 0,
    progressions: ['phryg', 'darkloop', 'pedal'],
    note: 'korte stabs die wel van noot wisselen, rollende kick',
    parts: {
      drums: { style: 'uptempo' }, kick: { style: 'rolling' },
      bass: { style: 'sixteenth' },
      screech: { style: 'hakkend', articulation: 'staccato', opts: { density: 'dicht', wander: true, followChords: true, octaveAccent: true } },
      lead: { style: 'stab', articulation: 'staccato', opts: { colour: false, displace: true, tension: true } },
    },
    energy: { kalm: ['kick', 'screech'], normaal: ['drums', 'kick', 'bass', 'screech'], vol: ['drums', 'kick', 'bass', 'screech', 'lead'] } },

  { id: 'frenchcore', label: 'Frenchcore', bpm: 205, scale: 'phrygian', chordBars: 2, chordSize: 3, swing: 0,
    progressions: ['pedal', 'phryg', 'darkloop'],
    note: 'doorlopende tonale kickroll, dichte screech',
    parts: {
      kick: { style: 'frenchcore' }, drums: { style: 'uptempo' },
      bass: { style: 'sixteenth' },
      screech: { style: 'rollend', opts: { density: 'dicht', octaveAccent: true } },
      darkmelody: { style: 'dringend' },
    },
    energy: { kalm: ['kick', 'screech'], normaal: ['kick', 'bass', 'screech'], vol: ['drums', 'kick', 'bass', 'screech', 'darkmelody'] } },

  { id: 'hardtechno', label: 'Hardtechno', bpm: 150, scale: 'minorPent', chordBars: 4, chordSize: 3, swing: 0,
    progressions: ['pedal', 'twochord'],
    note: 'één akkoord, hypnotische arp, doorlopende achtstenbas',
    parts: {
      drums: { style: 'techno' }, bass: { style: 'eighths' },
      arp: { style: 'walk', opts: { gaps: true } },
      screech: { style: 'kaal', opts: { density: 'sober' } },
      pad: { style: 'twobar' },
    },
    energy: { kalm: ['drums', 'bass'], normaal: ['drums', 'bass', 'arp'], vol: ['drums', 'bass', 'arp', 'screech', 'pad'] } },

  { id: 'house', label: 'House', bpm: 125, scale: 'dorian', chordBars: 2, chordSize: 4, swing: 14,
    progressions: ['twochord', 'minorswing', 'pedal', 'darkloop'],
    note: 'dubbele noten en frasen die over de maatstreep heen lopen',
    parts: {
      drums: { style: 'techno' }, bass: { style: 'offbeat', articulation: 'groove' },
      chords: { style: 'charleston' }, pad: { style: 'twobar', opts: { followChords: true } },
      lead: { style: 'overmaat6', articulation: 'groove', opts: { dyad: 'kwint', colour: true, displace: false } },
      pluck: { style: 'skip', opts: { dyad: 'terts' } },
    },
    energy: { kalm: ['drums', 'bass', 'chords'], normaal: ['drums', 'bass', 'chords', 'lead'], vol: ['drums', 'bass', 'chords', 'pad', 'lead', 'pluck'] } },

  { id: 'melodictechno', label: 'Melodic techno', bpm: 124, scale: 'aeolian', chordBars: 4, chordSize: 4, swing: 0,
    progressions: ['darkloop', 'minorswing', 'twochord'],
    note: 'trage harmonie, wandelende arp, donkere melodie',
    parts: {
      drums: { style: 'minimal' }, bass: { style: 'eighths' },
      pad: { style: 'twobar' }, arp: { style: 'walk' },
      darkmelody: { style: 'traag' }, pluck: { style: 'steady8' },
    },
    energy: { kalm: ['bass', 'pad'], normaal: ['drums', 'bass', 'pad', 'arp'], vol: ['drums', 'bass', 'pad', 'arp', 'darkmelody', 'pluck'] } },

  { id: 'euphoric', label: 'Euphoric hardstyle', bpm: 150, scale: 'aeolian', chordBars: 1, chordSize: 3, swing: 0,
    progressions: ['euphoric', 'lift', 'descent'],
    note: 'zangerige lead, reverse bass, pompende akkoorden',
    parts: {
      kick: { style: 'quarters' }, drums: { style: 'hardstyle' },
      bass: { style: 'offbeat' }, chords: { style: 'pumped' },
      melody: { style: 'phrased' }, lead: { style: 'longshort', articulation: 'auto' }, pad: { style: 'whole' },
    },
    energy: { kalm: ['bass', 'pad', 'melody'], normaal: ['kick', 'bass', 'chords', 'melody'], vol: ['drums', 'kick', 'bass', 'chords', 'pad', 'melody', 'lead'] } },
];
GENRES.push(
  {id:'dubstep',label:'Dubstep',bpm:140,scale:'phrygian',chordBars:2,chordSize:3,swing:0,
   progressions:['pedal','phryg','darkloop'], note:'140 BPM · halftime snare op 3 · ruimte voor bass sound design',
   parts:{drums:{style:'dubstep'},bass:{style:'dubspace',opts:{avoidKick:false}},screech:{style:'callresponse',opts:{density:'normaal',motion:'root'}},pad:{style:'whole'}},
   energy:{kalm:['drums','bass'],normaal:['drums','bass','screech'],vol:['drums','bass','screech','pad']}},
  {id:'dnb',label:'Drum & bass',bpm:174,scale:'aeolian',chordBars:2,chordSize:3,swing:0,
   progressions:['darkloop','twochord','pedal'],note:'174 BPM · two-step drums · gesyncopeerde bas',
   parts:{drums:{style:'dnb'},bass:{style:'dnb',opts:{avoidKick:false}},pad:{style:'whole'},lead:{style:'stab'},screech:{style:'broken'}},
   energy:{kalm:['drums','bass'],normaal:['drums','bass','pad'],vol:['drums','bass','pad','lead','screech']}},
  {id:'liquid',label:'Liquid DnB',bpm:172,scale:'dorian',chordBars:2,chordSize:4,swing:0,
   progressions:['minorswing','twochord','darkloop'],note:'172 BPM · ghost-snares · lange subnoten en warme septiemen',
   parts:{drums:{style:'liquid'},bass:{style:'reese',opts:{avoidKick:false}},chords:{style:'offstab'},pad:{style:'whole',opts:{followChords:true}},pluck:{style:'skip'}},
   energy:{kalm:['bass','pad'],normaal:['drums','bass','pad','chords'],vol:['drums','bass','pad','chords','pluck']}},
  {id:'ukgarage',label:'UK garage',bpm:132,scale:'dorian',chordBars:2,chordSize:4,swing:28,
   progressions:['minorswing','twochord'],note:'132 BPM · 2-step drums · swing en korte akkoordstabs',
   parts:{drums:{style:'ukg'},bass:{style:'ukg',opts:{avoidKick:false}},chords:{style:'charleston'},pluck:{style:'skip'}},
   energy:{kalm:['drums','bass'],normaal:['drums','bass','chords'],vol:['drums','bass','chords','pluck']}},
  {id:'neuro',label:'Neurofunk',bpm:174,scale:'phrygian',chordBars:4,chordSize:3,swing:0,
   progressions:['pedal','phryg'],note:'174 BPM · strakke two-step · donkere call-and-response frases',
   parts:{drums:{style:'dnb'},bass:{style:'reese',opts:{avoidKick:false}},screech:{style:'machine',opts:{density:'dicht',motion:'tonal'}},darkmelody:{style:'syncoop'}},
   energy:{kalm:['drums','bass'],normaal:['drums','bass','screech'],vol:['drums','bass','screech','darkmelody']}}
);
STYLES.bass.push(
 {id:'disco',label:'Disco • octave groove',steps:[0,2,3,6,8,10,11,14],lens:[1.5,.7,.7,1.5,1.5,.7,.7,1.5],w:2,note:'gesyncopeerde octaafbas met ruimte tussen de noten'},
 {id:'italo',label:'Italo • octave engine',steps:[0,2,4,6,8,10,12,14],lens:[1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5],w:2,note:'strakke achtsten, afwisselende octaven'}
);
STYLES.drums.push({id:'disco',label:'Disco • four-on-floor',w:2,note:'kwartkick, snare/clap op 2 en 4, open offbeat hats'});
GENRES.push(
 {id:'disco',label:'Disco',bpm:118,scale:'dorian',chordBars:2,chordSize:4,swing:10,progressions:['minorswing','twochord'],note:'118 BPM · funky octaafbas · septiemstabs en open hats',parts:{drums:{style:'disco'},bass:{style:'disco',opts:{octaveJump:true,avoidKick:false}},chords:{style:'charleston'},pluck:{style:'skip'},pad:{style:'whole'}},energy:{kalm:['drums','bass'],normaal:['drums','bass','chords'],vol:['drums','bass','chords','pluck','pad']}},
 {id:'italo',label:'Italo disco',bpm:122,scale:'aeolian',chordBars:2,chordSize:3,swing:0,progressions:['euphoric','darkloop'],note:'122 BPM · sequencerbas · analoge akkoorden en arpeggio',parts:{drums:{style:'disco'},bass:{style:'italo',opts:{octaveJump:true,avoidKick:false,movement:false}},chords:{style:'pumped'},arp:{style:'up'},pad:{style:'whole'},lead:{style:'longshort'}},energy:{kalm:['drums','bass','pad'],normaal:['drums','bass','chords','arp'],vol:['drums','bass','chords','arp','pad','lead']}}
);
const ENERGY = ['kalm', 'normaal', 'vol'];

const ARTICULATIONS = [
  { id: 'auto', label: 'Automatisch' },
  { id: 'groove', label: 'Grillig' },
  { id: 'legato', label: 'Legato' },
  { id: 'staccato', label: 'Staccato' },
];
const GRID_LOCK = { '16': 1, '8': 1, '4': 1, 'triool': 1, 'triool16': 1 };
const PART_ORDER = ['drums', 'kick', 'bass', 'chords', 'pad', 'lead', 'harmony', 'screech', 'darkmelody', 'melody', 'pluck', 'arp'];

function generateSection(params) {
  const scaleDef = SCALES[params.scale] || SCALES.aeolian;
  const scaleSteps = scaleDef.steps;
  const rootMidi = 12 * (params.octave ?? 5) + (params.root || 0);
  const progDef = PROGRESSIONS.find(p => p.id === params.progression) || PROGRESSIONS[0];
  let prog = progDef.degs;
  const hold = Math.max(1, Math.min(4, params.chordBars || 1));
  if (hold > 1) prog = prog.flatMap(d => Array(hold).fill(d));
  const bars = Math.max(1, params.bars || 8);
  const chordSize = Math.max(2, Math.min(5, params.chordSize || 3));
  const common = { scaleSteps, rootMidi, prog, bars, chordSize };
  const out = {
    parts: [],
    meta: { progression: progDef, seed: params.seed, bars, bpm: params.bpm, scale: scaleDef, root: params.root || 0 }
  };

  let leadCache = null, chordCache = null, kickCache = null;
  const needChords = params.parts.includes('pad') && params.partOpts && params.partOpts.pad &&
    params.partOpts.pad.opts && params.partOpts.pad.opts.followChords;
  const needLead = params.parts.includes('harmony') ||
    (params.parts.includes('chords') && params.partOpts && params.partOpts.chords &&
     params.partOpts.chords.opts && params.partOpts.chords.opts.followLead);
  // the lead has to exist before anything can borrow its rhythm
  // dependency order: the lead feeds the chords, the chords feed the pad
  const deps = ['kick', 'lead', 'chords'];
  const needKick = params.parts.includes('drums') || params.parts.includes('bass');
  let order = params.parts.slice();
  if (needChords && !order.includes('chords')) order.push('chords');
  if (needLead && !order.includes('lead')) order.push('lead');
  if (needKick && params.parts.includes('kick') && !order.includes('kick')) order.push('kick');
  order = [...deps.filter(d => order.includes(d)), ...order.filter(x => !deps.includes(x))];
  const emit = new Set(params.parts);

  for (const id of order) {
    const def = PART_DEFS[id];
    if (!def) continue;
    const user = (params.partOpts && params.partOpts[id]) || {};
    const bank = STYLES[def.styles];
    const forcedRhythm = user.style ? bank.find(s => s.id === user.style) : null;
    const octaveOffset = user.octave || 0;
    const rng = RNG.make(String(params.seed) + ':' + id + ':' + (user.vary || 0));
    const ex = {};
    (EXTRAS[id] || []).forEach(o => {
      const given = user.opts && Object.prototype.hasOwnProperty.call(user.opts, o.key) ? user.opts[o.key] : undefined;
      if (o.options) ex[o.key] = (given != null && o.options.includes(given)) ? given : o.def;
      else ex[o.key] = given !== undefined ? !!given : o.def;
    });
    const cfg = {
      ...common, ...def, kind: id, forcedRhythm, ...ex,
      humanize: params.humanize !== false,
      articulation: user.articulation || 'auto',
      timingHumanize: !!params.timingHumanize,
      swing: params.swing || 0,
      rate: params.arpRate || 1,
      maxSpan: def.span + 2,
    };
    if (id === 'harmony' || (id === 'chords' && ex.followLead)) cfg.leadPart = leadCache;
    cfg.rootMidi = rootMidi;
    if (id === 'pad' && ex.followChords && chordCache) cfg.chordVoicings = chordCache;
    if ((id === 'drums' || id === 'bass') && kickCache) cfg.kickOnsets = kickOnsetSet(kickCache);
    let part;
    if (id === 'harmony') {
      part = leadCache ? harmonise(leadCache, cfg, ex.sixths ? 5 : 2)
                       : bestMelodic(rng, { ...cfg, kind: 'lead' }, params.tries || 100);
    }
    else if (id === 'darkmelody') part = generateDarkMelody(rng, cfg);
    else if (def.melodic) {
      const st = user.style ? STYLES[def.styles].find(x => x.id === user.style) : null;
      part = (st && st.span) ? generatePhased(rng, { ...cfg, forcedRhythm: st })
                             : bestMelodic(rng, cfg, params.tries || 100);
    }
    else if (id === 'bass') part = generateBass(rng, cfg);
    else if (id === 'chords' || id === 'pad') part = generateChords(rng, cfg);
    else if (id === 'kick') part = generateKick(rng, cfg);
    else if (id === 'arp') part = generateArp(rng, cfg);
    else if (id === 'drums') part = generateDrums(rng, cfg);
    else if (id === 'screech') part = generateScreech(rng, cfg);
    else continue;

    if (!def.fixedPitch) {
      const spanUsed = def.span + (ex.octaveJump ? 12 : 0) + (ex.rise ? 12 : 0) + (id === 'screech' && ex.octaveAccent ? 12 : 0);
      fitRegister(part, def.centre + octaveOffset * 12, spanUsed);
    }
    const dyadMap = { terts: 2, kwart: 3, kwint: 4, octaaf: 7 };
    if (ex.dyad && ex.dyad !== 'uit' && dyadMap[ex.dyad] != null) addDyad(part, cfg, dyadMap[ex.dyad]);
    if (id === 'lead') leadCache = part;
    if (id === 'chords') chordCache = part;
    if (id === 'kick') kickCache = part;
    if (!emit.has(id)) continue;
    const events = renderPart(part, cfg, rng);
    out.parts.push({ id, label: def.label, colour: def.colour, part, events, cfg, gridLocked: !!GRID_LOCK[cfg.grid] });
  }
  out.parts.sort((a, b) => PART_ORDER.indexOf(a.id) - PART_ORDER.indexOf(b.id));
  return out;
}

/* ============================================================
   ARRANGEMENT — several sections of the same material in a row
   ============================================================ */
const STRUCTURES = [
  { id: 'short', label: 'Kort (32 maten)', sections: [
    { id: 'intro',     label: 'Intro',     bars: 8,  energy: 'kalm' },
    { id: 'buildup',   label: 'Buildup',   bars: 8,  energy: 'normaal', riser: true },
    { id: 'drop',      label: 'Drop',      bars: 16, energy: 'vol' },
  ] },
  { id: 'full', label: 'Volledig (64 maten)', sections: [
    { id: 'intro',     label: 'Intro',     bars: 8,  energy: 'kalm' },
    { id: 'buildup',   label: 'Buildup',   bars: 8,  energy: 'normaal', riser: true },
    { id: 'drop',      label: 'Drop',      bars: 16, energy: 'vol' },
    { id: 'breakdown', label: 'Breakdown', bars: 8,  energy: 'kalm', melodic: true },
    { id: 'buildup2',  label: 'Buildup 2', bars: 8,  energy: 'normaal', riser: true },
    { id: 'drop2',     label: 'Drop 2',    bars: 16, energy: 'vol' },
  ] },
  { id: 'dropOnly', label: 'Alleen drop (16 maten)', sections: [
    { id: 'drop', label: 'Drop', bars: 16, energy: 'vol' },
  ] },
];

// which parts a section uses, given a genre (or the parts the user picked when running free)
const PERCUSSIVE = ['kick', 'drums', 'screech'];
const MELODIC_CHOICE = ['melody', 'darkmelody', 'lead', 'pluck', 'arp'];
function sectionParts(genre, section, fallbackParts) {
  const known = genre && genre.parts ? Object.keys(genre.parts) : fallbackParts;
  let list = (genre && genre.energy && genre.energy[section.energy])
    ? genre.energy[section.energy].slice()
    : fallbackParts.slice();

  if (section.melodic) {
    // a breakdown drops the percussion and needs something to carry it
    list = list.filter(p => !PERCUSSIVE.includes(p));
    ['pad', 'chords'].forEach(p => { if (known.includes(p) && !list.includes(p)) list.push(p); });
    if (!list.some(p => MELODIC_CHOICE.includes(p))) {
      const pick = MELODIC_CHOICE.find(p => known.includes(p)) || 'melody';
      list.push(pick);
    }
    if (!list.includes('bass')) list.push('bass');
  }
  if (section.riser && !list.includes('arp')) list.push('arp');
  return [...new Set(list)].filter(id => fallbackParts.includes(id));
}

function generateArrangement(params, structureId, genre) {
  const st = STRUCTURES.find(x => x.id === structureId) || STRUCTURES[0];
  const tracks = new Map();   // label -> { id, label, colour, events }
  const marks = [];
  let barCursor = 0;

  st.sections.forEach((sec, si) => {
    const parts = sectionParts(genre, sec, params.parts);
    const partOpts = JSON.parse(JSON.stringify(params.partOpts || {}));
    parts.forEach(pid => {
      partOpts[pid] = partOpts[pid] || JSON.parse(JSON.stringify((genre && genre.parts && genre.parts[pid]) || {}));
      partOpts[pid].opts = partOpts[pid].opts || {};
      partOpts[pid].vary = (partOpts[pid].vary || 0) + si;      // each section is a variation, not a copy
      if (sec.riser) {
        if (pid === 'arp') { partOpts[pid].style = 'walk'; partOpts[pid].opts.rise = true; }
        if (pid === 'drums') partOpts[pid].style = 'riser';
      }
      if (sec.energy === 'kalm' && pid === 'screech') partOpts[pid].opts.density = 'sober';
    });
    const sub = generateSection({ ...params, bars: sec.bars, parts, partOpts, seed: params.seed + ':' + sec.id });
    const offset = barCursor * 4 * TPQ;
    sub.parts.forEach(p => {
      if (!tracks.has(p.label)) tracks.set(p.label, { id: p.id, label: p.label, colour: p.colour, events: [] });
      const t = tracks.get(p.label);
      p.events.forEach(e => t.events.push({ ...e, tick: e.tick + offset }));
    });
    marks.push({ bar: barCursor, label: sec.label, bars: sec.bars });
    barCursor += sec.bars;
  });

  // sections are rendered separately, so a note held to the end of one can overlap the next
  tracks.forEach(t => {
    t.events.sort((a, b) => a.tick - b.tick || a.midi - b.midi);
    const last = new Map();
    t.events.forEach(e => {
      const prev = last.get(e.midi);
      if (prev && prev.tick + prev.dur > e.tick) prev.dur = Math.max(1, e.tick - prev.tick - 1);
      last.set(e.midi, e);
    });
    const seen = new Set();
    t.events = t.events.filter(e => { const k = e.tick + ':' + e.midi; if (seen.has(k)) return false; seen.add(k); return true; });
  });

  const order = [...tracks.values()].sort((a, b) => PART_ORDER.indexOf(a.id) - PART_ORDER.indexOf(b.id));
  return {
    parts: order.map(t => ({ id: t.id, label: t.label, colour: t.colour, events: t.events, part: { bars: [] } })),
    meta: { bars: barCursor, bpm: params.bpm, marks, structure: st,
            progression: (PROGRESSIONS.find(p => p.id === params.progression) || PROGRESSIONS[0]),
            seed: params.seed, scale: SCALES[params.scale] || SCALES.aeolian, root: params.root || 0 },
    arrangement: true,
  };
}

/* ============================================================
   STUDIO TOOLS — not generation, but what you do with the result
   ============================================================ */
function noteFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// fundamentals for tuning a kick or sub to the key
function kickTuning(rootPc) {
  const out = [];
  for (let m = rootPc + 12; m <= rootPc + 60; m += 12) {
    out.push({ midi: m, name: midiName(m), hz: Math.round(noteFreq(m) * 10) / 10 });
  }
  return out;
}

function delayTimes(bpm) {
  const q = 60000 / bpm;
  const rows = [
    ['1/1', 4], ['1/2', 2], ['1/4', 1], ['1/8', 0.5], ['1/16', 0.25], ['1/32', 0.125],
  ];
  return rows.map(([label, mult]) => ({
    label,
    straight: Math.round(q * mult * 10) / 10,
    dotted: Math.round(q * mult * 1.5 * 10) / 10,
    triplet: Math.round(q * mult * (2 / 3) * 10) / 10,
  }));
}

const CAMELOT_MINOR = { 8: 1, 3: 2, 10: 3, 5: 4, 0: 5, 7: 6, 2: 7, 9: 8, 4: 9, 11: 10, 6: 11, 1: 12 };
const CAMELOT_MAJOR = { 11: 1, 6: 2, 1: 3, 8: 4, 3: 5, 10: 6, 5: 7, 0: 8, 7: 9, 2: 10, 9: 11, 4: 12 };
function camelot(rootPc, scaleId) {
  const major = scaleId === 'ionian';
  const num = (major ? CAMELOT_MAJOR : CAMELOT_MINOR)[((rootPc % 12) + 12) % 12];
  const letter = major ? 'B' : 'A';
  const wrap = n => ((n - 1 + 12) % 12) + 1;
  const inv = obj => Object.fromEntries(Object.entries(obj).map(([pc, n]) => [n, +pc]));
  const minorByNum = inv(CAMELOT_MINOR), majorByNum = inv(CAMELOT_MAJOR);
  const label = (n, l) => n + l + ' — ' + NOTE_NAMES[l === 'A' ? minorByNum[n] : majorByNum[n]] + (l === 'A' ? ' mineur' : ' majeur');
  return {
    code: num + letter,
    self: label(num, letter),
    compatible: [
      label(wrap(num - 1), letter),
      label(wrap(num + 1), letter),
      label(num, letter === 'A' ? 'B' : 'A'),
    ],
  };
}

function spellScale(rootPc, scaleId) {
  const sc = SCALES[scaleId] || SCALES.aeolian;
  return sc.steps.map(st => NOTE_NAMES[(rootPc + st) % 12]);
}
function spellProgression(rootPc, scaleId, progId, chordSize) {
  const sc = SCALES[scaleId] || SCALES.aeolian;
  const prog = (PROGRESSIONS.find(p => p.id === progId) || PROGRESSIONS[0]);
  return prog.degs.map(d => {
    const pcs = chordDegrees(d, chordSize || 3).map(x => (rootPc + degToSemi(x, sc.steps)) % 12);
    const third = ((pcs[1] - pcs[0]) + 12) % 12;
    const quality = chordSize >= 4 ? (third === 3 ? 'm7' : 'maj7') : (third === 3 ? 'm' : third === 4 ? '' : 'dim');
    return { root: NOTE_NAMES[pcs[0]], quality, notes: pcs.map(pc => NOTE_NAMES[pc]) };
  });
}

/* ---------- handover document ---------- */
function buildNotesMd(st) {
  const cam = camelot(st.root, st.scale);
  const scaleName = (SCALES[st.scale] || SCALES.aeolian).name;
  const prog = PROGRESSIONS.find(p => p.id === st.progression) || PROGRESSIONS[0];
  const chords = spellProgression(st.root, st.scale, st.progression, st.chordSize);
  const L = [];
  L.push('# ' + (st.filename || 'MIDIROOM export'));
  L.push('');
  L.push('Gegenereerd met MIDIROOM, een regelgebaseerde MIDI-generator (geen model, geen API).');
  L.push('Dit bestand hoort bij de MIDI-export met dezelfde naam.');
  L.push('');
  L.push('## Muzikale gegevens');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| Toonsoort | ' + NOTE_NAMES[st.root] + ' ' + scaleName + ' |');
  L.push('| Camelot | ' + cam.code + ' |');
  L.push('| Tempo | ' + st.bpm + ' BPM |');
  L.push('| Maten | ' + st.bars + (st.structureLabel ? ' (' + st.structureLabel + ')' : '') + ' |');
  L.push('| Schema | ' + prog.label + ' |');
  L.push('| Akkoord duurt | ' + (st.chordBars || 1) + ' maat/maten |');
  L.push('| Akkoordopbouw | ' + (st.chordSize || 3) + ' noten |');
  L.push('| Swing | ' + (st.swing || 0) + '% |');
  L.push('| Genre-voorinstelling | ' + (st.genreLabel || 'vrij') + ' |');
  L.push('| Seed | `' + st.seed + '` |');
  L.push('');
  L.push('Toonladder: ' + spellScale(st.root, st.scale).join(' – '));
  L.push('');
  L.push('Akkoorden: ' + chords.map(c => c.root + c.quality + ' (' + c.notes.join('/') + ')').join('  →  '));
  L.push('');
  if (st.sections && st.sections.length) {
    L.push('## Secties');
    L.push('');
    L.push('| Maat | Sectie | Lengte |');
    L.push('|---|---|---|');
    st.sections.forEach(m => L.push('| ' + (m.bar + 1) + ' | ' + m.label + ' | ' + m.bars + ' maten |'));
    L.push('');
  }
  L.push('## Sporen in het MIDI-bestand');
  L.push('');
  L.push('| Spoor | Noten | Bereik | Stijl | Nootlengtes |');
  L.push('|---|---|---|---|---|');
  (st.tracks || []).forEach(t => {
    L.push('| ' + t.label + ' | ' + t.notes + ' | ' + t.range + ' | ' + (t.style || '—') + ' | ' + t.articulation + ' |');
  });
  L.push('');
  L.push('## Technisch');
  L.push('');
  L.push('- MIDI type 1, ' + TPQ + ' ticks per kwartnoot, elk spoor op een eigen kanaal.');
  L.push('- Het tempo staat in het bestand maar Ableton neemt dat niet over: zet de set zelf op ' + st.bpm + ' BPM.');
  L.push('- Drums volgen de standaard drum rack-indeling: C1 kick, D1 snare, D#1 clap, F#1 hihat, A#1 open hat.');
  L.push('- Velocities staan bewust vlak (rond ' + (st.velHint || 100) + '); accenten horen in het sounddesign te zitten.');
  L.push('');
  L.push('## Delaytijden bij ' + st.bpm + ' BPM (ms)');
  L.push('');
  L.push('| Deling | Recht | Gepunteerd | Triool |');
  L.push('|---|---|---|---|');
  delayTimes(st.bpm).forEach(r => L.push('| ' + r.label + ' | ' + r.straight + ' | ' + r.dotted + ' | ' + r.triplet + ' |'));
  L.push('');
  L.push('## Kick stemmen op deze toonsoort');
  L.push('');
  L.push(kickTuning(st.root).map(k => k.name + ' = ' + k.hz + ' Hz').join('  ·  '));
  L.push('');
  L.push('## Harmonisch mixen');
  L.push('');
  L.push('Deze track is ' + cam.self + '. Past op: ' + cam.compatible.join(', ') + '.');
  L.push('');
  L.push('## Om dit exact te reproduceren');
  L.push('');
  L.push('Open MIDIROOM en zet: toonsoort ' + NOTE_NAMES[st.root] + ' ' + scaleName + ', ' + st.bpm + ' BPM, schema ' + prog.label + ', seed `' + st.seed + '`.');
  if (st.url) { L.push(''); L.push('Of open deze link, die de hele instelling bevat:'); L.push(''); L.push('    ' + st.url); }
  L.push('');
  return L.join('\n');
}

if (typeof module !== 'undefined') {
  module.exports = { RNG, SCALES, PROGRESSIONS, STYLES, CONTOURS, PART_DEFS, PART_ORDER, EXTRAS, DRUM_MAP, ARTICULATIONS, GENRES, ENERGY, STRUCTURES, generateArrangement, noteFreq, kickTuning, delayTimes, camelot, spellScale, spellProgression, buildNotesMd,
                     generateSection, buildMidi, midiName, NOTE_NAMES, TPQ };
}
