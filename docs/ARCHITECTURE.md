# Architectuur — MIDIROOM 2.0

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/core.js` | Schalen, stijlbanken, genres, muzikale generatie, arrangementen, MIDI-writer, notities |
| `src/app-shell.html` | HTML-shell, bestaande UI-state, instrumentbediening, canvas, Web Audio en exports |
| `src/theme.css` | Moderne vormgeving, responsieve lay-out en interactiestaten |
| `src/workspace.js` | Tabnavigatie, invoervalidatie, Idea Bank, Studio Tools en MIDI Check |
| `build.js` | Vult de drie inline markers en schrijft `index.html` |
| `test/` | Fuzz, DOM, audio, referentiestatistiek, regressie en optionele browser-QA |

## Muzikale keten

1. Seed + instrument-ID + variatienummer maken een onafhankelijke PRNG.
2. Schaal en akkoordenschema bepalen de beschikbare toonhoogtes.
3. Stijlen bepalen ritme, nootlengtes en eventuele contour.
4. Melodische partijen evalueren kandidaten; nieuwe screeches gebruiken vaste frases met gecontroleerde antwoorden.
5. Registers worden afgestemd op instrument en octaafinstelling. Expliciete screech-octaafaccenten verruimen het toegestane bereik.
6. `renderPart` maakt afgeronde ticks, begrenst duur tot het clipeinde en verwijdert dezelfde-toonoverlap. Bass en Screech zijn ook over verschillende toonhoogtes monofonisch.
7. MIDI-export schrijft tempo/maatsoort, note-on/off en een gelijk eindtijdstip voor alle tracks.

Akkoorden van grootte 2 zijn grondtoon + diatonische kwint. Groottes 3–5 stapelen tertsen. De gekozen modus kan de kwint verminderen; die schaaltrouw blijft bewust behouden.

## Afhankelijkheden

De generatievolgorde begint met Kick, Lead, Chords. Harmony kan de lead volgen, Chords kunnen zijn ritme volgen, Pad kan akkoordvoicings lenen, Bass kan voor Kick uitwijken en Drums kunnen dubbele kicks vermijden. Afhankelijke partijen worden intern voorbereid zonder ze automatisch te exporteren.

Arrangementen genereren secties apart met subseeds. Sectie-instrumentatie blijft een subset van de aangevinkte instrumenten. Stilte in een breakdown met uitsluitend percussie is geldig. Na samenvoegen wordt dezelfde-toonoverlap opnieuw begrensd.

## MIDI

SMF type 1; 480 ticks per kwartnoot; 4/4. `buildMidi(tracks, tempo, totalTicks)` accepteert optioneel de cliplengte. De UI geeft die altijd door. Zonder lengte blijft de oorspronkelijke API bruikbaar en eindigt een track bij zijn laatste event.

MIDI-kanaal 10 is gereserveerd voor Drums; de 15 melodische kanalen slaan dat kanaal over. Trackdata wordt lineair opgebouwd met push in plaats van herhaald kopiëren voor iedere delta.

## Preview

Eén blijvende AudioContext, een korte vooruitkijkende scheduler en getraceerde nodes voor stop/cleanup. Volume 0 is exact 0 gain. Mute en solo wijzigen alleen preview; de UI benoemt dit. Syntheseklanken zijn eenvoudige klankschetsen. De metronoom is een previewhulp.

Canvas is een niet-bewerkbare weergave, met instelbaar instrumentfilter en nootnamen. Verborgen tabbladen gebruiken `hidden`; bij terugkeer wordt de canvas opnieuw getekend.

## Data en overdracht

Instellingen staan in de URL-hash; de hash blijft compatibel met de bestaande veldnamen. Onbekende of ongeldige waarden worden genegeerd/genormaliseerd. Tekst zoals seeds en ideenamen wordt escaped vóór HTML-weergave.

Favorieten staan in lokale browseropslag en kunnen als JSON worden verplaatst. `index.html` is zelfstandig en bevat geen externe runtime-assets. Versie 2 bewaart instellingen, geen gegenereerde eventsnapshot; exacte archivering gebeurt met de MIDI-export en de projectversie.
