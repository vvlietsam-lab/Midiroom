# MIDIROOM 2.3 — testverslag

Uitgevoerd op 11 september 2026, Node.js en headless Chromium op Linux. De app is lokaal geopend zonder server. Screenshots staan in `screenshots`, resultaten in `test-results`. Historische 2.2-evidence staat apart in `archive/v2.2`.

| Controle | Resultaat |
|---|---|
| Pure compositietest | 3.600 variatieruns, 91.276 outputnoten over 12 instrumenten: PASS |
| Actuele sessiebrowserflow | 75 controles: PASS, geen runtimefouten |
| Audio-modeltest | ALL PASS |
| Bestaande DOM-suite | 50 willekeurige acties, 124 stijlcombinaties en 48 genre/energiecombinaties slaagden; daarna een sessielogregressie gevonden |

## Nieuwe muziektests

Determinisme, verschillende ritme/lengtesignaturen, integer ticks, nootgrenzen en MIDI-bereik gecontroleerd. Iedere instrumentgroep leverde meer dan 20 verschillende ritmesignaturen op. Vocal-follow wordt vergeleken met de aangeleverde nootaanzetten; answers moeten geheel binnen zangpauzes liggen. Veranderde zangpitches veranderen melodie en harmonische keuze. Ook toonladder, bas/akkoordrelatie, kickruimte en behoud van gelockte partijen gecontroleerd.

Dit zijn regel-/invarianttests, geen luisterpanel of bewijs van stilistische kwaliteit. Arrangementvariaties blijven op bestaande harmonische inhoud gebaseerd; ze leveren geen automatisch gemasterde productie op.

## Browser

Controleert genrekeuze, één inspector, lock bij variatie en generatie, enkelvoudige trackvariatie, Undo/Redo, exact bankherstel, sectievariaties, begrensde noten en MIDI-bestandsheader bij sectie-export. Verder snelmenu, zoom, focus, echte mixer-gain en Sound Lab-preview.

Vocalfixture: dezelfde synthetische harmonische frase als 2.1, geen echte zanger. Decode/worker/key, onset-afhankelijke MIDI, gedeelde audioklok met offset, audio aan/uit, expliciet samen afspelen, handmatige pitchcorrectie en de melding voor nog niet toegepaste correcties zijn gecontroleerd. Ook gap-only antwoorden, harmonie per maat, herstel zonder audiokoppeling, expliciete referentiekoppeling, vrije MIDI en verwijderen van de bron.

Alle zes hoofdschermen plus de geïntegreerde vocaldrawer passen binnen 1500, 1024, 768 en 390 px. De mobiele inspector opent/sluit. Desktop-, mobiele, vocal- en arrangementscreenshots zijn visueel beoordeeld.

## Gevonden en opgeloste fouten

- Vocalstatus overlapte op mobiel de openknop; layout gecorrigeerd.
- Oude vocalgain kon bij restart via een onended-callback geraakt worden; cleanup gebruikt nu de eigen node.
- Audio verwijderen reset nu ook de native speler; lege analysepanelen blijven verborgen.
- Handmatig audio koppelen claimt geen zanggestuurde MIDI.
- Nieuwe ritmevariaties ontbraken in het sessielog. De DOM-suite stopte daardoor in het logscenario. Variaties worden nu gelogd met exacte snapshots. De volledige DOM-suite is daarna niet opnieuw gedraaid; de laatste browserrun controleert specifiek twee logitems en exact terughalen van custom events. Het oorspronkelijke DOM-log blijft ter transparantie bewaard.

## Niet gevalideerd

Geen echte zangers, volledige mixes, live Safari/Firefox of mobiele audiohardware. Geen gekalibreerde keyzekerheid, source separation, tempo-warp of akkoordtranscriptie. Geen volledige nieuwe core-fuzzrun: de oorspronkelijke core is inhoudelijk ongewijzigd; de nieuwe transforms hebben hun eigen tests. De drie browser-npm-aliases wijzen naar dezelfde 75-check-suite en mogen niet driemaal geteld worden.
