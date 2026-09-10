# Changelog

## 2.0 — MIDIROOM

### Werkruimte

- KICKROOM hernoemd naar MIDIROOM, inclusief exports, notities en package-identiteit.
- Nieuwe graphite/lime-vormgeving met aparte instrumentkleuren.
- Compacte instrumentrijen, drie groepen, afzonderlijke aan/uit- en instellingenbediening.
- Piano-rollfilter per instrument, notenliniaal, actieve legenda en cliplengte in seconden.
- Tabs voor generator, tools, ideeën en MIDI-controle; toetsenbordnavigatie en schermlabels.
- Geen externe fonts meer: app blijft volledig offline.

### Generatie

- Nieuwe presets: Dubstep, Drum & bass, Liquid DnB, UK garage en Neurofunk.
- Eigen halftime, two-step, liquid ghostnote- en garage-drumpatronen.
- Nieuwe bass-ritmes: Dubstep space, Reese sustain, DnB syncopated en Garage bounce.
- Acht extra screechstijlen met 32sten, echte triolen, rusten, call-and-response en frase-evolutie.
- Opties voor vaste/evoluerende frases en vier toonbewegingsvormen bij nieuwe screechstijlen.

### Productietools

- Sample-grondtoontranspositie inclusief octaaf en cents.
- Loopduur, stretchduurpercentage, snelheidsfactor en re-pitch-interval.
- Bestaande toon-/delay-/kicktools verhuisd naar eigen werkruimte; productiebrief als markdown.
- Idea Bank met namen, restore, lokale opslag, JSON-export/import en foutafhandeling.
- MIDI Check met technische validiteit, toonladdercontrole, dubbele kicks, lage basnoten en indicatie van veel voorgrondpartijen.

### Gerepareerd

- Volume 0 gebruikte door `value || 80` het standaardvolume.
- Kwintselectie genereerde grondtoon + terts.
- Screech-octaafaccenten werden door het te nauwe register teruggevouwen.
- Noten konden voorbij het ingestelde clipeinde doorlopen.
- Stille laatste tellen waren niet in het end-of-track-event vastgelegd.
- Melodische partijen konden op het GM-drumkanaal terechtkomen.
- Bass/screech konden over verschillende toonhoogtes onbedoeld overlappen.
- Arrangementen konden uitgeschakelde instrumenten opnieuw toevoegen.
- Solo op een niet-aanwezige partij kon de rest stil maken.
- Vrije modus werd na herladen vervangen door Rawstyle.
- De sessielog-deduplicatie miste onder meer stijl, swing en part-variaties.
- Seedtekst werd rechtstreeks in HTML ingevoegd; nu escaped. URL- en importdata worden gevalideerd.
- Ongeldige BPM-invoer wordt zichtbaar op de gebruikte waarde begrensd.
- Akkoordenschema wordt niet meer willekeurig verwisseld als alleen energie verandert en het bestaande schema bij het genre past.
- Stijltoelichtingen en structuuromschrijving worden bij herstel bijgewerkt.
- MIDI-writer kopieert niet langer de gehele trackbuffer voor iedere delta.

## 1.1

Aangeleverde basis: bestaande MIDI-generator, acht genre-presets, twaalf instrumenten, Web Audio, arrangementpresets, URL-state en sessienotities. Het oorspronkelijke archief blijft de bron voor historische vergelijking.
