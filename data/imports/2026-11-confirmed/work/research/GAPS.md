# Gap list for the Neesh title import

Read BRIEF.md in this directory first for tools, rules and the cover-candidate schema. Each title below already has a research file at research/out/<batch>/<key>.json; read it before you start so you do not repeat work. Work only from the open web; do not contact anyone.

Write results to research/gaps/<key>.json, one file per key, as soon as that key is done. Each file is an object with any of:
- `cover_candidates`: list in the BRIEF schema (url, source_type, page_url, issue_label, width, height measured with identify, notes). Flat front cover of the named issue only, publisher first, then distributor, then stockist. At least 1000px on the long edge if it exists anywhere; otherwise the best available, with the size noted.
- `country`, `city`: ISO alpha-2 and city, with `location_evidence_url` (a page on the publisher's own site, a legal notice, a company register, or failing that a reliable third party, named as such).
- `publisher_name`, `publisher_website` where asked.
- `notes`: what you could and could not establish.

## Covers wanted

- 15-sonshine (batch6): Sonshine Issue 31 "Boys to Men". Publisher only shows a lifestyle photo.
- 15-the-toe-rag (batch7): The Toe Rag. Confirm whether Issue 9 "Fictions" has shipped (thetoerag.com, stockists) and give its cover; if Issue 9 is still pre-order, give the Issue 8 cover and say so.
- 16-the-walrus (batch7): The Walrus November 2026 issue cover. thewalrus.ca blocks fetches; try its store, Magazines Canada, newsstand listings, press.
- 16-wunderdog (batch8): Wunderdog Issue 10. Publisher returns 403; try stockists.
- 06-c-41 (batch2): C41 Issue 19 "Tactile Realities". Publisher image URLs reset the connection; try KD Presse, Ra & Olly stockists, magCulture.
- 06-adbusters (batch1): Adbusters #187 flat cover (publisher shows mockups only).
- 04-prairie-fire (batch6): Prairie Fire Fall 2026 (Vol 47 No 3) cover; the site is behind a bot wall, try cached pages, Magazines Canada, stockists.
- Larger versions wanted (current best in brackets): 02-10-women 10 Magazine Issue 77 (584px); 10-applied-arts Summer 2026 (238px); 01-fucking-young Issue 28 (682px); 05-maisonneuve Issue 101 (600px); 01-p-l-s-magazine PLS 41 (606px); 01-subterrain-magazine Issue 103 (468px); 02-doesnt-exist Issue Seven (545px); 16-le-matricule-des-anges N°278 (354px); 10-richardson A12 (920px square letterbox); 12-sandweegies Issue 03 (794px); 13-jewish-currents Fall 2026 (640px); 10-watershed-sentinel Dec 2026/Jan 2027 (500px); 14-filling-station Issue 86; 18-freefall Fall 2026.

## Locations wanted

- 08-hube (batch4): country and city of hube magazine (hubemag.com). Try legal notices, company registers, shop metadata, distributor listings, press.
- 08-mulieris (batch5): city of Studio Mulieris / Mulieris Magazine (Italy).
- 14-wonderland (batch8): city where Wonderland is made (Visual Talent Limited).
- 10-exit (batch3): city of EXIT magazine.
- 16-folding-rock (batch3): city of Folding Rock Ltd (Wales).
- 13-novembre (batch5): city of Novembre Global.
- 15-badlon-magazine (batch1): city of Badlon.
- 02-permanent-style (batch6): city of Permanent Style.
- 03-lost (batch5): country and city of LOST magazine / volume press.
- 15-odda (batch5): city and country of ODDA Magazine; also a reachable publisher page and cover price if the site answers.
- 05-dry-clean-only (batch3): who publishes Dry Clean Only (company, website, city); the magazine's own domain is parked.

When all keys have files, reply with a short summary (under 250 words) of what was found and what remains missing.
