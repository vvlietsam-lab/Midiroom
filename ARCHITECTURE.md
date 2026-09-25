# Architectuur — MIDIROOM 2.1

De basis uit 2.0 staat in `docs/archive/v2.0/ARCHITECTURE.md`.

## Productietoestand

Generatorstate blijft compatibel met bestaande URL-velden. Een nieuw veld `x` bevat mixerinstellingen, synthpatches en sectiedefinities. `cleanStudioState()` begrenst dit materiaal. Exacte clips staan alleen in undo/A-snapshots en Idea Bank, niet in de URL. `cleanClip()` valideert instrument-IDs, nootgetallen, duur, range en clipgrenzen; maximaal 50.000 noten per snapshot.

Idea Bank exporteert `{app:'MIDIROOM',version:3,ideas:[...]}`. Een idee heeft `state`, `clip`, `source`, `id`, `name` en `date`. v2-imports zonder clip vallen terug op generatie. Audio wordt nooit in dit formaat opgeslagen.

## Audio

De bestaande scheduler blijft eigenaar van preview-playback. Elke instrumentstem krijgt een gainbus en indien ondersteund een StereoPannerNode. Sound Lab vervangt voor geselecteerde melodische instrumenten de voice-functie in de queue. Nieuwe synthnoten lezen de actuele patch; reeds klinkende envelopes worden niet retroactief herschreven.

Sound Lab: 2 osc → lowpass → optionele waveshaper → amplitude envelope → instrumentbus → master/limiter. Nodes worden na afloop ontkoppeld. De vocal gebruikt een BufferSource en eigen gain, daarna dezelfde master. Starttijd is `anchor + offset`. De gegenereerde MIDI-tijdstippen zijn `seconden × BPM × 480 / 60`; in de scheduler volgt de inverse. Er is geen afzonderlijke timer voor vocal versus MIDI.

## Arrangement

`arrangeClip(source, sections)` herhaalt source-events binnen elke sectie en trimt nootduur op sectieranden. Een masker bepaalt welke instrumenten meedoen; een factor schaalt velocities naar 1–127. Maximaal 16 secties, ieder 1–32 maten, totaal 256. De bron blijft apart bewaard zodat klikken op 'Maak arrangement' niet telkens het vorige arrangement als bron verdubbelt.

## Vocalanalyse

Browser decoding → OfflineAudioContext mono/8 kHz → Float32Array naar een Blob Worker → analyse.

De eigen pitchschatter gebruikt een cumulatief genormaliseerde verschilfunctie, minima, interpolatie en median smoothing. Framing: 1024 samples, hop 160. Zoekgebied circa 65–650 Hz. Op basis van stabiele pitchwissels, onderbrekingen en amplitudeaanzetten worden segmenten gevormd. Een duurgewogen chromahistogram wordt gecorreleerd met 24 majeur/mineurprofielen; de top 3 wordt aangeboden.

De key-profielfamilie is de bekende Krumhansl-Schmuckler-aanpak, ook beschreven in de [music21 documentatie](https://music21.org/music21docs/moduleReference/moduleAnalysisDiscrete.html). MIDIROOM gebruikt hiervoor eigen JavaScript, niet music21 als dependency. De eigen segmentatie en zekerheidslabels zijn heuristisch en niet wetenschappelijk gekalibreerd.

`vocalMelodyEvents` maakt een lagere stem in de gekozen ladder, met dezelfde gevonden onset-seconden. De sparse-modus neemt om en om een segment. Deze functie voert geen akkoordherkenning, woordherkenning, source separation of beat-warp uit. Grenzen en testdekking staan in TEST_REPORT.

## Build

`build.js` verwijdert de CommonJS-export van core en vocal-engine, en voegt de inhoud met shell/theme/workspace/production samen tot één offline `index.html`. Blob Workers worden uit de inline analysefunctie opgebouwd. Er zijn geen CDN/runtime-netwerkafhankelijkheden.

## Interface 2.2

`src/daw.js` voegt globale transportbediening, een keyboard dialog, trackfilter en visuele zoom toe. De bestaande playback- en exportfuncties blijven de bron van waarheid. View-state wordt niet meegeschreven naar URL/Idea Bank. De canvas-resolutie volgt layoutwijzigingen via ResizeObserver.

## 2.3 sessie en compositie

`composer.js` bevat pure MIDI-transforms en zanggestuurde harmonie; `session.js` koppelt ze aan de UI. Opstartvolgorde: core + vocal-engine + composer, hoofdscript, workspace, production, daw, session, eerste generatie. De inspector gebruikt originele controls met gedeelde handlers. Vocal UI verplaatst naar een details-drawer binnen view-generator; tab-vocal opent die drawer. Raadpleeg HANDOVER voor bronserials, locks en exact herstel.
