# MIDIROOM 3.0

Offline MIDI-generator en productiewerkruimte. Voor hard dance, techno, house, dubstep, drum & bass UK garage, disco en Italo. Gebouwd op de aangeleverde KICKROOM 1.1-code.

## Meteen openen

1. Pak de volledige zip uit.
2. Open **index.html** in Chrome, Edge, Firefox of Safari.
3. Kies een genre, toonsoort en instrumenten. Download MIDI en sleep het in je DAW.

Geen installatie, account, API-key of internet nodig om de app te gebruiken. Alle code en vormgeving zitten in `index.html`. De browserpreview gebruikt eenvoudige synths; het MIDI-bestand bevat geen Serum-preset, audio of effectautomatisering.

## Nieuw in 3.0 — drie tools, één piano roll

Nieuwe visuele identiteit met schaalbaar SVG-logo, mineral graphite, mint en coral. De piano roll staat centraal; Frase Sculptor, Groove DNA en Vocal Conversation delen één bewerkingspaneel. Studio/Night blijven beschikbaar. Gebruik de tabs of de pijltjestoetsen wanneer een tab focus heeft.

### 1. Frase Sculptor

Kies een track en maten (of sleep over de piano roll). Maak drie takes richting **Meer ruimte, Meer spanning, Maak antwoord of Breek ritme**. Luisteren is tijdelijk; Gebruik neemt de take over met Undo. Andere tracks, locks en noten die over een selectierand lopen blijven intact. Veranderde timing verbreekt de eerdere vocalsturing. Voorstellen en maatselectie zijn tijdelijk; bewaar een project nadat je een take hebt gebruikt.

### 2. Groove DNA + eigen MIDI

Kies een `.mid` uit je DAW, een brontrack, een doelinstrument en een groove-lus van 1/2/4 maten. **Neem Groove DNA over** gebruikt de eerste niet-lege gekozen lus uit de bron voor aanzetten, aanslagen en nootlengtes, met het toonmateriaal van je doeltrack. **Importeer als track** neemt juist de originele noten over in dat instrument. Andere tracks blijven behouden. De huidige sessie bepaalt tempo en lengte; te lange importnoten worden afgekapt, er is geen audio-timestretch.

Ondersteund: MIDI type 0/1 met PPQ, maximaal 4 MB, 32 maten in 4/4 en 20.000 noten. Track/kanalen worden apart aangeboden. Sustain kan in nootlengtes worden verwerkt; overige controllers, program changes, pitchbend en een tempoverloop worden niet als automatisering overgenomen. SMPTE/type 2 worden afgewezen. MIDI-import wijzigt je sessietoonaard niet; controleer die zelf als je originele pitches importeert. Het bronbestand/grooveprofiel is tijdelijk; toegepaste noten gaan wel mee in project, scenes en MIDI-export.

### 3. Vocal Conversation

Laad en analyseer een droge vocal via de vocaltrack. In **Vocal Conversation** zie je gedetecteerde zangactiviteit en antwoordruimte. Kies de tracks, Vraag & antwoord of Rustig ondersteunen en hoe sterk de begeleiding reageert. Leads krijgen ruimte en korte antwoorden in pauzes; harmonische tracks dragen langer onder zang; basaanzetten kunnen richting zangaccenten bewegen. De bestaande harmonie is het uitgangspunt, geen transcriptie van originele akkoorden.

BPM/key moeten overeenkomen met de vocalinstellingen; een knop kan de analyse-instellingen aan de sessie gelijkmaken. Dit corrigeert geen audio en bewijst niet dat de geschatte key juist is. Preview speelt alleen MIDI en is omkeerbaar. Toepassen koppelt de aanwezige vocal; Undo herstelt de vorige sessie. Geen tempo-warp. Vocalanalyse blijft getest met synthetische frases, nog niet met echte zangers. De reactiesterkte en trackkeuze zijn tijdelijke toolinstellingen; de toegepaste noten worden exact bewaard.

