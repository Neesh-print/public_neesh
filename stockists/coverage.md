# Stockist coverage: Neesh Index, October 2026

Based on the published stockist lists of the magazines on the Neesh Index, collected October 2026.

## Publishers

| | Publishers |
|---|---:|
| On the Index with a website | 296 |
| Stockist list found | 104 |
| ...used in the ranking | 102 |
| No list published (site reachable) | 173 |
| Unreachable (site down, blocked or domain dead) | 19 |

Usable lists cover 102 of 296 publishers (34%). They give 8,758 publisher-store pairs, 5,329 unique stores and 1,408 cities. 544 pairs name a store without a city. They are kept in `stockists_raw.csv` and `stores.csv` but left out of the city ranking.

Left out of the counts:

- **DG Quarterly**: duplicate of Delayed Gratification (dgquarterly.com redirects to slow-journalism.com).
- **Linguaphile**: site redirects to Kuina Books; stockist page does not name Linguaphile.

A list exists, but it could not be read:

- **The Paris Review**: bookstore list behind Cloudflare (403).
- **Foam Magazine**: stockist page behind a Vercel checkpoint (429).
- **Harper's Magazine**: newsstand locator needs a location search (HTTP 402 to fetch).
- **Sidetracked**: /stockists exists (Wayback snapshot 2025-06-14) but the site returns a Cloudflare 403 (counted as unreachable).

Unreachable:

- Aedo Magazine: domain is a parked placeholder; search found no list
- Al Hayya: domain does not resolve; search found no list
- BL8D: site returned 403; search found nothing
- Boston Review: site returned 403 to fetch; search found no stockist list
- CR Fashion Book: site blocked to fetch; search found no stockist list
- Dissent: site returned 403; search found no stockist list
- Kapsel: site returned 503; search found nothing
- L’Étiquette: letiquette.com could not be fetched; search found no stockist list
- MANY OF THEM: site returned 403/503
- Memwa: site returned 503; search found nothing
- Shō Poetry Journal: domain shows Cloudflare Registrar placeholder; search found no stockist list
- Sidetracked: retry failed: sidetracked.com (all paths incl. /stockists, /shop, /sitemap.xml) returns 403 Cloudflare 'Just a moment' challenge with browser UA; Wayback has a 2025-06-14 snapshot of /stockists/ but archive.org page content is not reachable from this environment (connection reset / 403)
- Simulacrum: simulacrummagazine.nl DNS dead; simulacrum.nl 503; search found no list
- SOLO: solo-mag.com DNS not found; search found no stockist list
- Solomiya: site returned 403; search found only distributor (Readellion) and unnamed bookshops
- TANK: site returned 503 on homepage and /stockists; search found no list
- The Believer: site returned 403; search found no stockist list
- The Slow Press: site returned 503; search found no stockist list
- The Whitney Review: domain does not resolve; search found no list

## Cities that rank high mainly because of one title

For each top-30 city, "top title" is the Index title that lists the most stores there. "Only via top title" counts stores that no other Index title lists. If you remove those stores, the city's rank falls to the figure in the last column.

| Rank | City | Unique stores | Index titles | Top title | Top title's stores | Only via top title | Rank without them |
|---:|---|---:|---:|---|---:|---:|---:|
| 1 | London, GB | 313 | 85 | Luncheon | 62 | 25 | 1 |
| 2 | New York, US | 238 | 74 | SLEEK | 33 | 17 | 2 |
| 3 | Paris, FR | 184 | 59 | GAZE | 53 | 34 | 3 |
| 4 | Los Angeles, US | 97 | 61 | Broccoli Mag | 26 | 19 | 5 |
| 5 | Portland, US | 92 | 56 | Broccoli Mag | 35 | 29 | 8 |
| 6 | Melbourne, AU | 75 | 30 | Record Magazine | 19 | 15 | 10 |
| 7 | Milan, IT | 72 | 49 | WHATEVR Fanzine | 20 | 12 | 10 |
| 8 | Berlin, DE | 70 | 54 | Record Magazine | 10 | 1 | 8 |
| 9 | Toronto, CA | 63 | 54 | Brick | 15 | 4 | 10 |
| 10 | San Francisco, US | 61 | 53 | Broccoli Mag | 17 | 9 | 11 |
| 11 | Barcelona, ES | 57 | 41 | Openhouse | 19 | 12 | 13 |
| 12 | Montreal, CA | 48 | 29 | Esse arts + opinions | 17 | 15 | 19 |
| 13 | Seattle, US | 47 | 26 | Broccoli Mag | 16 | 9 | 17 |
| 14 | Tokyo, JP | 42 | 29 | Record Magazine | 7 | 6 | 17 |
| 15 | Amsterdam, NL | 40 | 66 | Nomad Magazine | 9 | 5 | 17 |
| 16 | Philadelphia, US | 40 | 43 | Seen | 7 | 5 | 17 |
| 17 | Madrid, ES | 39 | 26 | MacGuffin | 10 | 7 | 20 |
| 18 | Brussels, BE | 35 | 20 | Behind the Blinds | 10 | 7 | 22 |
| 19 | Chicago, US | 34 | 26 | Broccoli Mag | 13 | 11 | 32 |
| 20 | Copenhagen, DK | 33 | 18 | The Skirt Chronicles | 7 | 5 | 22 |
| 21 | Sydney, AU | 32 | 19 | Lodestars Anthology | 8 | 7 | 27 |
| 22 | Athens, GR | 29 | 18 | Nomas | 17 | 13 | 42 |
| 23 | Lisbon, PT | 28 | 42 | Luncheon | 10 | 8 | 32 |
| 24 | Antwerp, BE | 28 | 33 | Nomad Magazine | 6 | 5 | 32 |
| 25 | Vienna, AT | 27 | 30 | 12F | 4 | 4 | 32 |
| 26 | Rome, IT | 27 | 17 | WHATEVR Fanzine | 9 | 8 | 32 |
| 27 | Vancouver, CA | 26 | 21 | Openhouse | 4 | 3 | 32 |
| 28 | Austin, US | 25 | 24 | Broccoli Mag | 13 | 12 | 50 |
| 29 | Istanbul, TR | 25 | 6 | Cornucopia | 14 | 14 | 67 |
| 30 | Buenos Aires, AR | 25 | 2 | Anchoa | 24 | 24 | 490 |

