// Compiles design-system/previews/**/<name>.html fragments into
// design-system/bundle/<group>/<name>/index.html pages that stand alone:
// fonts linked, tokens + component CSS inlined, the @dsCard marker kept as
// the very first line so the Claude Design pane can index the card.
//
//   node design-system/build.mjs
//
// Zero dependencies. Also copies tokens.css, ds.css, tokens.json, README.md
// and assets/ into the bundle, and writes bundle/manifest.json.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'previews');
const out = join(root, 'bundle');

const FONTS =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap';

const tokens = readFileSync(join(root, 'tokens.css'), 'utf8');
const ds = readFileSync(join(root, 'ds.css'), 'utf8');
const shell = readFileSync(join(root, 'preview.css'), 'utf8');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
for (const f of ['tokens.css', 'ds.css', 'tokens.json', 'README.md']) {
  cpSync(join(root, f), join(out, f));
}

function parseMarker(line, file) {
  const m = line.match(/^<!--\s*@dsCard\s+([^>]*?)\s*-->\s*$/);
  if (!m) throw new Error(`${file}: first line must be a <!-- @dsCard ... --> marker`);
  const attrs = {};
  for (const [, k, v] of m[1].matchAll(/([a-zA-Z]+)="([^"]*)"/g)) attrs[k] = v;
  if (!attrs.group || !attrs.name) throw new Error(`${file}: @dsCard needs group and name`);
  return attrs;
}

function page(marker, attrs, body) {
  const title = `Neesh ${attrs.name}`;
  return `${marker}
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${attrs.subtitle ?? ''}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
${tokens}
${ds}
${shell}
</style>
</head>
<body>
${body.trim()}
</body>
</html>
`;
}

const manifest = [];
for (const group of readdirSync(src)) {
  const gdir = join(src, group);
  if (!statSync(gdir).isDirectory()) continue;
  for (const file of readdirSync(gdir).filter((f) => f.endsWith('.html')).sort()) {
    const raw = readFileSync(join(gdir, file), 'utf8');
    const nl = raw.indexOf('\n');
    const marker = raw.slice(0, nl).trim();
    const body = raw.slice(nl + 1);
    const attrs = parseMarker(marker, `${group}/${file}`);
    const slug = basename(file, '.html');
    const rel = `${group}/${slug}/index.html`;
    mkdirSync(join(out, group, slug), { recursive: true });
    writeFileSync(join(out, group, slug, 'index.html'), page(marker, attrs, body));
    manifest.push({
      path: rel,
      group: attrs.group,
      name: attrs.name,
      subtitle: attrs.subtitle ?? '',
      viewport: { width: Number(attrs.width ?? 1200), height: attrs.height ? Number(attrs.height) : undefined },
    });
  }
}

writeFileSync(join(out, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), cards: manifest }, null, 2) + '\n');
console.log(`built ${manifest.length} cards into ${out}`);
