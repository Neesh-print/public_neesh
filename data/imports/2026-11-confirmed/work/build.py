#!/usr/bin/env python3
"""Merge research JSON, curation JSON and cover manifests into the canonical
import CSVs (data/imports/2026-11-confirmed/batch-NN.csv) plus the report CSV.

Usage: python3 -I build.py [--write]
Without --write it only prints the checks (slug collisions to verify, rows
held back and why)."""
import csv, glob, json, os, re, sys, unicodedata
from collections import OrderedDict

W = '/tmp/claude-0/-home-user-public-neesh/5d656abd-f601-5db4-b898-6930cac2e772/scratchpad/work'
REPO = '/home/user/public_neesh'
OUT_DIR = os.path.join(REPO, 'data/imports/2026-11-confirmed')
TODAY = '2026-11-19'
WRITE = '--write' in sys.argv

TAGS = {'art','design','fashion','film','food','ideas-science','identity-politics','lifestyle','literary','music','nature','news','photography','place','sport','travel'}
IDENTITY = {'black-led','decolonial','diaspora','gender-expansive','indigenous-led','queer-led','women-led'}
FREQ = {'weekly','monthly','bimonthly','quarterly','triannual','biannual','annual','irregular','evergreen'}
BANNED = ['celebrates','explores','delves','showcases','curated','stunning','beautifully','lovingly','gorgeous','must-read','love letter to']
SEASON = {'spring':'03','summer':'06','fall':'09','autumn':'09','winter':'12'}

def slugify(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:80]

def load_json(p):
    d = json.load(open(p))
    return d[0] if isinstance(d, list) else d

# ---- inputs
research = OrderedDict()
for f in sorted(glob.glob(f'{W}/research/out/batch*/*.json')):
    research[os.path.basename(f)[:-5]] = load_json(f)
curate = {}
for f in sorted(glob.glob(f'{W}/curate/*.json')):
    for k, v in json.load(open(f)).items():
        curate.setdefault(k, {}).update(v)
covers = {}
for f in glob.glob(f'{W}/covers/*.json'):
    covers[os.path.basename(f)[:-5]] = json.load(open(f))
pub_map = {}
if os.path.exists(f'{W}/publisher_map.json'):
    pub_map = json.load(open(f'{W}/publisher_map.json'))
existing_title_slugs = set()
if os.path.exists(f'{W}/existing_title_slugs.txt'):
    existing_title_slugs = set(open(f'{W}/existing_title_slugs.txt').read().split())
input_rows = {r['title']: r for r in csv.DictReader(open(f'{W}/input.csv'))}

# titles handled before research (duplicates and removed)
PRE = {
    'Brick, A Literary Journal': ('already', 'Brick', 'brick', 'Brick', 'Already on the Index as Brick.'),
    'Offie Mag': ('already', 'Off Licence', 'off-licence', 'Off Licence', 'Already on the Index as Off Licence (Off Licence Magazine).'),
    'Purple Fashion': ('already', 'Purple', 'purple', 'Purple', 'Already on the Index as Purple.'),
    'The Whitney Review of New Writing': ('already', 'The Whitney Review', 'the-whitney-review', 'The Whitney Review', 'Already on the Index as The Whitney Review.'),
    'JRNY': ('skipped', 'JRNY Travel Magazine', 'jrny-travel-magazine', 'JRNY Travel Magazine', 'Previously removed from the Index (removed = true on jrny-travel-magazine); not re-added.'),
}

def issue_number(label):
    if not label: return None
    m = re.search(r'(?:issue|no\.?|n°|nº|#|vol\.?\s*\d+\s*(?:issue|no\.?)|\b)\s*(\d+(?:\.\d+)?)\b', label, re.I)
    # Prefer an explicit marker; fall back to first integer if the label is just a number word
    m2 = re.search(r'(?:issue|no\.?|n°|nº|#)\s*(\d+(?:\.\d+)?)', label, re.I)
    if m2: return m2.group(1)
    m3 = re.fullmatch(r'\D*?(\d+)\D*', label)
    if m3 and not re.search(r'(19|20)\d\d', m3.group(1)): return m3.group(1)
    return None

def issue_date(r):
    d = r.get('latest_issue_date'); p = r.get('latest_issue_date_precision')
    if not d: return None
    if p == 'year':
        lab = (r.get('latest_issue_label') or '').lower()
        for k, mm in SEASON.items():
            if k in lab: return f'{d[:4]}-{mm}-01'
    return d

def check_description(desc):
    problems = []
    if '—' in desc: problems.append('em dash')
    if ':' in desc: problems.append('colon')
    if re.search(r'not just [^.]+,? but ', desc, re.I): problems.append('not just X but Y')
    low = desc.lower()
    for b in BANNED:
        if b in low: problems.append(f'banned word {b}')
    n = len(re.findall(r'[.!?](?=\s+[A-Z\"]|\s*$)', desc))
    if n < 2 or n > 3: problems.append(f'{n} sentences')
    return problems

rows = []      # import rows
report = []    # report rows
held = []      # not importable yet
seen_title_slugs = set(existing_title_slugs)

def report_row(**k):
    base = dict(input_title='', final_name='', slug='', publisher='', action='', reason='', cover_found='', cover_source_url='', notes='')
    base.update(k); report.append(base)

for t, (action, name, slug, pub, reason) in PRE.items():
    report_row(input_title=t, final_name=name, slug=slug, publisher=pub, action=action, reason=reason)

