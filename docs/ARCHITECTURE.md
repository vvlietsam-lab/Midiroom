# Architectuur

## Bestanden

    src/core.js          alle muzikale logica, geen DOM — te testen in node
    src/app-shell.html   interface, canvas piano roll, Web Audio, export
    build.js             plakt core.js in de shell -> index.html
    index.html           het resultaat: één bestand, geen dependencies

`core.js` exporteert onder node via `module.exports` en werkt in de browser doordat
`build.js` dat blok afkapt en de rest inline zet.

## De generatieketen

### 1. Toonhoogtemateriaal

Toonladders staan als halve-toonafstanden vanaf de grondtoon. Akkoorden worden gebouwd
door schaaltertsen te stapelen (trap, trap+2, trap+4), waardoor de akkoordkwaliteit
automatisch uit de modus volgt: dezelfde code geeft een mineurdrieklank in aeolisch en
een verminderde in de zevende trap van harmonisch mineur.

Twee functies doen al het corrigeren:

- `snapToChord` — naar de dichtstbijzijnde akkoordtoon
- `snapToScale` — naar de dichtstbijzijnde schaaltoon

Beide rekenen met absolute toonhoogteklassen. Een eerdere versie vergeleek relatieve
klassen tegen absolute, waardoor er noten buiten de toonsoort ontstonden.

### 2. Ritme

Stijlen zijn handmatig ingevoerde lijsten van aanslagen op een raster van 16 zestienden,
optioneel met een parallelle lijst nootlengtes. Een stijl kan ook een `span` hebben die
niet 16 is; dan loopt de cel door over de maatstreep en wordt hij door de hele sectie
getegeld (`generatePhased`). Dat is het houserige effect waarbij de riff in elke maat
op een andere plek valt.

Sommige stijlen hebben een `cell`. Dan wordt de melodische contour per halve maat
herhaald in plaats van uitgerekt over de hele maat. Zonder dat ontaardt een dicht ritme
in een heen-en-weer tussen twee noten.

### 3. Motief en variatie

`buildMotif` legt een contour over de aanslagen van de eerste maat. Tel 1 en 3 worden op
een akkoordtoon gezet, de rest op een schaaltoon. Voor de Melody-partij is het maximale
interval binnen een maat begrensd op twee schaaltrappen.

Daarna wordt per maat gevarieerd:

| Positie in de frase | Bewerking |
|---|---|
| maat 1 | het motief zelf |
| maat 2 | staartnoot wijzigen of een noot weglaten |
| maat 3 | octaafsprong op de piek |
| maat 4 | staartnoot wijzigen plus een fill |
| frase 2 en verder | roterende variatie, zodat 16 maten blijven ontwikkelen |

Transponeren naar het volgende akkoord gebeurt in schaaltrappen en wordt naar het
naaste octaaf teruggebracht (`wrapShift`), anders klimt het motief per akkoord omhoog.

### 4. Scoren

`bestMelodic` maakt 120 varianten en houdt de hoogst scorende. Het ritme wordt één keer
vóór de lus gekozen: anders selecteert de score systematisch hetzelfde schaarse patroon.

De score kijkt naar aantal unieke toonhoogtes tegenover een doelwaarde, intervalverdeling
(stappen tegenover sprongen), herhalingsgraad tegenover een doelwaarde, opgeloste sprongen,
één duidelijke piek laat in de frase, ambitus binnen een venster, akkoordverankering op de
zware tellen, onderling verschil tussen de maten, tegenbeweging tussen opeenvolgende maten,
en een aftrek als een sectie van 8 maten uit twee identieke helften bestaat.

### 5. Nootlengtes

Lengte is het gat tot de volgende aanslag min een vaste release, of de in de stijl
opgegeven lengte min die release. Vier articulaties: automatisch, grillig, legato,
staccato. Velocity is gekoppeld aan lengte maar blijft dicht bij de basiswaarde, omdat
het referentiecorpus vrijwel vlakke velocities heeft.

### 6. Afhankelijkheden tussen partijen

Sommige partijen hebben een andere nodig. De generatievolgorde is daarom
**kick, lead, chords, de rest**:

- Harmony is de lead een diatonische terts of sext lager, op hetzelfde ritme
- Chords kunnen exact de aanslagen van de lead overnemen (de rawphoric-formule)
- Pad kan de stemvoering van Chords overnemen
- Drums laat zijn kicklane weg als de Kick-partij aanstaat
- Bass wijkt een zestiende uit waar hij op een kick zou vallen

### 7. Registers

Elke partij heeft een doelregister en een maximale ambitus. Na het genereren wordt de
partij in octaven verschoven tot het gemiddelde bij het doel ligt, en worden uitschieters
naar de mediaan gevouwen. Opties die de ambitus met opzet vergroten (octaafsprongen,
arp-stijging) verruimen die grens, anders draait de registerfilter ze meteen terug.

## Arrangementen

`generateArrangement` genereert elke sectie apart met een eigen subseed en variatienummer,
verschuift de ticks en plakt de sporen achter elkaar. Na het plakken wordt over de hele
track opnieuw op overlap gecontroleerd: een noot die tot het einde van een sectie doorklonk
kan de eerste noot van de volgende overlappen.

## MIDI wegschrijven

Handgeschreven SMF type 1: variabele-lengte delta's, één spoor per partij, elk op een eigen
kanaal, tempo en maatsoort in een eigen eerste spoor. Geen bibliotheek.

## Audio

E�n blijvende AudioContext die nooit gesloten wordt. Een lookahead-planner plant 0,45 seconde
vooruit met een interval van 40 ms; alles in één keer plannen liep vast bij 32 maten met acht
partijen. Op de master staat een compressor als limiter. Voor iOS is er een ontgrendeling met
een leeg audiobuffertje binnen de klik plus een stil, doorlopend audio-element, want anders
blijft WebAudio stil zolang de zijschakelaar op stil staat.
