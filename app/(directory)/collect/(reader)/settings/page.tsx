'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollectTabs } from '@/components/collect/CollectTabs';
import { useCollect } from '@/components/collect/CollectProvider';
import { SignInForm } from '@/components/collect/SignInForm';
import { browserClient } from '@/lib/collect/browser';

interface Prefs {
  home_city_id: string | null;
  notify_new_issues: boolean;
  newsletter_opt_in: boolean;
}

// Home city, notification and newsletter preferences, sign out, delete.
export default function SettingsPage() {
  const router = useRouter();
  const { ready, session, email, signOut, authedFetch, notice } = useCollect();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const supabase = browserClient();
    if (!session || !supabase) return;
    supabase
      .from('collectors')
      .select('home_city_id, notify_new_issues, newsletter_opt_in')
      .maybeSingle()
      .then(({ data }) => setPrefs((data as Prefs) ?? { home_city_id: null, notify_new_issues: true, newsletter_opt_in: false }));
    supabase
      .from('directory_cities')
      .select('id, name')
      .gt('store_count', 0)
      .order('name')
      .then(({ data }) => setCities((data ?? []) as { id: string; name: string }[]));
  }, [session]);

  async function save(patch: Partial<Prefs>) {
    const supabase = browserClient();
    if (!session || !supabase || !prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const update: Record<string, unknown> = { user_id: session.user.id, ...patch };
    // Consent is timestamped when the box is ticked, cleared when unticked.
    if ('newsletter_opt_in' in patch) {
      update.newsletter_consent_at = patch.newsletter_opt_in ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from('collectors').upsert(update, { onConflict: 'user_id' });
    if (error) {
      setPrefs(prefs);
      notice('That didn’t save. Try again.');
    } else {
      notice('Saved');
    }
  }

  async function deleteAccount() {
    const res = await authedFetch('/api/collect/account', { method: 'DELETE' });
    if (!res.ok) {
      notice('That didn’t work. Email hi@neesh.art and we’ll do it by hand.');
      return;
    }
    await signOut();
    router.replace('/collect');
  }

  return (
    <section className="collect-page">
      <div className="wrap">
        <CollectTabs />
        <h1>Settings</h1>
        {ready && !session && (
          <div className="collect-narrow">
            <p>Sign in to keep your collection on Neesh across devices. We&rsquo;ll email you a link, no password.</p>
            <SignInForm next="/collect/shelf" />
          </div>
        )}
        {session && prefs && (
          <div className="collect-narrow collect-settings">
            <p className="collect-signed-in">
              Signed in as <strong>{email}</strong>.{' '}
              <button type="button" className="text-link" onClick={signOut}>
                Sign out
              </button>
            </p>
            <label className="field">
              <span>Home city</span>
              <select
                value={prefs.home_city_id ?? ''}
                onChange={(event) => save({ home_city_id: event.target.value || null })}
              >
                <option value="">Not set</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="hint">Shops in your city come first on your want list.</span>
            </label>
            <label className="collect-check">
              <input
                type="checkbox"
                checked={prefs.notify_new_issues}
                onChange={(event) => save({ notify_new_issues: event.target.checked })}
              />
              <span>Email me when a magazine I follow has a new issue.</span>
            </label>
            <label className="collect-check">
              <input
                type="checkbox"
                checked={prefs.newsletter_opt_in}
                onChange={(event) => save({ newsletter_opt_in: event.target.checked })}
              />
              <span>Send me Indexed, the monthly letter from Neesh on independent print.</span>
            </label>

            <div className="collect-danger">
              <h2>Delete account</h2>
              <p>This deletes your collection, follows and alerts. It can&rsquo;t be undone.</p>
              {confirmDelete ? (
                <div className="collect-actions">
                  <button type="button" className="btn solid" onClick={deleteAccount}>
                    Delete everything
                  </button>
                  <button type="button" className="text-link" onClick={() => setConfirmDelete(false)}>
                    Keep my account
                  </button>
                </div>
              ) : (
                <button type="button" className="btn ghost" onClick={() => setConfirmDelete(true)}>
                  Delete my account
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
