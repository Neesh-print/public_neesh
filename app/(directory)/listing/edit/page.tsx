import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { coverPublicUrl, serviceClient } from '@/lib/supabase';
import { canonical, FREQUENCY_LABELS } from '@/lib/seo';
import { currentEditor } from '@/lib/listing/server';
import { STATUSES } from '@/lib/listing/schema';
import type { Frequency, Tag, TitleStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your listing | Neesh',
  alternates: { canonical: canonical('/listing/edit') },
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<TitleStatus, string> = {
  active: 'Currently publishing',
  dormant: 'On hiatus',
  ceased: 'Stopped publishing (takes the page down)',
};

// Every two-letter region Intl knows by name, for the country pickers.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRIES: { code: string; name: string }[] = (() => {
  const out: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (/^(Q[M-Z]|X[A-Z]|ZZ|AA|EU|EZ|UN)$/.test(code)) continue; // user-assigned and groupings
      try {
        const name = regionNames.of(code);
        if (name && name !== code) out.push({ code, name });
      } catch {
        // not a region
      }
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
})();

interface EditPublisher {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  city: string | null;
  country: string | null;
  stockist_page_url: string | null;
}

interface EditTitle {
  id: string;
  publisher_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_path: string | null;
  frequency: Frequency | null;
  cover_price: number | null;
  currency: string | null;
  trim_size: string | null;
  page_count: number | null;
  country: string | null;
  city: string | null;
  status: TitleStatus;
  last_issue_date: string | null;
  subscribe_url: string | null;
  directory_title_tags: { tag_id: string; is_primary?: boolean }[];
}

