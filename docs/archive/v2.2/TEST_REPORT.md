# MIDIROOM 2.2 — testverslag

Getest op 10 september 2026, lokaal in Chromium en Node.js. Broncode en ongewijzigde engine voortgebouwd op 2.1; historische engine-, fuzz- en vocalresultaten staan in `archive/v2.1`. Die omvang is niet opnieuw gedraaid voor deze interfacewijziging.

| Suite | Resultaat |
|---|---|
| Nieuwe DAW-browserflow | 48 controles PASS; geen runtimefouten |
| Bestaande browserflow | 43 controles PASS; geen runtimefouten of externe requests |
| Productiebrowserflow | 33 controles PASS; sound, arrangement, exact herstel, synthetische vocalanalyse en synchronisatie |
| Audio-modeltest | ALL PASS, inclusief envelopes, planning en audio-status |
| DOM-suite | Vaste scenario’s plus 30 willekeurige acties; ALL PASS, nul runtimefouten |

De nieuwe flow controleert trackzoeken, actief-filter, zoom zonder document-overflow, live positie, playhead volgen, focusmodus, snelmenu via toetsenbord, zoeken, Enter, Escape en focusherstel. Alle zeven schermen passen binnen 1440, 1024, 768 en 390 px. Canvasresolutie wordt na een layoutwijziging vergeleken met de werkelijke displaybreedte. Desktop-, mobiele, mixer- en menuscreenshots zijn visueel gecontroleerd.

Tijdens controle opgelost: Escape kon eerst alleen het zoekveld legen; sluit nu expliciet het dialoog. Canvaspixels worden opnieuw getekend bij layoutwijzigingen om uitrekken na resizen te voorkomen. Audiofeedback is voor de gebruiker herschreven; de audio-modeltest controleert de nieuwe actieve/gepauzeerde tekst.

De browserflows zijn uitgevoerd in headless Chromium op Linux; geen live Safari/Firefox of mobiele hardwaretest. Verticale faders gebruiken moderne CSS writing-mode. Vocalvalidatie blijft een synthetische harmonische frase, geen echte zanger. De nieuwe interface verandert die analyse niet en geeft geen extra betrouwbaarheidsgarantie. View-state zoals zoom en zoeken is tijdelijk en verandert MIDI-events niet.

Ruwe resultaten staan in `test-results`. Herhaal met `npm run test:browser`, `npm run test:production`, `npm run test:daw` en de bestaande Node-scripts; browserpaden via CHROMIUM_EXECUTABLE en NODE_PATH zoals beschreven in README.
