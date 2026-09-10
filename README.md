# KICKROOM

Regelgebaseerde MIDI-generator voor hard dance, house en techno. Eén HTML-bestand, geen model, geen API-sleutel, geen internetverbinding. Dubbelklikken en werken.

De generator maakt geen noten willekeurig. Hij bouwt een motief, varieert dat over de frase, en gooit zwakke varianten weg met een scorefunctie. Alle ritmes en akkoordschema's zijn met de hand ingevoerd uit het genre, niet gegenereerd. De statistische instellingen zijn gekalibreerd tegen een corpus van 111 referentie-MIDI's.

## Snel starten

```bash
git clone <deze repo>
cd kickroom
open index.html          # of dubbelklik het bestand
```

Er is geen build- of installatiestap nodig om het te gebruiken. Alleen om te ontwikkelen:

```bash
npm install              # jsdom, alleen voor de tests
npm run build            # src/ -> index.html
npm test                 # alle vier de testsuites
```

### Op GitHub Pages

Push de repo, ga naar Settings > Pages, kies branch `main` en map `/ (root)`. `index.html` staat in de root, dus de app is direct live.

## Wat het maakt

| | |
|---|---|
| Partijen | 12 — Drums, Kick, Bass, Chords, Pad, Lead, Harmony, Screech, Dark melody, Melody, Pluck, Arp |
| Stijlen | 81 handmatig ingevoerde ritmepatronen |
| Akkoordschema's | 13 |
| Toonladders | 7 |
| Genre-voorinstellingen | 8 |
| Structuren | Kort (32 maten), Volledig (64 maten), Alleen drop (16 maten) |

Export levert een MIDI type 1 met elke partij als eigen spoor, plus een `_notes.md` met alle muzikale en technische gegevens.

## Genres

| Genre | BPM | Toonladder | Kenmerk |
|---|---|---|---|
| Rawstyle | 155 | Frygisch | screech op één noot, offbeat bas, tonale kick |
| Rawphoric | 150 | Natuurlijk mineur | lead met harmonie, akkoorden op hetzelfde ritme, aangehouden bas |
| Gabber | 180 | Frygisch dominant | korte stabs die wel van noot wisselen, rollende kick |
| Frenchcore | 205 | Frygisch | doorlopende tonale kickroll, dichte screech |
| Hardtechno | 150 | Mineur pentatonisch | één akkoord, hypnotische arp, doorlopende achtstenbas |
| House | 125 | Dorisch | dubbele noten en frasen die over de maatstreep heen lopen |
| Melodic techno | 124 | Natuurlijk mineur | trage harmonie, wandelende arp, donkere melodie |
| Euphoric hardstyle | 150 | Natuurlijk mineur | zangerige lead, reverse bass, pompende akkoorden |

Een genre zet tempo, toonladder, schema-pool, harmonisch ritme, akkoordopbouw, swing, welke partijen aanstaan en per partij de stijl, articulatie en opties. Daarna is alles nog los bij te stellen.

## Hoe de noten tot stand komen

Zie [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Kort:

1. **Motief** — één cel in maat 1, uit een contourbank, met tel 1 en 3 op akkoordtonen.
2. **Variatie** — transponeren naar het volgende akkoord in schaaltrappen, staartnoot wijzigen, octaafsprong op de piek, fill in de turnaround. Maten 5-8 antwoorden op 1-4.
3. **Scoren** — 120 varianten per generatie, beoordeeld op intervalverdeling, herhalingsgraad, pieklocatie, ambitus, akkoordverankering en onderling verschil tussen de maten. De hoogste wint.
4. **Nootlengtes** — lengte is het gat min een vaste release (gemeten 0,38-0,5 zestiende in het corpus), niet een percentage.

## Kalibratie tegen echte muziek

`reference/reference_targets.json` bevat gemeten waarden uit 111 referentie-MIDI's: toonhoogtes per maat, noten per maat, ambitus, herhalingsgraad, nootlengteverdeling, velocitybereik en akkoordafstanden. `npm run test:style` zet de generator daar tegenaan en rapporteert elke afwijking groter dan 45%.

Die meting heeft echte fouten blootgelegd: velocities die veel te veel varieerden, een lead-scorefunctie die herhaalde noten afstrafte terwijl het corpus 19% herhaling heeft, akkoorden in grondligging waar het corpus omkeringen gebruikt, en een arp die elke zestiende vulde in plaats van te ademen.

## Tests

| Suite | Wat het controleert |
|---|---|
| `test/fuzz.js` | duizenden willekeurige generaties: noten binnen de toonladder, geldige MIDI-waarden, geen dubbele of overlappende noten, niets buiten de sectie, reproduceerbaarheid per seed |
| `test/domtest.js` | de hele gebruikersinterface in jsdom: 91 assertions over genres, structuren, export, notes.md, studiopaneel, sessielog, mute/solo, afspelen |
| `test/audiotest.js` | of elke stem daadwerkelijk een gain-envelope boven nul opbouwt, en of de iOS-ontgrendeling werkt |
| `test/styletest.js` | de vergelijking met het referentiecorpus |

## Licentie

MIT. Zie [LICENSE](LICENSE).
