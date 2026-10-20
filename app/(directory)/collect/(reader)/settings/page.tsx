'use client';

import { useEffect, useState } from 'react';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect, type HomeCity } from '@/components/collect/CollectProvider';
import { SignInForm } from '@/components/collect/SignInForm';
import { LoadingRows } from '@/components/collect/parts';
import { browserClient } from '@/lib/collect/browser';
import { TOAST } from '@/lib/collect/shared';

interface Prefs {
  notify_new_issues: boolean;
  newsletter_opt_in: boolean;
}

function OnOff({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" className={`c-pill small${on ? ' on' : ''}`} aria-pressed={on} aria-label={`${label}, ${on ? 'on' : 'off'}`} onClick={onToggle}>
      {on ? 'On' : 'Off'}
    </button>
  );
}

// Preferences as a plain list of hairline rows: email, home city, new-issue
// emails, Indexed, delete account.
export default function SettingsPage() {
  const { ready, session, email, signOut, homeCity, setHomeCity, authedFetch, notice } = useCollect();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [cities, setCities] = useState<HomeCity[]>([]);
  const [choosingCity, setChoosingCity] = useState(false);
  const [deleteSent, setDeleteSent] = useState(false);

  useEffect(() => {
    const supabase = browserClient();
    if (!session || !supabase) return;
    supabase
      .from('collectors')
      .select('notify_new_issues, newsletter_opt_in')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setPrefs((data as Prefs) ?? { notify_new_issues: true, newsletter_opt_in: false }));
  }, [session]);

  useEffect(() => {
    if (!choosingCity || cities.length) return;
    browserClient()
      ?.from('directory_cities')
      .select('id, slug, name')
      .gt('store_count', 0)
      .order('name')
      .then(({ data }) => setCities((data ?? []) as HomeCity[]));
  }, [choosingCity, cities.length]);

  async function save(patch: Partial<Prefs>) {
    const supabase = browserClient();
    if (!session || !supabase || !prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, ...patch });
    const update: Record<string, unknown> = { user_id: session.user.id, ...patch };
    // Consent is timestamped when switched on and cleared when switched off.
    if ('newsletter_opt_in' in patch) {
      update.newsletter_consent_at = patch.newsletter_opt_in ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from('collectors').upsert(update, { onConflict: 'user_id' });
    if (error) {
      setPrefs(before);
      notice(TOAST.failed);
    }
  }

  async function chooseCity(id: string) {
    const city = cities.find((c) => c.id === id) ?? null;
    setChoosingCity(false);
    if (!(await setHomeCity(city))) notice(TOAST.failed);
  }

  async function requestDelete() {
    const res = await authedFetch('/api/collect/account', { method: 'POST' });
    if (res.ok) setDeleteSent(true);
    else notice('That didn’t work. Email hi@neesh.art and we’ll do it by hand');
  }

  return (
    <section className="c-page">
      <div className="wrap c-narrow">
        <CollectTabs />
        <h1 className="c-h1 c-page-title">Settings</h1>
        {!ready ? (
          <LoadingRows />
        ) : !session ? (
          <SignInForm
            intro="Sign in to keep your collection on Neesh across devices. We’ll email you a link, no password."
            next="/collect/shelf"
          />
        ) : !prefs ? (
          <LoadingRows />
        ) : (
          <div className="c-settings">
            <div className="c-setting">
              <div>
                <span className="c-mono muted">Email</span>
                <span>{email}</span>
              </div>
              <button type="button" className="c-textbtn ink" onClick={signOut}>
                Sign out
              </button>
            </div>
            <div className="c-setting">
              <div>
                <span className="c-mono muted">Home city</span>
                {choosingCity ? (
                  <select
                    className="c-select"
                    autoFocus
                    value={homeCity?.id ?? ''}
                    onChange={(event) => chooseCity(event.target.value)}
                    onBlur={() => setChoosingCity(false)}
                    aria-label="Home city"
                  >
                    <option value="">Not set</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{homeCity?.name ?? 'Not set'}</span>
                )}
              </div>
              {!choosingCity && (
                <button type="button" className="c-textbtn ink" onClick={() => setChoosingCity(true)}>
                  Change
                </button>
              )}
            </div>
            <div className="c-setting">
              <div>
                <span className="c-mono muted">New issues</span>
                <span>Email me when a magazine I follow has a new issue</span>
              </div>
              <OnOff
                on={prefs.notify_new_issues}
                label="New issue emails"
                onToggle={() => save({ notify_new_issues: !prefs.notify_new_issues })}
              />
            </div>
            <div className="c-setting">
              <div>
                <span className="c-mono muted">Indexed</span>
                <span>The monthly letter from Neesh on independent print</span>
              </div>
              <OnOff
                on={prefs.newsletter_opt_in}
                label="Indexed"
                onToggle={() => save({ newsletter_opt_in: !prefs.newsletter_opt_in })}
              />
            </div>
            <div className="c-setting stacked last">
              <span className="c-mono muted">Delete account</span>
              <span className="c-muted">Removes your collection from Neesh. We&rsquo;ll email a link to confirm.</span>
              {deleteSent ? (
                <span className="c-fine">Check your inbox for the link. It works for 24 hours.</span>
              ) : (
                <button type="button" className="c-textbtn danger" onClick={requestDelete}>
                  Delete my account
                </button>
              )}
            </div>
          </div>
        )}
        <p className="c-fine c-privacy">
          Your collection is private. Shops and publishers only ever see anonymous totals, and never for small groups of
          readers.
        </p>
      </div>
    </section>
  );
}
