'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { SignInForm } from '@/components/collect/SignInForm';
import { useTitleSearch } from '@/components/collect/StartSearch';
import { browserClient } from '@/lib/collect/browser';
import { MAX_ADDITIONS_PER_DAY, TOAST } from '@/lib/collect/shared';

// Add a magazine or an issue the Index doesn't have. One job: fill a gap in
// under a minute. Search first, then a short form, then done. Everything a
// reader adds is live right away with a Reader-added label and goes to the
// review queue.

interface Duplicates {
  titles?: { id: string; name: string; slug: string; publisher_name: string }[];
  publishers?: { id: string; name: string; slug: string }[];
  issues?: { id: string; issue_label: string }[];
}

type Mark = 'own' | 'want' | '';

const ERRORS: Record<string, string> = {
  sign_in: 'Sign in first so we can credit the addition to you.',
  invalid: 'Some of the details don’t look right. Check the fields and try again.',
  cover_or_source: 'Add a cover photo, or a link to where the issue is listed.',
  image: 'Covers need to be a JPEG, PNG or WebP under 5 MB.',
  blocked: 'Something in there isn’t allowed. Check the text and links.',
  paused: 'Adding is paused on your account while we review your earlier additions.',
  limit: `That’s ${MAX_ADDITIONS_PER_DAY} additions today, the daily limit. Thanks for all of it.`,
  duplicate_label: 'That issue is already listed under this magazine.',
  not_found: 'We couldn’t find that magazine.',
};