## Nieuw in 2.8 — Studio skin & Scene Launcher

- Nieuwe DAW-geïnspireerde **Studio**-vormgeving: graphitevlakken, oranje acties, compactere transport- en trackbediening, consistentere randen en trackkleuren.
- **Night** geeft een donkerder werkvlak. Je themakeuze blijft lokaal bewaard en verandert geen MIDI of projectinstellingen.
- **Scene Launcher**: vier plekken voor volledige loopversies met MIDI, bronclip, locks, mixer en klanken. Capture legt vast; Start herstelt de scene en speelt vanaf het begin. Undo brengt je terug naar de vorige sessie.
- Scenes gaan mee in je projectbestand en lokale herstelkopie. Vocal-audio wordt niet opgeslagen of automatisch gekoppeld. Scenes starten direct, zonder wachten op een maatgrens; dit is geen naadloze live crossfade.

Elke scene en zijn bronclip mogen maximaal 32 maten en 20.000 noten bevatten. Wis of vervang scenes bewust; bewaar een projectdownload voordat je belangrijke versies overschrijft. Scene-slots zijn aparte projectinhoud en worden niet met de MIDI-Undo teruggedraaid.

## Nieuw in 2.7 — Feel & expressie

- **Natuurlijk** voegt subtiele timing, aanslagaccenten en articulatie toe. **Pocket** geeft meer timinggevoel; **Expressief** maakt frase-einden gevarieerder met spaarzame antwoorden binnen de toonladder.
- Nieuwe generatie en ritmevariaties gebruiken standaard Natuurlijk. Kies **Strak / uit** voor geen extra expressielaag. Een modus kiezen verandert je huidige MIDI nog niet.
- **Geef karakter** bewerkt de huidige vrije tracks; Undo herstelt je vorige frase. Elke klik is een nieuwe bewerking en kan eerdere expressie versterken. Bewaar een take om te vergelijken.
- Kick-events blijven exact; drums behouden hun aanzetten. Akkoorden krijgen samenhangende aanslagspreiding. Vocalgestuurde MIDI behoudt alle aanzetten en krijgt alleen aanslag-/duurvariatie.
- Locks en niet-geselecteerde tracks blijven intact. De Feel-keuze wordt met het project bewaard; alle expressie zit in de echte geëxporteerde MIDI-noten.

Dit is regelgebaseerde frasering, geen model van een echte muzikant. De klankpreview blijft dezelfde synth; beoordeel de MIDI ook met je eigen instrument in Ableton.

## Nieuw in 2.6 — Arrangement Director

- **Short Sketch (16 maten), Club Journey (48) en Extended (88)**: voorstellen met instrumentkeuzes, velocity en groove per sectie. Kies een voorstel en zet het expliciet in de editor; pas **Maak arrangement** verandert de huidige MIDI.
- **Einde per sectie**: Door, Adempauze (laatste tel vrij op niet-gelockte tracks) of Drumroll (vier aanslagen op de laatste tel, alleen met actieve vrije drums/kick). Overgangen worden na groovevariatie toegepast.
- Compacte sectiebediening en tijdlijn met maatbereik, trackaantal en overgang. Alles blijft bewerkbaar; overgangsinstellingen worden in projecten en Undo/Redo bewaard.
- **Herstelbug opgelost**: Undo/Redo werkt nu ook de lokale herstelkopie bij.

Locks blokkeren extra groove- en overgangsbewerkingen. Instrumentmaskers, herhalen/afkappen naar sectielengte en sectievelocity blijven van toepassing. Arrangementen bevatten geen vocal-audio of automatische audio-effecten. Maximaal 256 maten en 50.000 noten; te grote arrangementen worden geweigerd.

## Nieuw in 2.5 — Discovery Lab

Een uitklapbaar Lab in het MIDI-scherm: één loop, drie alternatieve richtingen met minitijdlijnen.