pub_slug_for = {}
for key, r in research.items():
    c = curate.get(key, {})
    it = r['input_title']
    action = c.get('action', 'add')
    if action in ('skip', 'already', 'check'):
        report_row(input_title=it, final_name=c.get('name', r.get('official_name')), publisher=r.get('publisher_name') or '',
                   action='already on Index' if action == 'already' else 'skipped', reason=c.get('reason', ''))
        continue
    if r.get('qualifies') != 'yes' and 'description' not in c:
        report_row(input_title=it, final_name=r.get('official_name'), publisher=r.get('publisher_name') or '', action='skipped',
                   reason=r.get('qualifies_reason') or 'did not qualify')
        continue
    if 'description' not in c:
        held.append((key, 'no curation yet')); continue
    name = c.get('name') or r['official_name']
    pub_name = c.get('publisher_name') or r['publisher_name']
    country = c.get('country') or r.get('country')
    city = c.get('city') or r.get('city')
    freq = c.get('frequency') or r.get('frequency')
    if freq not in FREQ: held.append((key, f'frequency {freq}')); continue
    if not country: held.append((key, 'no country')); continue
    if country != 'US' and not city: held.append((key, 'non-US title without city')); continue
    for k in ('latest_issue_label','latest_issue_date','latest_issue_date_precision','latest_issue_source_url','cover_price','currency','subscribe_url','trim_size','page_count','publisher_website'):
        if k in c: r[k] = c[k]
    tags = c['tags']; assert all(x in TAGS for x in tags), (key, tags)
    ident = c.get('identity', []); assert all(x in IDENTITY for x in ident), (key, ident)
    probs = check_description(c['description'])
    if probs: held.append((key, 'description: ' + ', '.join(probs))); continue
    tslug = slugify(c.get('title_slug') or name) or 'untitled'
    if tslug in seen_title_slugs:
        held.append((key, f'title slug collision {tslug}')); continue
    seen_title_slugs.add(tslug)
    pslug_candidate = slugify(c.get('publisher_slug') or pub_name)
    pslug = pub_map.get(pslug_candidate, pslug_candidate)
    cov = covers.get(key, {})
    cov_ok = cov.get('status') in ('ok', 'low')
    row = OrderedDict([
        ('publisher_name', pub_name), ('publisher_website', r.get('publisher_website') or ''), ('publisher_email', ''),
        ('publisher_country', country), ('publisher_city', city or ''), ('publisher_slug', pslug),
        ('title_name', name), ('title_slug', tslug), ('description', c['description']), ('frequency', freq),
        ('cover_price', '' if r.get('cover_price') in (None, '') else str(r['cover_price'])), ('currency', r.get('currency') or ''),
        ('page_count', '' if not r.get('page_count') else str(int(r['page_count']))), ('trim_size', r.get('trim_size') or ''),
        ('country', country), ('city', city or ''), ('tags', '|'.join(tags + ident)), ('primary_tag', tags[0]),
        ('status', c.get('status', 'active')), ('last_issue_date', issue_date(r) or ''), ('verified_at', ''),
        ('subscribe_url', r.get('subscribe_url') or ''), ('review_status', 'pending'),
        ('cover_url', cov.get('url', '') if cov_ok else ''), ('cover_page_url', (cov.get('page_url') or '') if cov_ok else ''),
        ('cover_source_type', (cov.get('source_type') or '') if cov_ok else ''),
        ('issue_label', r.get('latest_issue_label') or ''), ('issue_number', issue_number(r.get('latest_issue_label')) or ''),
        ('issue_date', issue_date(r) or ''), ('issue_source_url', r.get('latest_issue_source_url') or ''),
    ])
    rows.append((key, row))
    notes = c.get('note', '')
    if cov.get('status') == 'low': notes = f"Cover is {cov.get('width')}x{cov.get('height')}, below 1000px. " + notes
    if cov.get('status') in ('failed', 'none') or not cov: notes = 'No usable cover found. ' + notes
    report_row(input_title=it, final_name=name, slug=tslug, publisher=pub_name, action='added',
               cover_found={'ok': 'yes', 'low': 'low resolution'}.get(cov.get('status'), 'no'),
               cover_source_url=cov.get('url', '') if cov_ok else '', notes=notes)

print(f'research files {len(research)}, import rows {len(rows)}, report rows {len(report)}, held {len(held)}')
for h in held: print('  HELD', h)
# collision checks for SQL
print('\nTITLE SLUGS:', ' '.join(sorted(r['title_slug'] for _, r in rows)))
print('\nPUBLISHER SLUGS:', ' '.join(sorted({r['publisher_slug'] for _, r in rows})))
doms = set()
for _, r in rows:
    m = re.match(r'https?://(?:www\.)?([^/]+)', r['publisher_website'] or '')
    if m: doms.add(m.group(1).lower())
print('\nPUBLISHER DOMAINS:', ' '.join(sorted(doms)))

if WRITE:
    os.makedirs(OUT_DIR, exist_ok=True)
    for old in glob.glob(f'{OUT_DIR}/batch-*.csv'): os.remove(old)
    cols = list(rows[0][1].keys())
    for i in range(0, len(rows), 20):
        n = i // 20 + 1
        with open(f'{OUT_DIR}/batch-{n:02d}.csv', 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
            for _, r in rows[i:i+20]: w.writerow(r)
    with open(f'{OUT_DIR}/report.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(report[0].keys())); w.writeheader(); w.writerows(report)
    json.dump([{'key': k, 'slug': r['title_slug'], 'cover': bool(r['cover_url'])} for k, r in rows], open(f'{W}/upload_map.json', 'w'), indent=1)
    print(f'\nwrote {(len(rows)+19)//20} batch files and report.csv to {OUT_DIR}')
