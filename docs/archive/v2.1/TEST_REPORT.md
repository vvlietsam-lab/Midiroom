# MIDIROOM 2.1 — testverslag

Uitgevoerd op 10 september 2026 in Node.js en headless Chromium op Linux. De app is lokaal als HTML-bestand getest. Ruwe resultaten staan in `test-results`; screenshots in `screenshots`. De eerdere 2.0-resultaten staan apart in `archive/v2.0`.

| Controle | Omvang | Resultaat |
|---|---|---|
| Core-fuzztest | 4.000 generaties, 22.025 partijen, 3.066.192 noten | Geen gecontroleerde MIDI-invariant geschonden; geen lege partijen |
| Regressies | 420 runs, 32.093 assertions | PASS; 15 genres en 8 nieuwe screechstijlen |
| DOM | 120 willekeurige acties plus vaste scenario’s | ALL PASS, nul runtimefouten |
| Web Audio-model | Planning, envelopes, stop/replay en mastervolume | ALL PASS |
| Bestaande browserflow | 43 controles | PASS, nul JavaScriptfouten en externe requests |
| Productiewerkruimte in Chromium | 33 controles | PASS, nul runtimefouten |
| Vocal-engine | 13 synthetische harmonische noten | 13 pitches en inzetten gevonden binnen 130 ms; A mineur bovenaan; stilte afgewezen |
| Stijlvergelijking | 8 instrument-/referentiegroepen | 8 statistische verschillen groter dan 45%; adviserend |

## Nieuwe functies

De browsertest controleert exacte Undo/Redo/A-terugroepacties, echte gain/pan-nodes, synthpresets en cutoff, een arrangement van 28 maten met instrumentmaskers en begrensde noten, en exact terughalen na herladen. Mixer en synthinstellingen blijven daarbij behouden.

Een synthetisch WAV-bestand wordt via de bestandskiezer gedecodeerd en in de worker geanalyseerd. De test controleert automatische key, gemeten inzetten, MIDI-timing, dezelfde audioklok voor vocal en begeleiding, de ingestelde startoffset en eenmalig afspelen. Herstelde MIDI koppelt niet ongemerkt aan andere vocalaudio. Verwijderen wist audio en analyse. Nieuwe panelen passen op 1440, 1024 en 390 px; de bestaande suite controleert ook 768 px.

## Grenzen van deze validatie

Dit bewijst geen betrouwbare transcriptie van echte zang. De fixture is een synthetische harmonische frase, geen zanger of zangeres. Adem, vibrato, portamento, galm, dubbelingen, achtergrondmuziek en onduidelijke tonaliteit zijn nog niet gevalideerd. De keyscore is een rangschikking met een heuristische zekerheid, geen gekalibreerd waarschijnlijkheidspercentage. De key blijft handmatig aanpasbaar.

De begeleiding volgt geschatte nootaanzetten; dit is geen tekst- of lettergreepherkenning. Minder dan 1 ms afrondingsverschil tussen MIDI en geschatte inzetten betekent niet dat de analyse zelf op 1 ms nauwkeurig is. BPM wordt door de gebruiker ingesteld; audio wordt niet gewarpt. De test controleert audioplanning, geen opname van akoestische uitvoer.

De stijlvergelijking signaleert verschillen in dichtheid, bereik en ritme tegenover referenties. Die zijn geen runtimebugs, maar ook geen bewijs dat iedere frase muzikaal overtuigend is. Luisterbeoordeling in een DAW en tests met echte droge solovocals blijven nodig. Safari/Firefox en mobiele audiohardware zijn niet live getest.

## Herhalen

`npm ci` en `npm test` draaien de Node-suites (de standaard DOM-run gebruikt 400 acties). Deze release is afzonderlijk getest met de hierboven genoemde aantallen. `npm run test:browser` en `npm run test:production` gebruiken Playwright; zie README voor de browseromgeving. `test/vocal.js` maakt de synthetische fixture aan; geef het pad via `VOCAL_FIXTURE` aan de productiebrowsertest.