function CountrySelect({ name, value }: { name: string; value: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ''}>
      <option value="">Not set</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function Notice({ anchor, saved, error, errorFor }: { anchor: string; saved?: string; error?: string; errorFor?: string }) {
  if (error && errorFor === anchor) return <p className="form-error" role="alert">{error}</p>;
  if (saved === anchor) return <p className="form-note" role="status">Saved. The public page is updated.</p>;
  return null;
}

export default async function ListingEditPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; for?: string }>;
}) {
  const editor = await currentEditor();
  if (!editor) redirect('/listing');
  const { saved, error, for: errorFor } = await searchParams;

  if (editor.publisherIds.length === 0) {
    return (
      <section>
        <div className="utility-page roomy">
          <h1>No listing on this address</h1>
          <p className="sub">
            {editor.email} is not the owner of a claimed listing. If you think it should be, email{' '}
            <a href="mailto:hi@neesh.art" className="text-link">hi@neesh.art</a>.
          </p>
          <form action="/api/listing/signout" method="post">
            <button type="submit" className="btn ghost">Sign out</button>
          </form>
        </div>
      </section>
    );
  }

  const db = serviceClient();
  const [{ data: pubs }, { data: titleRows }, { data: tagRows }] = await Promise.all([
    db
      .from('directory_publishers')
      .select('id, name, slug, website, city, country, stockist_page_url')
      .in('id', editor.publisherIds)
      .order('name'),
    db
      .from('directory_titles')
      .select(
        'id, publisher_id, name, slug, description, cover_image_path, frequency, cover_price, currency, trim_size, page_count, country, city, status, last_issue_date, subscribe_url, directory_title_tags(*)'
      )
      .in('publisher_id', editor.publisherIds)
      .eq('removed', false)
      .order('name'),
    db.from('directory_tags').select('*').order('name'),
  ]);
  const publishers = (pubs ?? []) as EditPublisher[];
  const titles = (titleRows ?? []) as unknown as EditTitle[];
  const tags = (tagRows ?? []) as Tag[];
  const subjectTags = tags.filter((t) => t.category === 'subject');
  const identityTags = tags.filter((t) => t.category !== 'subject');

  return (
    <section>
      <div className="wrap listing-edit" id="top">
        <div className="listing-head">
          <div>
            <span className="eyebrow">Your listing</span>
            <h1>Edit your Index page</h1>
            <p className="sub">
              Signed in as {editor.email}. Everything here is public on your page once you save, and
              the page address stays the same if you rename a title.
            </p>
          </div>
          <form action="/api/listing/signout" method="post">
            <button type="submit" className="btn ghost">Sign out</button>
          </form>
        </div>
        <Notice anchor="top" saved={saved} error={error} errorFor={errorFor} />

        {publishers.map((publisher) => (
          <div key={publisher.id} className="listing-publisher">
            <form
              id={`publisher-${publisher.id}`}
              className="listing-card"
              action="/api/listing/publisher"
              method="post"
            >
              <div className="listing-card-head">
                <h2>{publisher.name}</h2>
                <Link href={`/publishers/${publisher.slug}`} className="text-link">
                  View publisher page
                </Link>
              </div>
              <input type="hidden" name="publisher_id" value={publisher.id} />
              <div className="listing-grid">
                <label className="field wide">
                  <span>Publisher name <span className="req">*</span></span>
                  <input name="name" required maxLength={200} defaultValue={publisher.name} />
                </label>
                <label className="field wide">
                  <span>Website</span>
                  <input name="website" type="url" maxLength={500} defaultValue={publisher.website ?? ''} placeholder="https://" />
                </label>
                <label className="field">
                  <span>City</span>
                  <input name="city" maxLength={100} defaultValue={publisher.city ?? ''} />
                </label>
                <label className="field">
                  <span>Country</span>
                  <CountrySelect name="country" value={publisher.country} />
                </label>
                <label className="field wide">
                  <span>Stockist list</span>
                  <input
                    name="stockist_page_url"
                    type="url"
                    maxLength={500}
                    defaultValue={publisher.stockist_page_url ?? ''}
                    placeholder="https://"
                  />
                  <span className="hint">
                    The page on your site that lists the shops carrying you. We read it to show
                    readers where to buy.
                  </span>
                </label>
              </div>
              <Notice anchor={`publisher-${publisher.id}`} saved={saved} error={error} errorFor={errorFor} />
              <button type="submit" className="btn solid">Save publisher details</button>
            </form>

            {titles
              .filter((t) => t.publisher_id === publisher.id)
              .map((title) => {
                const links = title.directory_title_tags ?? [];
                const linkedIds = new Set(links.map((l) => l.tag_id));
                const subjectLinks = links.filter((l) => subjectTags.some((t) => t.id === l.tag_id));
                const primary = (subjectLinks.find((l) => l.is_primary) ?? subjectLinks[0])?.tag_id ?? '';
                const cover = coverPublicUrl(title.cover_image_path);
                const anchor = `title-${title.id}`;
                return (
                  <form
                    key={title.id}
                    id={anchor}
                    className="listing-card"
                    action="/api/listing/title"
                    method="post"
                    encType="multipart/form-data"
                  >
                    <div className="listing-card-head">
                      <h2>{title.name}</h2>
                      {title.status !== 'ceased' && (
                        <Link href={`/titles/${title.slug}`} className="text-link">
                          View title page
                        </Link>
                      )}
                    </div>
                    <input type="hidden" name="title_id" value={title.id} />

                    <div className="listing-grid">
                      <label className="field wide">
                        <span>Title name <span className="req">*</span></span>
                        <input name="name" required maxLength={200} defaultValue={title.name} />
                      </label>
                      <label className="field wide">
                        <span>Description</span>
                        <textarea name="description" rows={6} maxLength={3000} defaultValue={title.description ?? ''} />
                        <span className="hint">What the magazine covers and who it is for, in your own words.</span>
                      </label>

                      <div className="field wide">
                        <span>Cover</span>
                        <div className="listing-cover">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={`Current cover of ${title.name}`} />
                          ) : (
                            <div className="listing-cover-empty">No cover yet</div>
                          )}
                          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a new cover" />
                        </div>
                        <span className="hint">JPEG, PNG or WebP, up to 4 MB. Leave empty to keep the current cover.</span>
                      </div>

                      <fieldset className="field wide listing-niches">
                        <legend>Niche</legend>
                        <label className="field">
                          <span>Main niche <span className="req">*</span></span>
                          <select name="primary_tag" required defaultValue={primary}>
                            <option value="" disabled>Choose one</option>
                            {subjectTags.map((tag) => (
                              <option key={tag.id} value={tag.id}>{tag.name}</option>
                            ))}
                          </select>
                          <span className="hint">Where the title sits in the Index, its breadcrumb and its share card.</span>
                        </label>
                        <span className="listing-sublabel">Also fits (up to two)</span>
                        <div className="listing-checks">
                          {subjectTags.map((tag) => (
                            <label key={tag.id}>
                              <input
                                type="checkbox"
                                name="subject_tags"
                                value={tag.id}
                                defaultChecked={linkedIds.has(tag.id) && tag.id !== primary}
                              />
                              {tag.name}
                            </label>
                          ))}
                        </div>
                        {identityTags.length > 0 && (
                          <>
                            <span className="listing-sublabel">Who makes it (optional)</span>
                            <div className="listing-checks">
                              {identityTags.map((tag) => (
                                <label key={tag.id}>
                                  <input
                                    type="checkbox"
                                    name="identity_tags"
                                    value={tag.id}
                                    defaultChecked={linkedIds.has(tag.id)}
                                  />
                                  {tag.name}
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </fieldset>

                      <label className="field">
                        <span>Status</span>
                        <select name="status" defaultValue={title.status}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Frequency</span>
                        <select name="frequency" defaultValue={title.frequency ?? ''}>
                          <option value="">Not set</option>
                          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Latest issue date</span>
                        <input name="last_issue_date" type="date" defaultValue={title.last_issue_date ?? ''} />
                      </label>
                      <label className="field">
                        <span>Pages</span>
                        <input name="page_count" type="number" min={1} max={5000} step={1} defaultValue={title.page_count ?? ''} />
                      </label>
                      <label className="field">
                        <span>Cover price</span>
                        <input name="cover_price" type="number" min={0} max={10000} step="0.01" defaultValue={title.cover_price ?? ''} />
                      </label>
                      <label className="field">
                        <span>Currency</span>
                        <input
                          name="currency"
                          maxLength={3}
                          defaultValue={title.currency ?? ''}
                          placeholder="USD"
                          pattern="[A-Za-z]{3}"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </label>
                      <label className="field">
                        <span>Trim size</span>
                        <input name="trim_size" maxLength={60} defaultValue={title.trim_size ?? ''} placeholder="230 x 300 mm" />
                      </label>
                      <label className="field">
                        <span>City</span>
                        <input name="city" maxLength={100} defaultValue={title.city ?? ''} />
                      </label>
                      <label className="field">
                        <span>Country</span>
                        <CountrySelect name="country" value={title.country} />
                      </label>
                      <label className="field wide">
                        <span>Subscription page</span>
                        <input name="subscribe_url" type="url" maxLength={500} defaultValue={title.subscribe_url ?? ''} placeholder="https://" />
                        <span className="hint">Shown on your title page as a subscribe link.</span>
                      </label>
                    </div>
                    <Notice anchor={anchor} saved={saved} error={error} errorFor={errorFor} />
                    <button type="submit" className="btn solid">Save {title.name}</button>
                  </form>
                );
              })}
          </div>
        ))}

        <p className="small listing-foot">
          Want a title taken off the Index, or a niche that is not on the list? Email{' '}
          <a href="mailto:hi@neesh.art" className="text-link">hi@neesh.art</a>.
        </p>
      </div>
    </section>
  );
}
