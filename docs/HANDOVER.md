# Overdracht — MIDIROOM 3.0

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

## 2.4 — projects.js en auditfixes

`projects.js` wordt na session.js ingeladen. Het voegt portable JSON-projecten, conservatief lokaal herstel en de vocaltransportchip toe. rememberTake en renderSession worden verrijkt; behoud de opstartvolgorde. RECOVERY_KEY=midiroom.recovery.v1. Een vorige kopie blijft beschermd totdat de gebruiker Herstel/Begin opnieuw kiest. Ongeldige kopieën geven een expliciete restart-optie; import wordt gevalideerd vóór mutatie. cleanProject/cleanClip verwijderen audioserials, normaliseren schaalmetadata en gebruiken huidige clip als fallback bij een lege bron.

Composer-audit: terugkerende motieven, inversieherkenning voor major/minor triades, genormaliseerde zangsegmenten en veilige gap-antwoorden. Dit zijn muzikale heuristieken; geen echte-vocalvalidatie toegevoegd. Andere akkoordtypes gebruiken een fallback.

Tests: test:projects bevat een aparte browserflow met 120 stressacties. De eerdere DOM-logregressie is nu door de hele suite opnieuw gecontroleerd: ALL PASS. UI-auditbevindingen zijn vertaald naar grotere enable-labels, trackcontrols en expliciete vocalbediening.

## 2.5 — Discovery Lab

`src/discovery-engine.js` bevat pure discoverClip/transplantRhythm-transformaties (CommonJS of browserglobal). `src/discovery.js` volgt projects.js in de build en koppelt kaarten, trackcombinaties en ritmeoverdracht aan de bestaande sessie. Geen extra navigatietab.

Audition wisselt tijdelijk current: stopAudio herstelt exact de originele clip, vocalLinked en loop. Capture-handlers stoppen de preview vóór andere UI-acties. projectPayload schrijft het origineel; rememberTake negeert previews; pending recovery wordt bij starten geannuleerd en bij stoppen opnieuw ingepland. Bewaar deze volgorde bij refactors. Gebruik loopt via finishSession en blijft undoable. Kandidaten worden ongeldig zodra bronclip/context/locks veranderen. Kandidaten zelf zijn tijdelijk en worden niet in projectbestanden opgeslagen.

Locks bewaren events exact. Vrije transformaties verwijderen vocal-bronclaims en ontkoppelen audio bij overnemen. Geen tempo-warp of nieuw audiomodel. Limiet: 32 maten/20.000 bronnoten. Test met npm run test:discovery en npm run test:discovery:browser (browserruntime vereist).

## 2.6 — herstel na Undo/Redo

projects.js wraps restoreSnapshot and schedules recovery after restoration. Previously an already-flushed recovery file could retain the pre-Undo clip until another edit. test/projects-browser.js now asserts both Undo and Redo update local recovery. test/discovery-browser.js also waits for actual natural preview completion and verifies exact clip, loop, vocal link and history restoration.

## 2.6 — Arrangement Director

src/arranger.js exposes MidiroomArranger.proposeArrangement and applyTransitions (browser and CommonJS). Its integration marker must follow session.js and discovery.js: groove variation must finish before breath/roll are applied. cleanStudioState preserves transition none/breath/roll. Do not truncate locked events to enforce limits; reject oversized results. Existing defaultSections remains the 32-bar template for compatibility.

UI proposal choice is temporary, applying a proposal updates arrSections and history but not current MIDI. Existing arrBuild/section export use the wrapped arrangeClip. Tests: test/arranger.js and test/arranger-browser.js, including combined wild groove and end transitions. No new audio model or audio effects.

## 2.7 — performance layer

expression-engine.js exposes MidiroomExpression.expressClip. expression.js loads last; afterSessionGeneration wraps locks restoration then applies the configured feel before source snapshot/history. varySession applies expression after rhythmVariation/relateParts only to targeted tracks. Manual expression uses finishSession with new seed. cleanSessionConfig persists performance off/natural/pocket/bold, default natural. Existing project notes stay exact on import; only subsequent generation uses the default. Repeated manual passes intentionally accumulate; Undo is the comparison mechanism.

Vocal timing stays exact and its live serial remains valid. No new audio model. Kick is untouched. No live singer quality validation. All transformed clips customEdit=true; export project/take for exact MIDI.

## 2.8 — Scene Launcher and Studio skin

src/scenes.js wraps projectPayload/cleanProject/loadProject, keeps sessionScenes separate from recursive musical snapshots, and uses exact cleaned note snapshots with live vocal links removed. Scene launch restores captured session/source/sound then plays immediately. It is not beat-quantized. MIDI Undo restores the prior playing session; slot Capture/Clear/Rename are not in MIDI history. Limits 4 slots, 32 bars/20k notes per clip and source, scene bytes limit and overall project guard.

src/skin.js owns a local visual preference only (midiroom.skin). Final theme.css section defines Studio/Night palette and scene cards. SKIN and SCENES markers load after expression/discovery/projects. All code stays inline in built index.html. No external font or imagery dependency.

## 3.0 — tool engines and unified tray

New modules follow the original skin/scenes/expression: sculptor-engine + sculptor, midi-import + groove, conversation-engine + conversation, then studio.js. studio.js reparents the three panels (#phraseSculptor/#grooveDNA/#vocalConversation) above #rollViewport and leaves existing #vocalDrawer under the main roll. selectStudioTool handles accessible tabs. Keep live element IDs intact, since old handlers own the moved controls.

Sculptor pure API sculptPhrase returns immutable range-limited candidates; preview delegates to listenDiscovery and apply uses finishSession. Exact untouched events and locked parts must stay exact. Canvas drag is active only on Sculptor tab; numeric range is keyboard/touch fallback. Seeded alternatives must differ for every direction; drums must not be shifted into melodic pitches.

readMidiFile converts PPQ to 480 ticks, parses track/channel note events and sustain. Groove DNA uses a first-cycle profile (not folded repetitions), reuses target harmonic groups and limits total clip notes. Import replaces one selected track at session tempo/length; no tempo automation/pitchbend/patch import. Preserve async load generation guards.

conversationClip uses sanitized vocal segments and activity/rest windows. Closeness0 is exact no-op, targets/locks remain protected, and output sizes/overlaps are guarded. Candidate metadata uses compatible answer/support modes; do not invent vocalHarmony without actually applying reharmonization. Set vocalLinked before finishSession so playback/history capture the correct association. UI target choices survive redraw and preview restoration.

New vector identity lives in assets/midiroom-mark.svg and is inlined by studio.js. Final theme.css section owns the 3.0 palette and panel styling. No external imagery/font/network dependency.
