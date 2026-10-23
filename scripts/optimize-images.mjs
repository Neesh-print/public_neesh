// Recompresses the large JPEG and PNG assets under public/ in place, keeping
// every filename so no reference changes. Images wider than 2000px are
// scaled down to 2000px; JPEGs are re-encoded with mozjpeg at quality 78. A
// file is only replaced when the result is more than 15% smaller.
//
//   npm run optimize-images            # dry run: report savings only
//   npm run optimize-images -- --write # rewrite the files
//
// Uses the sharp build that Next already installs. Review the changed images
// before committing: re-encoding is lossy.

import sharp from 'sharp';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIRS = ['public/assets', 'public/assets/covers', 'public/curatedpacks/assets'];
const MIN_BYTES = 120_000;
const MAX_WIDTH = 2000;
const write = process.argv.includes('--write');

let before = 0;
let after = 0;
for (const dir of DIRS) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    continue;
  }
  for (const name of names) {
    const path = join(dir, name);
    if (!statSync(path).isFile() || !/\.(jpe?g|png)$/i.test(name)) continue;
    const input = readFileSync(path);
    if (input.length < MIN_BYTES) continue;

    const image = sharp(input, { failOn: 'none' }).rotate();
    const meta = await image.metadata();
    const sized = (meta.width ?? 0) > MAX_WIDTH ? image.resize({ width: MAX_WIDTH }) : image;
    const output = /\.png$/i.test(name)
      ? await sized.png({ compressionLevel: 9, effort: 10 }).toBuffer()
      : await sized.jpeg({ quality: 78, mozjpeg: true, progressive: true }).toBuffer();
    if (output.length >= input.length * 0.85) continue;

    before += input.length;
    after += output.length;
    console.log(
      `${path}: ${meta.width}px ${Math.round(input.length / 1024)}KB -> ${Math.round(output.length / 1024)}KB`
    );
    if (write) writeFileSync(path, output);
  }
}
console.log(
  `${write ? 'rewrote' : 'would rewrite'}: ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB`
);
if (!write && before > 0) console.log('Run with --write to apply.');