- **Meer ruimte / Meer drive / Meer verhaal** veranderen rusten, aanzetten, lengtes en fraseverloop. Je origineel blijft beschikbaar ter vergelijking.
- **Combineer tracks uit richtingen**: behoud bijvoorbeeld je gelockte lead, kies de bas uit Drive en akkoorden uit Ruimte.
- **Ritme lenen**: gebruik aanzetten van een andere track met het eigen toonmateriaal van de doeltrack. Akkoorden blijven polyfoon; locks worden gerespecteerd.
- **Luister → Gebruik → Undo**: preview gebruikt je huidige synthklanken en mixer. Stop of een andere actie herstelt de oorspronkelijke sessie; pas Gebruik neemt de MIDI over.

Richtingen zijn tijdelijke voorstellen; bewaar na Gebruik je project of take. Het Lab werkt op clips tot 32 maten en 20.000 noten. Het is een lokale regelgebaseerde MIDI-transformer. Vrije ontdekkingen kunnen zangtiming veranderen; de vocal speelt niet mee in de Lab-preview en wordt bij overnemen van zo'n richting ontkoppeld. Je kunt de audio daarna expliciet als referentie koppelen.

## Nieuw in 2.4

- **Bewaar project / Open**: portable `.midiroom.json` met exacte MIDI, bronloop, locks, mixer en soundinstellingen. Vocal-audio blijft apart; laad de opname opnieuw wanneer nodig.
- **Lokaal herstel**: wijzigingen krijgen na een korte pauze een lokale kopie. Bij herladen kies je Herstel of Begin opnieuw. Een aangeboden herstelkopie wordt niet overschreven tot je kiest. Download projectbestanden voor overdracht en duurzame eigen back-ups; browseropslag kan worden gewist of vol raken.
- Grotere track-tikvlakken op mobiel, één track per rij en een vocal-aan/uitknop bij de transportbediening.
- Ritmevariaties herhalen een motief over afwisselende maten. De bas herkent majeure/mineure triades beter, ook bij inversies. Overlappende/onvolledige zangsegmenten worden robuuster verwerkt.
- Ongeldige schaalmetadata en lege arrangementbronnen uit imports worden genormaliseerd. Onleesbare lokale hersteldata krijgt een expliciete optie om opnieuw te beginnen.

## Nieuw in 2.3: overzicht, samenspel en vocal als track

- Compact genreveld, één inspector voor het geselecteerde instrument en duidelijke SVG-knoppen. Instrumenten staan op mobiel boven de generator. Mixer en detailoverzicht kunnen dicht.
- **Ontdek variatie** verandert noten, aanzetten en lengtes. Kies Subtiel / Ontdekken / Avontuurlijk. Het trackicoon verandert alleen die track; de grote knop verandert alle vrije tracks.
- **Lock** bewaart de huidige noten exact bij variatie en generatie. Key, schema en lengte blijven vast zolang er locks zijn. Ontgrendel om de context te veranderen. Uitschakelen van een track heft zijn lock op.
- **Samenspel**: Vrij, Harmonisch of Ruimte maken. Bij variatie kan de bas aansluiten op akkoordtonen, kickruimte krijgen en kunnen extra melodische tracks ruimte laten voor lead/melody. Alleen te variëren tracks worden aangepast; dit is een regelgebaseerde compositor, geen getraind generatief model.
- **Vocal in de generator**: laden/analyseren via de vocaltrack. De geanalyseerde noten staan boven de MIDI-tijdlijn. Kies Volgen, Antwoorden in zangpauzes of Ondersteunen. Harmonische kandidaten worden per maat gewogen op de zangnoten; bas en akkoorden delen die keuze.
- Zangnoten corrigeren (pitch, begin/einde, verwijderen/toevoegen). Klik daarna opnieuw **Maak MIDI uit vocal**. De key blijft handmatig te corrigeren; wijzigen van zangnoten herberekent de key niet automatisch.
- **Hoorbaar bij Play** bepaalt alleen audio. **Koppel audio aan huidige MIDI** verandert geen noten en noemt die audio daarom een referentie. **Verder als vrije MIDI** stopt vocalgestuurde generatie. Een andere genrekeuze verbreekt de vocalsturing.
- Arrangement: eigen ritmevariatie per sectie en losse sectie-MIDI per instrument, vanaf maat 1. Locks behouden het bronritme; instrumentmasker, herhaling en velocity van de sectie blijven wel van toepassing.

