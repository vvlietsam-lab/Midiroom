# MIDIROOM 2.0 — testverslag

Uitgevoerd op 10 september 2026, in Node.js 24 en headless Chromium 152 op Linux. De app werd als lokaal HTML-bestand geopend, zonder server of externe assets.

## Resultaten

| Controle | Omvang | Resultaat |
|---|---|---|
| Core-fuzztest | 8.000 generaties, 44.153 partijen, 5.974.700 noten | Geen overtredingen van de gecontroleerde MIDI-invarianten; geen lege partijen |
| Gerichte regressies | 396 generatieruns; 32.039 assertions | PASS |
| Screechdekking in regressies | 8 nieuwe stijlen × 30 configuraties, 10.540 noten | Geldige ticks, begrensde duur, monofonie en variatie |
| Bestaande DOM-suite | 400 willekeurige UI-acties/generaties + vaste scenario's | ALL PASS; nul opgevangen runtimefouten |
| Stijl-/genrebediening in DOM-suite | 121 stijlcombinaties; 42 genre/energieniveaus inclusief Vrij | Genereren en afspelen zonder fouten |
| Web Audio-modeltest | Envelopes, oscillatorplanning, stop/replay, looping, volume, suspended context | ALL PASS |
| Echte browser | 43 controles; 30 extra generaties | PASS; nul JavaScriptfouten en nul externe requests |
| Responsiviteit | Generator, Tools, Ideas, Check op 1440, 1024, 768 en 390 px | Geen documentbrede horizontale overflow |
| Referentiestatistiek | 8 instrument-/referentiegroepen | 8 statistische afwijkingen groter dan 45%; adviserend, geen afkeurende test |

## Wat is daadwerkelijk gecontroleerd?

- Nootbereik, duur, velocity, schaaltrouw waar van toepassing, dubbele noten, dezelfde-toonoverlap, nootstart binnen de clip en determinisme.
- Nieuwe screeches: monofonie over verschillende toonhoogtes; geen noten voorbij de clip; verschillende resultaten over seeds/instellingen.
- Dubstep-snare op tel 3; DnB-snare op 2/4 en een gebroken kickpatroon; liquid-ghostnotes met lage velocity.
- Echte triplets op 160/320 ticks; machine-stutters op 60 ticks bij 480 PPQ.
- Kwintakkoord als C–G in C mineur, zonder terts.
- Arrangementen respecteren de instrumentselectie; alle genre/energie/structuurcombinaties in de regressies zijn reproduceerbaar en leveren materiaal.
- MIDI-bytes onafhankelijk geparsed: MThd/MTrk, geldige eventstructuur, juist tempo, kanaal 10 voor drums, melodische kanalen buiten 10 en end-of-track op 8 maten.
- In de echte browser: instellingen openen zonder instrumenttoggle, genres, MIDI + notities downloaden, Web Audio starten/stoppen, volume 0, inactieve solo, take opslaan en na reload exact herstellen.
- Idea Bank-export/import, deduplicatie op ID, ongeldige import zonder gegevensverlies, seedtekst zonder HTML/scriptinjectie en Vrij behouden na reload.
- Lege instrumentselectie: playback uitgeschakeld en geen oude exportknoppen.
- Studio-tools gecontroleerd op een transpositie van 0 semitonen en stretch van 130 naar 174 BPM (74,71% duur).
- HTML-ID's zijn uniek en statische formulierlabels verwijzen naar bestaande controls.

## Performance

In de laatste Chromium-run duurden 30 generaties van een 8-maten Dubstep-preset gemiddeld **26 ms**, met **39 ms** als maximum. Dit is één concrete preset op deze testmachine. Het is geen claim voor ieder genre, iedere telefoon of 64-matenarrangementen met veel melodische partijen. De bestaande melodische kandidaatselectie kan bij zware configuraties langer duren.

## Grenzen van deze controles

De jsdom-audiotests simuleren Web Audio en kunnen geen geluidskwaliteit beoordelen. Aanvullend is echt Web Audio in Chromium gestart en gecontroleerd op bruikbare playbackstatus en volume; er is **geen menselijke luistersessie in Ableton of Serum uitgevoerd**.

De ingebouwde sounds zijn schetsklanken. Goede MIDI betekent niet automatisch goede sound design, een strakke mix of een professioneel arrangement. De referentietest is een vergelijking met de meegeleverde statistische targets, geen representatieve genrebenchmark. De acht afwijkingen zijn bewaard in het ruwe stijlrapport en niet weggepoetst door testgrenzen te verruimen.

Firefox, Safari, iOS en een daadwerkelijke Ableton-import zijn niet in deze omgeving getest. De code behoudt de bestaande iOS-audio-ontgrendeling. Een previewbreedte van 390 px test de lay-out, geen echte iPhone.

Idea Bank is browseropslag; export blijft nodig voor overdracht of archivering. Reproduceerbaarheid is versiegebonden.

## Reproduceren en bewijs

Commando's staan in README. `docs/test-results/` bevat de ruwe eindrapporten; `docs/screenshots/` bevat gecontroleerde browserweergaven. `test/browser.js` is optioneel en vereist Playwright/Chromium; de overige tests draaien met `npm ci` en `npm test`.
