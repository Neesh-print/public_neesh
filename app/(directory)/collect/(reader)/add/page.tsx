'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { SignInForm } from '@/components/collect/SignInForm';
import { StartSearch } from '@/components/collect/StartSearch';
import { browserClient } from '@/lib/collect/browser';
import { MAX_ADDITIONS_PER_DAY } from '@/lib/collect/shared';

// Add a magazine or an issue the Index doesn't have (spec: Add flow).
// Search first; add an issue under a title that exists, or a new title
// (and its publisher) with its first issue, since the Index lists no title
// before its first issue is out.

interface Duplicates {
  titles?: { id: string; name: string; slug: string; publisher_name: string }[];
  publishers?: { id: string; name: string; slug: string }[];
  issues?: { id: string; issue_label: string }[];
}

const ERRORS: Record<string, string> = {
  sign_in: 'Sign in first so we can credit the addition to you.',
  invalid: 'Some of the details don’t look right. Check the fields and try again.',
  cover_or_source: 'Add a cover photo or a link to where the issue is listed.',
  image: 'Covers need to be a JPEG, PNG or WebP under 5 MB.',
  blocked: 'Something in there isn’t allowed. Check the text and links.',
  paused: 'Adding is paused on your account while we review your earlier additions.',
  limit: `That’s ${MAX_ADDITIONS_PER_DAY} additions today, the daily limit. Thanks for all of it.`,
  duplicate_label: 'That issue is already listed under this title.',
  not_found: 'We couldn’t find that title.',
};

function AddInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, session, authedFetch, refresh } = useCollect();
  const [title, setTitle] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [mode, setMode] = useState<'pick' | 'issue' | 'title'>('pick');
  const [duplicates, setDuplicates] = useState<Duplicates | null>(null);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastForm, setLastForm] = useState<FormData | null>(null);

  useEffect(() => {
    const slug = params.get('title');
    const supabase = browserClient();
    if (!slug || !supabase) {
      if (params.get('name')) setMode('title');
      return;
    }
    supabase
      .from('directory_titles')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTitle(data as { id: string; name: string; slug: string });
          setMode('issue');
        }
      });
  }, [params]);

  async function send(form: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await authedFetch('/api/collect/add', { method: 'POST', body: form });
      const data = (await res.json()) as { ok: boolean; error?: string; title_slug?: string } & Duplicates;
      if (data.ok) {
        await refresh();
        router.push(`/titles/${data.title_slug}?added=1#issues`);
        return;
      }
      if (data.error === 'duplicates') {
        setLastForm(form);
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
    form.set('mode', mode);
    if (mode === 'issue' && title) form.set('title_id', title.id);
    if (publisherId) form.set('publisher_id', publisherId);
    send(form);
  }

  function confirmNew(usePublisher?: string) {
    if (!lastForm) return;
    const form = lastForm;
    if (usePublisher) form.set('publisher_id', usePublisher);
    form.set('confirm_new', '1');
    setDuplicates(null);
    send(form);
  }

  if (ready && !session) {
    return (
      <div className="collect-narrow">
        <p>
          Additions are tied to an account so we can check them and credit you. We&rsquo;ll email you a
          sign-in link, no password.
        </p>
        <SignInForm />
      </div>
    );
  }

  if (duplicates) {
    return (
      <div className="collect-narrow collect-dupes">
        <h2>Is it one of these?</h2>
        {duplicates.titles && duplicates.titles.length > 0 && (
          <ul>
            {duplicates.titles.map((t) => (
              <li key={t.id}>
                <Link href={`/titles/${t.slug}#issues`}>{t.name}</Link> <span>{t.publisher_name}</span>
              </li>
            ))}
          </ul>
        )}
        {duplicates.issues && duplicates.issues.length > 0 && (
          <ul>
            {duplicates.issues.map((i) => (
              <li key={i.id}>
                <Link href={title ? `/titles/${title.slug}#issues` : '#'}>{i.issue_label}</Link>
              </li>
            ))}
          </ul>
        )}
        {duplicates.publishers && duplicates.publishers.length > 0 && (
          <>
            <p>We already have a publisher with a similar name. Is it theirs?</p>
            <ul>
              {duplicates.publishers.map((p) => (
                <li key={p.id}>
                  {p.name}{' '}
                  <button type="button" className="text-link" onClick={() => confirmNew(p.id)}>
                    Yes, use this publisher
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="collect-actions">
          <button type="button" className="btn solid" disabled={sending} onClick={() => confirmNew()}>
            No, it&rsquo;s new
          </button>
          <button type="button" className="text-link" onClick={() => setDuplicates(null)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'pick') {
    return (
      <div className="collect-narrow">
        <p>Search first. If the magazine is here, open it and add the missing issue from its page.</p>
        <StartSearch autoFocus />
        <p>
          Not here?{' '}
          <button type="button" className="text-link" onClick={() => setMode('title')}>
            Add a magazine
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="collect-narrow collect-add" onSubmit={submit}>
      {mode === 'issue' && title ? (
        <p>
          Adding an issue of <strong>{title.name}</strong>.
        </p>
      ) : (
        <>
          <label className="field">
            <span>Magazine name</span>
            <input name="title_name" required maxLength={200} defaultValue={params.get('name') ?? ''} />
          </label>
          <label className="field">
            <span>Publisher</span>
            <input name="publisher_name" required maxLength={200} onChange={() => setPublisherId(null)} />
          </label>
          <label className="field">
            <span>Website or Instagram</span>
            <input name="link" type="url" required maxLength={500} placeholder="https://" />
          </label>
          <h2 className="collect-add-sub">Its latest issue</h2>
        </>
      )}
      <label className="field">
        <span>Issue, as printed</span>
        <input name="issue_label" required maxLength={120} placeholder="Issue 04, or Spring 2025" />
      </label>
      <div className="collect-two">
        <label className="field">
          <span>Number (optional)</span>
          <input name="issue_number" type="number" min={0} step="any" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Published (optional)</span>
          <input name="published_on" type="month" />
        </label>
      </div>
      <label className="field">
        <span>Cover photo</span>
        <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" />
        <span className="hint">Or give a link below. One of the two is needed.</span>
      </label>
      <label className="field">
        <span>Link to where it&rsquo;s listed</span>
        <input name="source_url" type="url" maxLength={500} placeholder="The publisher’s shop page or post" />
      </label>
      <fieldset className="collect-radios">
        <legend>Is it yours?</legend>
        <label>
          <input type="radio" name="mark" value="own" />
          <span>It&rsquo;s on my shelf</span>
        </label>
        <label>
          <input type="radio" name="mark" value="want" />
          <span>It&rsquo;s on my list</span>
        </label>
        <label>
          <input type="radio" name="mark" value="" defaultChecked />
          <span>Neither</span>
        </label>
      </fieldset>
      {error && (
        <p className="collect-error" role="alert">
          {error}
        </p>
      )}
      <div className="collect-actions">
        <button className="btn solid" type="submit" disabled={sending}>
          {sending ? 'Adding' : 'Add it'}
        </button>
      </div>
      <p className="collect-fine">
        Additions show right away with a Reader-added tag, and a person checks every one.
      </p>
    </form>
  );
}

export default function AddPage() {
  return (
    <section className="collect-page">
      <div className="wrap">
        <CollectTabs />
        <h1>Add a magazine</h1>
        <Suspense>
          <AddInner />
        </Suspense>
      </div>
    </section>
  );
}