De vocal blijft lokaal en zit niet in de MIDI-export of Idea Bank. Opnieuw laden van een take koppelt nooit automatisch andere audio. Voor exact herstel van variaties/locks: bewaar en exporteer de Idea Bank; de instellingenlink bevat geen aangepaste noten. Ritmevariatie op vocal-MIDI kan bewust van de zangtiming afwijken en wordt zo gelabeld. De audio blijft op originele snelheid; geen tempo-warp.

Vocalanalyse is getest met synthetische tonen, nog niet met echte zangers. Gebruik droge solo-opnames en controleer de nootlane. Antwoorden kan een lege melodietrack opleveren wanneer er geen bruikbare pauzes zijn. Volledige MIDI-nootbewerking en automatische audio-effecttransities zijn niet toegevoegd.

## Studio-interface uit 2.2

- Globale Play/Stop, loop en metronoom met live maat/tel-display; transport blijft op desktop in beeld tijdens scrollen en werkt in alle schermen.
- Consistente graphite-knoppen, gekleurde trackaccenten, duidelijk verschillende mute/solo-states en verticale mixerfaders.
- Instrumentzoeker en filter voor actieve tracks.
- Piano roll: Fit / 2× / 4×, horizontaal scrollen, automatisch volgen en Focus om controls tijdelijk op te bergen.
- Snelmenu via de knop of Ctrl/Cmd+K. Zoek een scherm of actie, druk Enter; Esc sluit en geeft toetsenbordfocus terug.

Zoek-, zoom- en focusinstellingen zijn tijdelijk. Zoom verandert de noten niet. Play start vanaf het begin; de positieteller is geen scrubber. De gekleurde lamp toont afspeelstatus, geen gemeten audiopiek.

## Eerdere uitbreidingen

- **MIDIROOM**-naam, graphite/lime-palet, compacte instrumentenlijst met drie groepen en apart te openen instellingen.
- **15 genre-presets** plus Vrij: de acht oorspronkelijke genres, Dubstep, Drum & bass, Liquid DnB, UK garage, Neurofunk, Disco en Italo disco.
- **21 screechstijlen**: dertien bestaande stijlen plus Call & response, Triplet bursts, Machine stutter, Late answer, Tension climb, Broken phrase, Reverse pull en Hold & cut. Nieuwe stijlen hebben frase- en toonbewegingsopties.
- **Studio Tools:** sampletranspositie, loopduur, stretchfactor, toonsoort/akkoorden, kickfrequenties, delaytijden en productiebrief.
- **Idea Bank:** takes opslaan, exact herstellen binnen deze versie, bewaren in browseropslag en JSON-import/export.
- **MIDI Check:** timing, bereik, overlap, chromatische noten, dubbele kicks en aandachtspunten voor het low end.
- Piano roll met notenliniaal en filter per instrument.
- Bugfixes voor volume 0, kwintakkoorden, vrije modus herstellen, instrumentselectie in arrangementen, MIDI-cliplengte, drumkanalen en invoer via seed/URL.

## Nieuw in 2.1: produceren rond je loop of vocal

