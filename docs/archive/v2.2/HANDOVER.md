# Overdracht — MIDIROOM 2.2

Sam wil een DAW-achtige, toegankelijke productieassistent. Sound design en arrangement kosten hem evenveel tijd. Hij waardeert knoppen zoals solo. De laatste uitbreiding vroeg ook automatische vocal-keydetectie en een melodie die het zangritme volgt.

**Lever wijzigingen altijd opnieuw als complete zip**, met broncode, actuele `index.html`, tests en documentatie, geschikt voor Claude en GitHub. `npm run pack:zip` maakt de zip met Python 3. Niet alleen snippets of een los HTML-bestand teruggeven.

## Werkende functies

- 15 genre-presets plus Vrij; Disco en Italo toegevoegd met eigen basritmes en disco-drums.
- Mixer per actief instrument: level/pan, bestaande mute/solo en M/S-reset. Preview-only.
- Undo/redo (16 snapshots) en een A-take. Exacte note-events, bronloop en productie-instellingen worden teruggezet.
- Sound Lab: twee oscillatoren → lowpass → drive → amplitude → mixer. Zes startpatches; geen Serum/VST-export, wel een leesbaar recept.
- Eigen arrangementen: sectielengte, volgorde, dupliceren/verwijderen, instrumentmasker en velocityfactor. Het huidige MIDI-materiaal wordt herhaald/gerangschikt, niet opnieuw gecomponeerd.
- Vocal Room: audio decoderen/downsamplen, analyse in Worker, key-kandidaten, nootaanzetten, lagere tegenstem in dezelfde key, gezamenlijke playback op dezelfde AudioContext-clock.
- Idea Bank neemt nu ook notensnapshots en bronclip mee. JSON-export versie 3; import accepteert 2 en 3. Geen vocalbytes in de bank.

## Code

- `src/core.js`: muzikale generatie en MIDI-writer.
- `src/app-shell.html`: hoofdinterface, state, canvas en audio-scheduler.
- `src/workspace.js`: oorspronkelijke tabs, bank, tools/checks, imports.
- `src/production.js`: mixer, historie, Sound Lab, Arrangement, Vocal Room en snapshotvalidatie.
- `src/vocal-engine.js`: pure analyse en vocal→melodie-eventfunctie; standalone testbaar in Node. Build voegt de functies inline in.
- `src/theme.css`: vormgeving, inclusief nieuwe werkruimtes.

Initialisatievolgorde is belangrijk. `workspace.js` leest de bank voordat `production.js` uitgevoerd wordt. De validators `cleanClip`, `cleanStudioState`, `bound` en `clone` zijn daarom function declarations; maak ze niet zonder migratie tot top-level consts (TDZ bij reload).

`collectState().x` bevat mixer, patches en sectiedefinities. Snapshots bevatten `clip` en `source`. De URL bevat geen note-events. Voor exacte custom/vocal-reproductie dus de bank gebruiken.

`baseLoop` bewaart de arrangementbron; genereer nooit een nieuw arrangement vanuit het vorige resultaat tenzij de gebruiker expliciet 'Gebruik huidige clip als bron' kiest. `arrangeClip` begrenst noten op sectieranden.

Vocal-audio leeft alleen in RAM. Een herstelde take wordt bewust niet automatisch aan het aanwezige audiobestand gekoppeld. `vocalLinked` en `current.vocalTiming` bepalen gezamenlijke playback. De combinatie speelt eenmalig, op originele vocallengte/snelheid; geen beat-warp.

## Niet overclaimen

De vocalanalyse is een eigen, lichte pitch/aanzet/key-schatter. Tests gebruiken een synthetische harmonische frase, **geen echte zanger**. Er is geen garantie voor beladen mixes, dubbels, reverb, pitchglides of korte modale fragmenten. 'Zekerheid' is een heuristiek, geen gekalibreerde kans. Majeur en natuurlijk mineur worden vergeleken; geen algemene modusdetectie.

De tegenstem volgt geschatte nootaanzetten en pitchcontour, niet ieder woord of iedere lettergreep. Pad/Bass bieden een eenvoudige tonale basis, geen automatische akkoordtranscriptie. Sound Lab is een preview-synth en exporteert alleen een recept.

## Volgende investering

1. Test met door de gebruiker aangeleverde droge vocalfragmenten met bekende key; beoordeel onsets, octave errors en key-alternatieven.
2. Maak een bewerkbare vocal-nootlane: aanzetten verschuiven, noten splitsen/samenvoegen, foutieve pitches corrigeren.
3. Laat akkoorden per frase de gedetecteerde zangnoten ondersteunen; voeg gecontroleerde antwoordfrasen in vocale rusten toe.
4. Bouw arrangementtransities en clip-locks verder uit. Houd de huidige offline zip-overdracht in stand.

Tests en precieze grenzen staan in `docs/TEST_REPORT.md`; historisch materiaal uit 2.0 staat onder `docs/archive/v2.0/`.

## 2.2 interface-overdracht

`src/daw.js` wordt na production.js en vóór de eerste generatie ingeladen. Het verplaatst de bestaande transportnodes naar een globale dock; dupliceer geen IDs of playbackhandlers. Het bevat trackfilters, focusmodus, een native dialog-snelmenu en zoom/follow. `drawRoll` roept `updateDaw` aan. ResizeObserver ververst canvaspixels bij layoutwijzigingen; de window-resize fallback blijft bestaan. Houd vroege DOM-guards intact.

`src/theme.css` bevat onderaan de 2.2-studio-overrides. Visuele state gebruikt native controls en aria-attributen; M/S blijven preview-only. Deze release verandert de MIDI-compositie en vocalanalyse niet. Toekomstige prioriteit: noten bewerken met quantize/transpose op exacte snapshots, daarna echte vocalfixtures; geen extra decoratieve meters zonder gemeten audio.

Tests: `npm run test:daw` vereist dezelfde Playwright/Chromium-omgeving als de andere browsersuites. Zie TEST_REPORT voor exacte uitgevoerde scope.
