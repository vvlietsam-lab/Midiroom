# MIDIROOM 2.0

Offline MIDI-generator en productiewerkruimte. Voor hard dance, techno, house, dubstep, drum & bass en UK garage. Gebouwd op de aangeleverde KICKROOM 1.1-code.

## Meteen openen

1. Pak de volledige zip uit.
2. Open **index.html** in Chrome, Edge, Firefox of Safari.
3. Kies een genre, toonsoort en instrumenten. Download MIDI en sleep het in je DAW.

Geen installatie, account, API-key of internet nodig om de app te gebruiken. Alle code en vormgeving zitten in `index.html`. De browserpreview gebruikt eenvoudige synths; het MIDI-bestand bevat geen Serum-preset, audio of effectautomatisering.

## Wat is nieuw?

- **MIDIROOM**-naam, graphite/lime-palet, compacte instrumentenlijst met drie groepen en apart te openen instellingen.
- **13 genre-presets** plus Vrij: de acht bestaande genres, Dubstep, Drum & bass, Liquid DnB, UK garage en Neurofunk.
- **21 screechstijlen**: dertien bestaande stijlen plus Call & response, Triplet bursts, Machine stutter, Late answer, Tension climb, Broken phrase, Reverse pull en Hold & cut. Nieuwe stijlen hebben frase- en toonbewegingsopties.
- **Studio Tools:** sampletranspositie, loopduur, stretchfactor, toonsoort/akkoorden, kickfrequenties, delaytijden en productiebrief.
- **Idea Bank:** takes opslaan, exact herstellen binnen deze versie, bewaren in browseropslag en JSON-import/export.
- **MIDI Check:** timing, bereik, overlap, chromatische noten, dubbele kicks en aandachtspunten voor het low end.
- Piano roll met notenliniaal en filter per instrument.
- Bugfixes voor volume 0, kwintakkoorden, vrije modus herstellen, instrumentselectie in arrangementen, MIDI-cliplengte, drumkanalen en invoer via seed/URL.

## Bediening

- **Checkbox:** instrument aan of uit. **›:** instellingen open/dicht, zonder het instrument te wijzigen.
- **M / S:** mute / solo voor de preview. MIDI-export bevat alle ingeschakelde instrumenten.
- **↻ per instrument:** alleen die partij variëren. Afhankelijke partijen, zoals harmonie die de lead volgt, kunnen bewust mee veranderen.
- **Nieuwe variatie:** nieuwe seed. **Genereer MIDI:** opnieuw genereren met dezelfde instellingen.
- **Akkoorden, structuur & groove:** akkoordenschema, arrangement, seed, swing en humanize.
- **Spatie:** afspelen/stoppen, behalve wanneer je een invoerveld of knop bedient.
- De metronoom staat standaard uit en wordt nooit geëxporteerd.

Een genre kiezen past het tempo en de instrumentinstellingen aan. De energieslider past het genre opnieuw toe. Een arrangement verdeelt de ingeschakelde partijen over secties; het voegt geen uitgeschakelde instrumenten toe. Een breakdown kan dus stil zijn als je uitsluitend percussie kiest.

## Ableton / MIDI

- Standard MIDI File type 1, 480 PPQ, 4/4, tempo-event en één track per instrument.
- Drum Rack-mapping: kick 36, snare 38, clap 39, closed hat 42, open hat 46, ride 51.
- Drums gebruiken MIDI-kanaal 10. Melodische instrumenten vermijden dit kanaal.
- Elke geëxporteerde track eindigt op de ingestelde maatgrens, inclusief een eventuele stille staart.
- Zet het tempo van je DAW zelf gelijk aan de export. Controleer de cliplengte na import; DAW-importgedrag kan verschillen.
- Nootnamen gebruiken de conventie MIDI 60 = C4. Ableton kan dezelfde noot met een ander octaafnummer tonen; de MIDI-nummers en frequenties zijn leidend.
- Een MIDI-download levert ook een `_notes.md` met de context van de sessie. Sommige browsers vragen toestemming voor meerdere downloads.
- De notities bij een losse partij beschrijven de volledige sessie als productiecontext, inclusief de andere partijen.

## Ideeën meenemen

Idea Bank bewaart maximaal 100 takes per browser/origin. Bij lokale `file://`-bestanden kan browseropslag afhankelijk zijn van het bestandspad. Gebruik **Exporteer bank** voordat je de app verplaatst, de browser wist of een andere computer gebruikt. Import voegt unieke IDs toe en overschrijft bestaande ideeën niet.

Opgeslagen takes bewaren instellingen en seed, geen audiopresets. Een seed is reproduceerbaar met dezelfde instellingen **en generatorversie**; MIDI uit 1.1 kan door de bugfixes en nieuwe stijlbanken anders zijn in 2.0. Bewaar je MIDI-export voor archivering.

## Verder met Claude of GitHub

De zip bevat broncode, buildscript, lockfile, tests en overdrachtsdocumenten. Geef bij voorkeur de **hele zip** aan je volgende assistent, met `docs/HANDOVER.md` als startpunt. Bewerk `src/`, voer de build uit en lever opnieuw een complete zip aan.

```sh
npm ci
npm run build
npm test
```

Een nieuwe complete broncode-zip maken: `npm run pack:zip` (Python 3 vereist). De zip komt naast de projectmap.

De build zelf heeft geen dependencies. Tests gebruiken jsdom. Uitgebreider:

```sh
npm run test:fuzz
npm run test:regression
```

Echte browserchecks zijn optioneel en vereisen Playwright en Chromium:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

`CHROMIUM_EXECUTABLE` kan naar een al geïnstalleerde Chromium wijzen. `QA_OUTPUT` kiest de map voor screenshots/testdownloads.

Voor GitHub: commit de uitgepakte projectinhoud inclusief `src/`, `index.html`, `package-lock.json` en `.github/`. De aanwezige workflow test pushes en pull requests. De kant-en-klare `index.html` kan als statische pagina worden gehost; er is geen server nodig.

## Documentatie

- `docs/HANDOVER.md` — context en aandachtspunten voor de volgende assistent.
- `docs/ARCHITECTURE.md` — code-indeling en muzikale keten.
- `docs/CHANGELOG.md` — concrete wijzigingen en bugfixes.
- `docs/TEST_REPORT.md` — uitgevoerde tests en hun grenzen.
- `docs/ROADMAP.md` — kritisch vervolgplan richting een productieassistent.

MIT-licentie zoals in het oorspronkelijke project.
