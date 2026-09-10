# Overdracht — MIDIROOM 2.0

## Gebruikersdoel

Sam produceert in Ableton Live 12 Suite op Windows, onder meer hardtechno, rawstyle en reverse bass. Hij wil minder tijd verliezen aan het uitproberen en overdragen van MIDI-ideeën. Hij vroeg om een moderne UI, betere screeches, extra genres, productietools en serieuze bugtests.

**Lever volgende wijzigingen opnieuw als een complete zip**, bruikbaar in Claude én als GitHub-project. Geen alleenstaande snippets of alleen een gewijzigde index. De zip moet zowel de actuele broncode als een opnieuw gebouwde `index.html` bevatten.

## Begin hier

1. Lees README, CHANGELOG en TEST_REPORT.
2. Werk in `src/core.js`, `src/app-shell.html`, `src/theme.css` en `src/workspace.js`.
3. `node build.js` maakt de volledige offline app.
4. `npm ci && npm test`; aanvullende browser-QA staat in `test/browser.js`.
5. Controleer `docs/ROADMAP.md` vóór je extra features toevoegt. Functionaliteit moet productietijd besparen.

## Ontwerpbeslissingen

- Graphite met lime als primaire actie; instrumenten hebben eigen kleuraccenten.
- Instrumenten staan links. Aan/uit en instellingen openen zijn gescheiden.
- Sessietoonsoort, tempo en maatlengte zijn direct zichtbaar. Geavanceerde controls zijn inklapbaar.
- Vier tabbladen: MIDI Generator, Studio Tools, Idea Bank, MIDI Check.
- Browserpreview is een schets, geen belofte van professionele synthklank.
- De metronoom is optioneel, standaard uit, en zit niet in MIDI.
- Alle bestaande stijlen en genres behouden; geen frameworkmigratie.

## Muzikale wijzigingen

5 nieuwe genre-presets; dubstep en DnB hebben eigen drumlogica, geen loutere BPM-varianten. Liquid heeft expliciete zachte ghostnotes. Vier nieuwe baspatronen.

8 nieuwe screechstijlen gebruiken `generateScreechPhrase`. De tweematenfrase is gestructureerd; er zijn vaste frases, call/response en evoluerende turnarounds. Beweging: root, tonal, rising, falling. True triplets gebruiken fractionele 16de-posities die exact naar ticks worden afgerond. De oude screechstijlen blijven via `generateScreech` werken; nieuwe frase/motion-controls gelden alleen voor de nieuwe stijlen.

## Toestandsmodel

`collectState()` bevat de canonieke generatorinstellingen. `normalizeState()` valideert bekende IDs, grenzen, stijlen en extra opties voor URL en import. `restoreFromHash()` herstelt; `generate()` rekent opnieuw. Seed is geen audio en blijft versiegebonden.

Idea Bank: `localStorage['midiroom.ideas.v2']`, maximaal 100 ideeën. Exportformaat `{app:'MIDIROOM',version:2,ideas:[{id,name,date,state}]}`. Import is transactioneel: eerst alles valideren, dan samenvoegen op ID, dan schrijven. Geen cloudopslag. Bij quota-/opslagfouten blijft de sessie bruikbaar en verschijnt een exportadvies.

## Bewust nog niet aanwezig

- Geen MIDI-import of MIDI-editor; de piano roll is een preview.
- Geen audioanalyse, referentietrackvergelijking, LUFS-meting of stemseparatie.
- Geen VST/Serum-integratie, MIDI-CC/automation/pitchbend-lanes of samplebibliotheek.
- Geen taalmodel, API-key, server of externe fontrequests.
- Geen garantie dat oudere seeds dezelfde MIDI opleveren na een generatorupdate.

## Teststatus en eerlijkheid

Zie TEST_REPORT voor de exacte resultaten. Technische controles en genrepatronen zijn getest. Er is geen menselijke luistersessie in Ableton of Serum uitgevoerd. De bestaande stijlvergelijking geeft statistische afwijkingen; dat is geen blind luisteroordeel en de test is adviserend.

## Concrete volgende stap

MIDI-import + frases vergrendelen + gecontroleerde variaties, met undo en A/B. Maak eerst afgesproken acceptatiecriteria: welke noten moeten exact blijven, hoeveel verandering is toegestaan en hoe een opgeslagen take volledig wordt hersteld. Bouw niet meteen een algemene chatbot naast de generator.
