# Overdracht — MIDIROOM 2.3

Sam geeft UI-overzicht de hoogste prioriteit: compacte duidelijke knoppen, kleur per track, geen volle schermen met onnodige instellingen. Lever elke wijziging als complete ZIP met actuele index.html en broncode, bruikbaar voor Claude/GitHub. Gebruik `npm run pack:zip`.

## Belangrijkste nieuwe onderdelen

- `src/session.js`: inspector, SVG-controls, locks, ritmevariatie-acties, geïntegreerde vocaldrawer, zangnootcorrecties, sectievariatie/export. `src/daw.js` blijft de transport/zoom/command-laag.
- `src/composer.js`: pure deterministische rhythmVariation, tidyEvents, relateParts, vocalHarmony en guidedVocalParts. Build laadt dit samen met core/vocal-engine in de hoofdscript-scope.
- `src/production.js`: oorspronkelijke mixer, sound, snapshots en arrangement. Session.js verrijkt arrangeClip en renderArrangement. cleanStudioState bewaart `session` (locks, sterkte, relatie) en section.variation. Functiedeclaraties voor cleanSessionConfig moeten beschikbaar blijven vóór session.js uitgevoerd wordt.
- `handlePartClick` en `handlePartChange` staan in app-shell. De inspector verplaatst de originele controls, dus de handlers werken ook daar. Geen duplicate IDs maken.

## Gedrag en grenzen

Trackvariatie werkt op exacte huidige events en houdt andere tracks intact. Grote variatie verandert alle vrije tracks. Lock bewaart events bij generatie; globale harmonie/lengte-controls zijn dan geblokkeerd. Uitschakelen verwijdert de lock. Arrangement herhaalt het bronmateriaal en volgt sectiemaskers/velocity, ook bij een lock, maar varieert de gelockte ritmes niet.

`current.customEdit` markeert variaties; herstel vergt de clip-snapshot uit Idea Bank. Locks bevatten alleen flags in de URL, niet de gevangen noten; claim dus geen exact URL-herstel. Het oude seedmodel geldt alleen voor gewone gegenereerde clips. Undo/Redo/A en bank bewaren events.

Vocal heeft drie onafhankelijke betekenissen: analyse aanwezig, MIDI uit analyse gemaakt (`vocalTiming`), audio hoorbaar (`vocalLinked`). `vocalSourceSerial` koppelt alleen in deze RAM-sessie aan de juiste opname. cleanClip bewaart bewust geen serial; bankimport is dus nooit automatisch gekoppeld. Handmatig audio koppelen maakt een referentie en zet vocalTiming=false. Genereer opnieuw uit analyse om er een bron van te maken.

Playback gebruikt dezelfde AudioContext-anchor, met offset. De eigen gain-node wordt in een closure losgekoppeld, zodat een oude source.onended geen nieuwe vocalgain kan verbreken bij restart. Preview wordt eenmalig zodra vocal meedoet; een referentie wordt afgekapt op MIDI-sessielengte, niet gewarpt.

Zangcorrecties verhogen vocalRevision. De lane meldt niet-toegepaste correcties. Key wordt niet automatisch opnieuw geraden na handmatige edits. De editor toont maximaal de eerste 600 segmenten; toevoegen begrensd op 600. Analyse blijft maximaal 20 MB/90 s, pitches 65–650 Hz. Geen echte zanger getest. De akkoordkeuze is een eenvoudige duurgewogen triade-score per maat; geen originele akkoordtranscriptie of AI-model. Gaps-only antwoord mag leeg zijn.

Vocalgestuurde tracks gebruiken de zangvorm, daarom zijn oorspronkelijke stijlcontrols daar tijdelijk uitgeschakeld. De trackvariatieknop kan vrijere ritmes ontdekken; de lane benoemt dit. Verder als vrije MIDI geeft de gewone stijlbediening terug.

## Tests en vervolg

Nieuwe tests: test/composer.js en test/session-browser.js. Oude browserflows zijn gearchiveerd omdat ze aparte vocaltabs/inline trackinstellingen verwachten. Alle drie browser-npm-aliases gebruiken dezelfde actuele suite. Bestaande DOM/audio/core-suites blijven beschikbaar. Exacte uitgevoerde aantallen staan in TEST_REPORT.

Volgende nuttige stap: echte droge vocalfixtures van Sam valideren (pitch, onsets, tonaliteit); vervolgens akkoordovergangen/voicing verbeteren. Geen verdere menugroei zonder duidelijke plek in de sessie. Houd sound design en arrangement als gelijkwaardige productieworkflows.

Sessielog is bijgewerkt: ritmevariaties krijgen een nieuwe seed en exacte snapshots. Herstel gebruikt de snapshot, niet alleen het instellingenhash. De DOM-suite vond deze regressie; de fix is gericht in de browser gevalideerd.
