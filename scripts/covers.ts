// Cover pipeline shared by the import. A cover is the flat front of the most
// recent print issue, fetched from the publisher's own site (or a distributor
// or stockist listing when the publisher has nothing usable), re-encoded as
// JPEG and stored at covers/{title_slug}.jpg, the path every existing cover
// uses. Nothing is hotlinked: cover_image_path only ever points at the bucket.
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

// Long edge below this is flagged as low resolution in the import report but
// still stored when it is the best the sources offer.
export const MIN_LONG_EDGE = 1000;

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface FetchedCover {
  jpeg: Buffer;
  width: number;
  height: number;
  sourceFormat: string;
  lowResolution: boolean;
}

// Downloads an image. Throws on a non-2xx response.
export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// Re-encodes an image as a JPEG at its original size. Transparent PNGs are
// flattened on white. Throws when the bytes are not an image.
export async function convertCover(input: Buffer, label = 'image'): Promise<FetchedCover> {
  const image = sharp(input, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height || !meta.format) throw new Error(`not an image: ${label}`);
  const jpeg = await image.flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const longEdge = Math.max(meta.width, meta.height);
  return {
    jpeg,
    width: meta.width,
    height: meta.height,
    sourceFormat: meta.format,
    lowResolution: longEdge < MIN_LONG_EDGE,
  };
}

export async function fetchCover(url: string): Promise<FetchedCover> {
  return convertCover(await downloadImage(url), url);
}

export function coverObjectPath(titleSlug: string): string {
  return `${titleSlug}.jpg`;
}

export async function coverExists(supabase: SupabaseClient, titleSlug: string): Promise<boolean> {
  const { data } = await supabase.storage
    .from('covers')
    .list('', { search: coverObjectPath(titleSlug), limit: 5 });
  return (data ?? []).some((o) => o.name === coverObjectPath(titleSlug));
}

export async function uploadCover(
  supabase: SupabaseClient,
  titleSlug: string,
  jpeg: Buffer
): Promise<string> {
  const path = coverObjectPath(titleSlug);
  const { error } = await supabase.storage.from('covers').upload(path, jpeg, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`upload failed for ${path}: ${error.message}`);
  return path;
}
