# RONDO — voetbalmanager

Een complete voetbalmanager die volledig in de browser draait. Geen server, geen installatie:
open `index.html` en je speelt. Als PWA kun je hem op je beginscherm zetten en offline spelen.

## Wat er in het pakket zit
| bestand | waarvoor |
|---|---|
| `index.html` | het hele spel: engine, data en interface in één bestand |
| `manifest.webmanifest` | maakt er een installeerbare app van (naam, kleuren, iconen) |
| `sw.js` | service worker; bewaart het spel zodat het offline werkt |
| `icon-192.png` · `icon-512.png` · `icon-maskable.png` | app-iconen voor je beginscherm |
| `.nojekyll` | zorgt dat GitHub Pages de bestanden onbewerkt serveert |
| `README.md` | dit bestand |

## Wat er in het spel zit
- 30 competities in 21 landen, inclusief de Keuken Kampioen Divisie — 537 clubs en ruim 15.000 spelers, van de Premier League tot League Two,
  met Turkije, Polen, Schotland, Denemarken, Oostenrijk, Zwitserland, Argentinië, Brazilië en Saoedi-Arabië
- Champions League, Europa League en Conference League in het huidige format (36 clubs, acht duels,
  tussenronde, knock-out) met een vijfjarige coëfficiëntenlijst
- Nationale bekers en supercups per land, UEFA Super Cup, interlandperiodes met eindtoernooi,
  transfermarkt met onderhandelingen, deadline day, huurcontracten, scouting, training, moraal,
  jeugdopleiding, bondscoachcarrière, derby's en publiekssfeer
- Live wedstrijden minuut voor minuut met rustmoment, wissels en tactische bijsturing

## Nieuw in deze versie (FC 27-update)
- Spelersdata bijgewerkt naar **EA FC 27**-ratings (FUTBIN, 22-09-2026) voor ruim 10.700 spelers; de rest schuift een jaar door
  volgens het gemiddelde FC26→FC27-verloop. Een nieuwe carrière start in **2026/27**.
- **Dynamic OVR**: vorm, moraal en wedstrijdfitheid tellen zichtbaar op of af bij elke speler.
- **Wedstrijdfitheid** (piekfit → vermoeid) en **hervalrisico** na een blessure.
- **Zes groeiprofielen**: vroege bloeier, laatbloeier, evergreen, atleet, technicus en standaard.
- **Transferclausules**: betalen in 2 of 3 termijnen, doorverkooppercentages (bij kopen én verkopen) en een
  **interessemeter** die laat zien hoe graag een speler komt.
- **Onthulling** van nieuwe aanwinsten met fanreacties — van contract tekenen tot stadionpresentatie.
- **Rivalen** doen onderling vrijwel geen zaken; **licentiecommissie** met puntenaftrek bij structurele rode cijfers.
- Wedstrijdmotor opnieuw geijkt per competitie: ±2,8 goals per duel, kampioenen rond 85 punten, sterke ploegen eindigen vaker bovenaan.
- Saves van de vorige versie worden automatisch bijgewerkt.

## Online zetten via GitHub Pages
1. Maak een nieuwe repository (public), bijvoorbeeld `rondo`.
2. Upload **alle** bestanden uit dit pakket in de hoofdmap — niet alleen `index.html`.
3. Settings → Pages → Source: `Deploy from a branch`, branch `main`, map `/ (root)`.
4. Na een minuut staat het spel op `https://<gebruikersnaam>.github.io/rondo/`.
5. Open die link op je telefoon en kies "Zet op beginscherm".

## Opslag
Het spel bewaart je carrière in de browser (IndexedDB) en heeft drie handmatige slots plus een automatische
veiligheidskopie van vlak vóór elke jaarwisseling.
Saves zijn gzip-verpakt (~0,7 MB). Via Wereld → Opslaan kun je exporteren naar een bestand en
weer importeren — handig om je carrière naar een ander apparaat te verhuizen.

## Eigen clublogo's
Standaard tekent RONDO zelf een embleem per club. Heb je een eigen logopakket, vul dan bij
Wereld → Opslaan → Clublogo's een adres in met `{naam}`, `{slug}` of `{id}` als plek voor de club,
bijvoorbeeld `https://mijnsite.nl/logos/{slug}.png`. Ontbreekt een logo, dan valt het spel
automatisch terug op de eigen tekening.

## Bijwerken
Vervang `index.html` door een nieuwe versie en hoog in `sw.js` het versienummer op
(`const CACHE = "rondo-v48"`), anders blijven bezoekers de oude versie uit hun cache zien.