Flagged (the top title supplies 40% or more of the city's stores, or the city drops 10 or more places without it):

- **Chicago** (#19): Broccoli Mag lists 13 of 34 stores (38%). Without the stores only it lists, the city would rank #32.
- **Athens** (#22): Nomas lists 17 of 29 stores (59%). Without the stores only it lists, the city would rank #42.
- **Austin** (#28): Broccoli Mag lists 13 of 25 stores (52%). Without the stores only it lists, the city would rank #50.
- **Istanbul** (#29): Cornucopia lists 14 of 25 stores (56%). Without the stores only it lists, the city would rank #67.
- **Buenos Aires** (#30): Anchoa lists 24 of 25 stores (96%). Without the stores only it lists, the city would rank #490.

- **Broccoli Mag** is the top title in 6 of the top 30 cities (Los Angeles, Portland, San Francisco, Seattle, Chicago, Austin). These rankings lean on one list.
- **Record Magazine** is the top title in 3 of the top 30 cities (Melbourne, Berlin, Tokyo). These rankings lean on one list.
- Where cities tie on unique stores, the one with more Index titles ranks first.

## Method

- Publishers: every row of `directory_publishers` that has a website (296). Data was read only; nothing was written to the database.
- For each publisher we checked the site for a stockist page (/stockists, /where-to-buy, /find-us, /retailers, footer and nav links). If there was none, we ran one web search for "<name> stockists". Each publisher got at most about 4 fetches. Blocked or JS-only pages got one retry pass, using a plain HTTP fetch, the widget's JSON feed, and the Wayback Machine.
- Each publisher's list records the physical stores only. Online-only shops, distributors, wholesalers and subscription services are excluded.
- Cities are in English. New York is one metro: Brooklyn, Queens and the other boroughs go in the `borough` column. London is handled the same way: neighbourhoods, plus Greater London boroughs such as Croydon and Bromley, become London with the area in `borough`. A few obvious inner suburbs are folded into their city: Fitzroy and Collingwood into Melbourne, Newtown into Sydney, West Perth into Perth, Studio City into Los Angeles, North York into Toronto. Spelling variants of one city are unified (Liège/Liege, Malmö/Malmo, St./Saint).
- Stores are de-duplicated within a city by a normalized name. The normalization lowercases, strips accents and punctuation, treats & as "and", and drops generic words (the, books, bookshop, magazines, news, newsagent, shop, ltd) and a trailing city name. It also merges near-identical spellings (similarity of 0.9 or more), so "Do You Read Me?!" and "Do You Read Me" become one store, as do "Spoonbill & Sugartown" and "Spoonbill and Sugartown Books". Branches stay separate ("Magma Clerkenwell" and "Magma Covent Garden", "McNally Jackson Williamsburg" and "McNally Jackson SoHo").

## Caveats

- **Chains.** Some lists expand chain branches city by city: Delayed Gratification lists WHSmith branches, Epoch Review lists Barnes & Noble, Indigo and Schmitt & Hahn, and Brick lists Indigo and Chapters. Others name the chain once and were skipped. A chain branch listed only by its chain name also merges with other same-named branches in that city. Both effects mainly touch London (WHSmith) and Canadian cities (Indigo).
- **Lists without cities.** BOOT, TAUKO, Sindroms, Icarus Complex, SLEEK (GB, TW, CH), Famous for my Dinner Parties and Athleta mostly give a country but no city. Their stores count toward the store totals but not toward any city.
- **Partial or dated lists.** Noble Rot's page lists 215 stores, of which 209 were captured. Twin's list comes from an older page. On Anchoa's page every listing is marked "agotado" (sold out). Dhoop's full list (12 stores) is on its homepage. Above the Fold lists states only, so its cities were inferred from the store names. On A Rabbit's Foot, some non-UK cities were inferred.
- **Broccoli.** The list behind the stockists page is a wholesale retailer sheet with 769 physical stores, which makes it the largest single list. Its last orders date from 2025 to 2026. It adds weight to US cities, Portland in particular.
- **Portland, US.** Lists rarely give a state, so Portland combines Portland, Oregon with a few Portland, Maine shops.
- **Monocle.** Its list covers only its own shops and cafés.

