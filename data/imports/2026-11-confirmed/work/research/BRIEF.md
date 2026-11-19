# Research brief: independent magazine titles for the Neesh Index

You are researching a batch of print magazines so they can be added to a public directory of independent magazines. Work only from the open web. Do not contact anyone. Do not scrape lists of stockists or shops. Every fact you record must come with the URL you saw it on.

## Tools and tips

- Fetch pages with Bash: `curl -sL -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" --max-time 25 URL`. Outbound HTTPS works through a proxy; do not change proxy or TLS settings. If a site refuses (403, 429, empty), note that and fall back to a distributor or stockist listing.
- Many publisher shops run on Shopify. `https://SHOP/products.json?limit=250` returns every product with price, images (full-size `src` URLs, `width`, `height`), `published_at`, `body_html`. Also try `/collections/all/products.json`. Squarespace shops: append `?format=json-pretty` to a product URL. WooCommerce: `/wp-json/wc/store/v1/products?per_page=50`. Big Cartel: `/products.json`.
- Pull page text with `curl ... | python3 -c "import sys,re,html;t=sys.stdin.read();t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S);print(html.unescape(re.sub(r'<[^>]+>',' ',t)))" | tr -s ' \n' | head -c 20000`.
- Check an image's size before recording it: `curl -sL -A "Mozilla/5.0" -o /tmp/img URL && identify -format "%w x %h %m\n" /tmp/img` (ImageMagick `identify` is installed). Shopify CDN images accept a `width=` query parameter and the original is served without the `_WIDTHx` suffix.
- Use WebSearch (load it with ToolSearch "select:WebSearch" if it is not in your tool list) to find the official site when you do not know it. Stockist pages at magculture.com, doyoureadme.de, athenaeum.nl, papercutshop.se, picsandink.com, antennebooks.com, kdpresse.com and publicknowledgebooks.com are acceptable as evidence of latest issue and as a cover fallback, never as the primary source for who publishes a title.
- Budget: a few minutes per title. If a site is unreachable after two attempts, record what you have and move on.

## What to collect per title

Fields (use null when not established, never guess):

- `input_title`: exactly as given in your list.
- `official_name`: the spelling the publisher itself uses on its own site and masthead. Keep its casing, accents and punctuation. Drop a trailing "Magazine" only if the publisher does not use it.
- `publisher_name`: the company or organisation that publishes it. Often the same as the title. Use the imprint name shown on the site, legal notice or about page.
- `publisher_website`: homepage, full https URL.
- `country`: ISO 3166-1 alpha-2 of the publisher's base.
- `city`: city where the magazine is made. Required for every non-US title, so look at the imprint, legal notice, about page, contact page or shop address.
- `frequency`: one of weekly, monthly, bimonthly, quarterly, triannual, biannual, annual, irregular. Derive it from the publisher's own statement or from the actual issue cadence over the last two years. If they disagree, the cadence wins.
- `cover_price` and `currency`: the price of the current single issue in the publisher's own shop, with ISO 4217 currency.
- `trim_size` and `page_count`: only if stated on the publisher's site or the issue listing.
- `subscribe_url`: the publisher's own subscribe or shop page, if any.
- `latest_issue_label`: e.g. "Issue 63", "No. 14", "Vol 78 Issue 6", "Winter 2026".
- `latest_issue_date`: YYYY-MM-DD when known, else YYYY-MM-01 for a month, else YYYY-01-01 for a year, with `latest_issue_date_precision` set to day, month or year. This is the publication date of the most recent PRINT issue that is actually out (not a pre-order that has not shipped, though a pre-order is fine evidence that the title is alive).
- `latest_issue_source_url`: where you saw the latest issue.
- `independent`: yes, no or unclear, with `independence_evidence`. A title fails if it is owned by a large media group (Condé Nast, Hearst, Bauer, Future, Immediate, Axel Springer, Burda, Mondadori and the like), or is a corporate or brand customer magazine. University, charity and foundation publishers are fine. A small publishing company with several magazines is fine.
- `has_issue_out`: yes or no.
- `printed_since_2025`: yes, no or unclear. Must be yes to qualify: a print issue dated January 2025 or later.
- `qualifies`: yes or no, with `qualifies_reason` in one sentence.
- `what_it_is`: two or three plain sentences in your own words saying what the magazine covers, its format or angle, and who would want it. Facts only, no praise. Do not copy or paraphrase the publisher's or a shop's blurb sentence by sentence. Do not mention founders, editors, funding or how it is run.
- `suggested_primary_tag`, `suggested_secondary_tag`: from this fixed list only: art, design, fashion, film, food, ideas-science, identity-politics, lifestyle, literary, music, nature, news, photography, place, sport, travel. Secondary may be null.
- `identity_tags`: from black-led, decolonial, diaspora, gender-expansive, indigenous-led, queer-led, women-led, and only when the publisher states it plainly on its own site. Give `identity_tag_evidence_url`. Otherwise an empty list.
- `cover_candidates`: a list, best first. Each has `url` (direct image URL), `source_type` (publisher, distributor or stockist), `page_url` (the page the image appears on), `issue_label`, `width`, `height` (measured with identify, or taken from products.json), and `notes`. It must be the front cover of the most recent print issue as a flat image: no mockups, no lifestyle photos, no social media crops, no watermarks, no spreads, no logo. Aim for at least 1000px on the long edge. Record up to three candidates.
- `evidence_urls`: every page you relied on.
- `uncertainties`: anything you were not sure about, in plain words.

## Naming notes you should know

- "10 Men" and "10 Women" are 10 Men and 10 Magazine from the same London publisher (10 Magazine Ltd / Ten Magazine). Record them as two titles under one publisher.
- "EE72" is the company. The magazine is called 72.
- "Offie Mag" is Off Licence Magazine. "Art Review" is ArtReview. "C 41" is C41. "Strangers Guide" is Stranger's Guide. "Alei Journal" is Aleï Journal. "P L S magazine" is PLS. "Purple Fashion" is Purple. Always use the official spelling.
- "Record Culture" must be checked against Record Magazine (record-magazine.com, New York). Report whether they are the same title or different ones.

## Output

Work is resumable. Your instructions name an output directory for your batch. Before starting, list it: a file already there means that title is done, so skip it. After finishing EACH title, immediately write that title's JSON object to `<output dir>/<NN>-<slug>.json` (NN is the row number in your CSV, two digits; slug is a lowercase hyphenated form of the input title). Write it with Python (`json.dump`) so it is valid JSON. Do not wait until the end to write results: the session can be interrupted and everything not yet written is lost.

When every title has a file, reply with a short summary: how many titles qualified, which did not and why, and which have no usable cover. Keep the summary under 300 words; the JSON files are the deliverable.
