# Samenwerken met een AI aan een export

Elke export levert twee bestanden op: de `.mid` en een `_notes.md` met dezelfde naam.
Dat markdownbestand is bedoeld als overdrachtsdocument. Je kunt het aan een andere
assistent geven zonder verder iets uit te leggen.

## Wat er in staat

- **Muzikale gegevens** — toonsoort, Camelot-code, tempo, aantal maten, akkoordschema,
  harmonisch ritme, akkoordopbouw, swing, genre-voorinstelling en de seed
- **Toonladder en akkoorden uitgespeld** in notennamen, niet in cijfers
- **Sectie-indeling** als er een structuur is gebruikt, met beginmaat en lengte
- **Alle sporen** met aantal noten, bereik, gebruikte stijl en articulatie
- **Technische aannames** — MIDI-type, ticks per kwartnoot, drum rack-indeling,
  waarom de velocities vlak zijn
- **Delaytijden** in ms bij dat tempo, recht, gepunteerd en triool
- **Kickfrequenties** in Hz voor de grondtoon over vijf octaven
- **Harmonisch mixen** — welke toonsoorten erop passen
- **Reproductie** — de instellingen in woorden plus een link die de hele staat terugzet

## Waarom dit werkt

Het probleem bij het overdragen van een MIDI-bestand is dat de context ontbreekt. Een
assistent kan uit de noten wel de toonsoort raden, maar niet weten dat de velocities
met opzet vlak zijn, dat maat 33 een breakdown is, of welke seed het terugbrengt.

## Volgende stap teruggeven

Als de andere assistent iets wil laten aanpassen, is de seed plus de link genoeg. De
generator is deterministisch: dezelfde seed met dezelfde instellingen geeft byte-identieke
MIDI. Een wijziging is dus altijd reproduceerbaar te beschrijven als "dezelfde link, maar
met stijl X op partij Y".
