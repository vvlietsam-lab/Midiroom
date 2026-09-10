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

## 2.1 — productie en vocals

- Disco en Italo disco, bijbehorende bass-patronen en disco-drums.
- Preview-mixer met echte gain/pan, M/S-reset, undo/redo en A-take.
- Sound Lab met zes synth-startpunten, waveform/cutoff/Q/attack/release/drive/detune en klankrecept-export.
- Arrangementwerkruimte met secties, instrumentkeuzes, duplicatie/volgorde en lengte/velocity.
- Vocal Room met lokale audio-invoer, waveform, Worker-analyse, key-kandidaten, aanzetdetectie, timingvolgende melodie en gezamenlijke playback.
- Exacte MIDI-snapshots en bronclip in Idea Bank; exportversie 3, import v2/v3, bestandsgrootte begrensd tot 12 MB.
- Genrekeuze telt als één undo-stap; tussentijdse gedeeltelijke preset-generaties onderdrukt.
- Bij herladen is bankvalidatie veilig vóór productie-initialisatie; regressie voor dit TDZ-probleem.
- Percussiemixer verwijst niet meer naar niet-bestaande melodische soundsettings.
- Eigen arrangement-/vocalresultaten krijgen een melding over exact bewaren en URL-beperkingen.

## 2.2.0

Compacte DAW-shell; globale transportbalk met maat/tel; verticale mixerfaders; uniforme knoppen en M/S-kleuren; instrumentzoeker/actief-filter; piano-rollzoom/follow/focus; doorzoekbaar snelmenu. Escape-focus hersteld en canvasresolutie volgt layoutwijzigingen. Gewone audio-statusmeldingen vervangen technische contexttekst.