// "@handle" and bare domains become links.
function normaliseLink(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function AddInner() {
  const params = useSearchParams();
  const { ready, session, authedFetch, refresh, notice, track } = useCollect();
  const [step, setStep] = useState<'search' | 'form' | 'done'>('search');
  const [query, setQuery] = useState(params.get('name') ?? '');
  const { results, searched } = useTitleSearch(query);
  const [existing, setExisting] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [name, setName] = useState('');
  const [mark, setMark] = useState<Mark>('');
  const [file, setFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ name: string; slug: string } | null>(null);
  const lastForm = useRef<FormData | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Arriving from a title page ("Add an issue") skips the search.
  useEffect(() => {
    const slug = params.get('title');
    const supabase = browserClient();
    if (!slug || !supabase) return;
    supabase
      .from('directory_titles')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setExisting(data as { id: string; name: string; slug: string });
        setName(data.name as string);
        setStep('form');
      });
  }, [params]);

  function startForm() {
    setExisting(null);
    setName(query.trim());
    setStep('form');
  }

  async function send(form: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await authedFetch('/api/collect/add', { method: 'POST', body: form });
      const data = (await res.json()) as { ok: boolean; error?: string; title_slug?: string; title_name?: string } & Duplicates;
      if (data.ok) {
        await refresh();
        track('collect_add_submitted', { mode: form.get('mode'), mark: form.get('mark') ?? 'none' });
        notice(mark === 'own' ? TOAST.ownAdded : mark === 'want' ? TOAST.wantAdded : TOAST.indexed);
        setDone({ name: data.title_name ?? name, slug: data.title_slug ?? '' });
        setStep('done');
        return;
      }
      if (data.error === 'duplicates') {
        lastForm.current = form;
        setDuplicates({ titles: data.titles, publishers: data.publishers, issues: data.issues });
        return;
      }
      setError(ERRORS[data.error ?? ''] ?? 'That didn’t save. Try again in a moment.');
    } catch {
      setError('That didn’t save. Try again in a moment.');
    } finally {
      setSending(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('mode', existing ? 'issue' : 'title');
    if (existing) form.set('title_id', existing.id);
    if (form.get('link')) form.set('link', normaliseLink(String(form.get('link'))));
    if (mark) form.set('mark', mark);
    if (file) form.set('cover', file);
    send(form);
  }

  function confirmNew(publisherId?: string) {
    const form = lastForm.current;
    if (!form) return;
    if (publisherId) form.set('publisher_id', publisherId);
    form.set('confirm_new', '1');
    setDuplicates(null);
    send(form);
  }

  function reset() {
    setStep('search');
    setQuery('');
    setExisting(null);
    setName('');
    setMark('');
    setFile(null);
    setDone(null);
    setError(null);
  }

  if (step === 'done' && done) {
    return (
      <div className="c-stack">
        <h2 className="c-h2">{done.name} is in the Index.</h2>
        <p className="c-muted c-measure">
          It carries a Reader-added label until we&rsquo;ve checked it, usually within a few days. Thanks for filling
          the gap.
        </p>
        <div className="c-actions">
          <Link href="/collect/shelf" className="c-btn">
            See your shelf
          </Link>
          <button type="button" className="c-textbtn" onClick={reset}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  if (step === 'search') {
    const q = query.trim();
    const hasQuery = searched && q.length >= 2;
    return (
      <div className="c-stack lg">
        <p className="c-prose c-measure">
          The Neesh Index is built by people who care about print. Check it isn&rsquo;t here already, then add it in
          under a minute.
        </p>
        <label className="c-field big">
          <span>Magazine or issue</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the Index first"
            autoComplete="off"
            autoFocus
          />
        </label>
        {hasQuery && (
          <div>
            {results.map((r) => (
              <Link key={r.slug} href={`/titles/${r.slug}#issues`} className="c-result">
                {r.cover ? <img src={r.cover} alt={`${r.name} cover`} className="c-row-cover" /> : <span className="c-row-cover c-cover-empty" />}
                <span className="c-row-text">
                  <span className="c-row-label">{r.name}</span>
                  <span className="c-meta">Already in the Index</span>
                </span>
              </Link>
            ))}
            <div className="c-rule" />
            <p className="c-muted c-results-none">
              {results.length > 0 ? 'Not one of these? Add it below.' : 'Nothing by that name yet. Add it below.'}
            </p>
          </div>
        )}
        <button type="button" className="c-btn solid" onClick={startForm}>
          {q ? `Add “${q}”` : 'Add a magazine that isn’t here'}
        </button>
      </div>
    );
  }

  if (ready && !session) {
    return (
      <SignInForm intro="Additions are tied to an account so we can check them and thank you. We’ll email you a sign-in link, no password." />
    );
  }

  if (duplicates) {
    return (
      <div className="c-stack">
        <h2 className="c-h2">Is it one of these?</h2>
        <div>
          {duplicates.titles?.map((t) => (
            <Link key={t.id} href={`/titles/${t.slug}#issues`} className="c-result">
              <span className="c-row-text">
                <span className="c-row-label">{t.name}</span>
                <span className="c-meta">{t.publisher_name} · Already in the Index</span>
              </span>
            </Link>
          ))}
          {duplicates.issues?.map((i) => (
            <Link key={i.id} href={existing ? `/titles/${existing.slug}#issues` : '#'} className="c-result">
              <span className="c-row-text">
                <span className="c-row-label">{i.issue_label}</span>
                <span className="c-meta">Already listed</span>
              </span>
            </Link>
          ))}
          {duplicates.publishers?.map((p) => (
            <div key={p.id} className="c-result">
              <span className="c-row-text">
                <span className="c-row-label">{p.name}</span>
                <span className="c-meta">Publisher already in the Index</span>
              </span>
              <button type="button" className="c-pill" onClick={() => confirmNew(p.id)}>
                Use this
              </button>
            </div>
          ))}
          <div className="c-rule" />
        </div>
        <div className="c-actions">
          <button type="button" className="c-btn solid" disabled={sending} onClick={() => confirmNew()}>
            No, it&rsquo;s new
          </button>
          <button type="button" className="c-textbtn" onClick={() => setDuplicates(null)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="c-stack lg c-form" onSubmit={submit}>
      <label className="c-field">
        <span>Magazine name</span>
        <input
          name="title_name"
          required={!existing}
          maxLength={200}
          value={name}
          readOnly={!!existing}
          onChange={(event) => setName(event.target.value)}
          placeholder="As it appears on the cover"
        />
      </label>
      {!existing && (
        <>
          <label className="c-field">
            <span>Publisher</span>
            <input name="publisher_name" required maxLength={200} placeholder="Who makes it" />
          </label>
          <label className="c-field">
            <span>Website or Instagram</span>
            <input name="link" required maxLength={500} inputMode="url" placeholder="@handle or website" />
          </label>
        </>
      )}
      <div className="c-two">
        <label className="c-field">
          <span>Issue</span>
          <input name="issue" required maxLength={120} placeholder="e.g. 04" />
        </label>
        <label className="c-field">
          <span>Year</span>
          <input name="year" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="2026" />
        </label>
      </div>
      <button type="button" className="c-upload" onClick={() => fileInput.current?.click()}>
        <span className="c-upload-title">{file ? 'Cover added. Tap to retake' : 'Add a cover photo'}</span>
        <span className="c-fine">Straight on, on a plain surface. We&rsquo;ll tidy it up.</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <label className="c-field">
        <span>
          Where it&rsquo;s listed <em>{file ? '(optional)' : '(if there’s no photo)'}</em>
        </span>
        <input name="source_url" type="url" maxLength={500} placeholder="The publisher’s shop page or post" required={!file} />
      </label>
      <div className="c-stack sm">
        <span className="c-label-strong">Is it yours?</span>
        <div className="c-pair wrap">
          {(
            [
              ['own', 'Own'],
              ['want', 'Want'],
              ['', 'Neither'],
            ] as [Mark, string][]
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={`c-pill wide${mark === value ? ' on' : ''}`}
              aria-pressed={mark === value}
              onClick={() => setMark(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="c-error" role="alert">
          {error}
        </p>
      )}
      <div className="c-actions">
        <button className="c-btn solid" type="submit" disabled={sending}>
          Add to the Index
        </button>
        <button type="button" className="c-textbtn" onClick={() => (existing ? history.back() : setStep('search'))}>
          Back
        </button>
      </div>
      <p className="c-fine">
        Additions carry a <span className="c-chip">Reader-added</span> label until we&rsquo;ve checked them.
      </p>
    </form>
  );
}

export default function AddPage() {
  return (
    <section className="c-page">
      <div className="wrap c-narrow">
        <CollectTabs />
        <h1 className="c-h1 c-page-title">Add a magazine</h1>
        <Suspense>
          <AddInner />
        </Suspense>
      </div>
    </section>
  );
}
