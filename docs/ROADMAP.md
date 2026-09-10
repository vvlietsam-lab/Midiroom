# Van MIDI-generator naar productieassistent

## Kritisch oordeel

De kernwaarde is snel een bruikbare frase vinden en die zonder contextverlies naar Ableton meenemen. MIDIROOM 2.0 verbetert dat, maar blijft een regelgebaseerde generator. Meer presets alleen maken er geen uitzonderlijke productieassistent van.

De grootste ontbrekende schakel is **voortbouwen op iets dat al goed is**. Nu kun je een hele partij regenereren of een take bewaren. Je kunt geen eigen MIDI importeren, twee noten vastzetten of alleen de laatste twee maten laten veranderen. Dat is de beste volgende investering.

## Prioriteiten

| Prioriteit | Werkruimte / functie | Concrete tijdwinst | Wanneer geslaagd? |
|---|---|---|---|
| 1 | MIDI-import + Clip Lab | Bestaande ideeën hergebruiken in plaats van opnieuw genereren | Import behoudt pitches, timing, velocity, maatlengte en trackindeling; roundtrip is gecontroleerd |
| 1 | Frase-locks + gerichte variaties | Alleen verbeteren wat nog niet werkt | Vergrendelde noten blijven exact; rhythm-only, pitch-only en laatste-2-maten werken afzonderlijk |
| 1 | Undo/redo + A/B-takes | Direct kunnen terugkeren na experimenten | MIDI, settings en previewcontext worden samen teruggezet, ook na import |
| 2 | Arrangement Lab | Van een goede 8-bar-loop naar een schets van de track | Bewerkbare sectielengtes, mute per sectie, duidelijke transitions en MIDI-markers |
| 2 | Sound-design companion | Sneller van noten naar bruikbare sound | Eigen templates per instrument met concrete routing- en envelopekeuzes; geen verzonnen presetnamen |
| 2 | CC- en pitchbend-lanes | Frasebeweging tegelijk met MIDI exporteren | Expliciete kanaalkeuze, bend-rangeafspraak en correcte terugkeer naar neutraal |
| 3 | Audio Check | Repetitief meetwerk rond een bounce automatiseren | Lokaal analyseerbare WAV; peak/RMS en later gekalibreerde loudness/true-peak, met heldere meetgrenzen |
| 3 | Referentieprofielen | Variaties laten aansluiten op eigen smaak | Analyse van gebruikers-MIDI; vergelijkbare groove en dichtheid zonder bestaande melodieën klakkeloos te kopiëren |
| Later | Ableton-koppeling | Instellingen en clipcontext minder handmatig overzetten | Eerst een getest uitwisselingsformaat; daarna pas optionele device/companion-integratie |

## Clip Lab: aanbevolen volgende versie

1. Importeer één eigen `.mid` en toon echte noten in een bewerkbare piano roll.
2. Selecteer een gebied van maten of noten. Een lock bewaart note-on, note-off, pitch en velocity exact.
3. Kies een concrete wijziging: meer rust, dichter ritme, antwoordfrase, octaafaccenten of toonhoogte aanpassen binnen dezelfde ladder.
4. Maak drie kandidaten en beluister ze met dezelfde previewklank en luidheid. Houd de originele take zichtbaar.
5. Bewaar een kandidaatsnapshot met events, engineversie en instellingen; exporteer MIDI + context.

Vermijd een algemene knop “maak beter”. Verandering moet begrensd en terug te draaien zijn. De score is een hulpmiddel; het oor en de functie van de frase beslissen.

## Betere screeches: wat MIDI wel en niet kan

MIDI bepaalt aanslag, pitch, velocity en duur. Een agressieve screech ontstaat ook door oscillatorrouting, FM, filtering, distortion, envelopes, glide en effecten. Een andere nootfrase is niet automatisch een andere sound. De preview moet deze grens duidelijk houden.

De volgende stap kan een eigen bibliotheek van korte sound-designrecepten zijn: één-noots MIDI met envelopebeweging; monofonische frase met glide; call/response over twee patches. Inbouw van CC/pitchbend vraagt afspraken over welke parameters de ontvangende synth leest. Zonder die afspraken klinkt een “automatiseringsexport” mogelijk helemaal niet zoals verwacht.

## Reële kwaliteitsmeting

- Technisch: geldige MIDI, schaaltrouw waar gevraagd, monofonie waar nodig, geen ongewenste grensoverschrijding, reproduceerbaarheid en verliesloze import/export.
- Ritmisch: herkenbaar motief, gecontroleerde turnarounds, rustverdeling, syncopen en genretypische backbeat.
- Muzikaal: luistertests met dezelfde patches en gelijke loudness, met meerdere genres. Laat de gebruiker anoniem A/B kiezen; optimaliseer op voorkeuren in plaats van uitsluitend intervalstatistiek.
- Praktisch: meet tijd van eerste idee tot behouden Ableton-clip, aantal nuttige variaties per sessie en hoe vaak iemand een eerdere take moet herstellen.

## Vragen voor de volgende ontwikkelronde

Deze vragen blokkeren versie 2.0 niet, maar bepalen de volgende investering:

1. Wil je vooral eigen MIDI verder ontwikkelen, of juist snel nieuwe ideeën vanaf nul?
2. Wat kost jou nu meer tijd: een goede screechfrase, het daadwerkelijke sound design, of een loop uitbouwen tot arrangement?
3. Kun je 5–10 eigen korte MIDI-voorbeelden met genre, BPM en een zin over wat er goed aan is leveren? Bij voorkeur één instrument per voorbeeld.
4. Moet de app strikt één offline HTML-bestand blijven, of is een lokale desktop/companion-versie later acceptabel?

Begin met de antwoorden op 1 en 2. Bouw eerst één aantoonbaar snellere productiestap, vervolgens de volgende.