- **DAW-bediening:** preview-mixer met level/pan, reset mute/solo, 16 stappen undo/redo en A-take terughalen. Undo/redo legt gegenereerde noten, sound-, mixer- en arrangementinstellingen vast; M/S zijn tijdelijke luisterkeuzes.
- **Sound Lab:** zes startpatches, oscillatorvorm, cutoff, resonance, attack, release, drive en detune. Luister met je MIDI en download een klankrecept voor je DAW. Kick/Drums houden hun vaste preview.
- **Arrangement:** secties toevoegen, verplaatsen, dupliceren/verwijderen; lengte, velocityfactor en instrumenten per sectie. Maximaal 16 secties, 32 maten per sectie en 256 maten totaal. De tool rangschikt/herhaalt de bronclip; geen automatische nieuwe fills of effecten.
- **Vocal Room:** lokaal audiobestand laden, key schatten, nootaanzetten detecteren en een lagere melodische tegenstem maken die deze timing volgt. Vocal + MIDI worden op één audioklok afgespeeld.

### Vocal Room gebruiken

1. Kies een korte, droge **solo vocal**, maximaal 20 MB / 90 seconden. WAV is een goede uitwisselingsoptie; overige codecs hangen af van je browser.
2. Kies **Analyseer vocal**. Controleer de eerste key-schatting en de alternatieven. Alleen majeur/natuurlijk mineur worden automatisch vergeleken; een korte of modale frase kan ambigu zijn.
3. Vul het BPM van je project in. BPM wordt niet uit de vocal geraden. Stel eventueel de startvertraging in seconden in.
4. **Maak begeleiding** genereert Bass, Pad en Melody. Melody volgt de gemeten tijdstippen in seconden, dus ook losse timing/rubato. 'Meer ruimte' gebruikt om en om een aanzet.
5. **Vocal + MIDI** speelt één keer gezamenlijk af, zonder de vocal te stretchen. Stop stopt de gezamenlijke playback. De native audioplayer is alleen voor los beluisteren.
6. Bewaar de take en exporteer de bank voor exact MIDI-herstel. Bewaar je originele vocal zelf; die zit niet in de bank of MIDI-download.

De automatische analyse is een eerste versie voor eenstemmige zang, ongeveer 65–650 Hz. Het is geen volledige zangtranscriptie, geen lettergreepherkenner en geen professionele keygarantie. Veel reverb, backing tracks, dubbels, ruis en vocale effecten kunnen de analyse verstoren. De akkoordlaag is een eenvoudige tonale basis, geen gedetecteerd akkoordenschema. Luister met de vocal en corrigeer de key waar nodig.

Voor een eigen arrangement of vocalclip herstelt een URL alleen de generatorinstellingen; **Idea Bank bevat de exacte notensnapshot**. Nieuwe generatie vervangt de bewerkte clip en geeft daarvan een melding.

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

Idea Bank bewaart maximaal 100 takes en 12 MB per browser/origin. Bij lokale `file://`-bestanden kan browseropslag afhankelijk zijn van het bestandspad. Gebruik **Exporteer bank** voordat je de app verplaatst, de browser wist of een andere computer gebruikt. Import voegt unieke IDs toe en overschrijft bestaande ideeën niet.

Nieuwe opgeslagen takes bewaren exacte MIDI-noten, bronclip, instellingen, preview-sound en mixer. Audiobestanden worden niet opgeslagen. Bank-export gebruikt versie 3; versie 2-banken blijven importeerbaar, maar bevatten alleen de oude generatorinstellingen. Een seed is reproduceerbaar met dezelfde instellingen **en generatorversie**; MIDI uit 1.1 kan door de bugfixes en nieuwe stijlbanken anders zijn in 2.0. Bewaar je MIDI-export voor archivering.

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

## Actuele tests

`npm run test:composer` controleert de nieuwe pure compositiefuncties. `npm run test:browser` gebruikt `test/session-browser.js` voor de geïntegreerde interface; `test:production` en `test:daw` zijn aliassen van dezelfde suite en tellen niet als extra controles. Maak de fixture via `node test/vocal.js` en geef die aan de browsersuite met `VOCAL_FIXTURE=/absoluut/pad/naar/midiroom-vocal-test.wav`. Oudere browserflows staan als historische bron onder `docs/archive/v2.2/tests` en horen bij de oude layout.
