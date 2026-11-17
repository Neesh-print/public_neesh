'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { browserClient } from '@/lib/collect/browser';
import { safeNextPath } from '@/lib/collect/shared';
import { useCollect } from '@/components/collect/CollectProvider';

// Where the sign-in email lands. Verifies the one-time token, records
// newsletter consent if the reader ticked the box, and sends them back to
// the page they were on. The provider claims any marks made on this device
// before sign-in as soon as the session starts.
function AuthInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useCollect();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const supabase = browserClient();
    const tokenHash = params.get('token_hash');
    const next = safeNextPath(params.get('next'));
    if (!supabase || !tokenHash) {
      setFailed(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
      if (error || !data.session) {
        setFailed(true);
        return;
      }
      if (params.get('nl') === '1') {
        await supabase.from('collectors').upsert(
          {
            user_id: data.session.user.id,
            newsletter_opt_in: true,
            newsletter_consent_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
      await refresh();
      router.replace(next);
    })();
  }, [params, router, refresh]);

  if (failed) {
    return (
      <>
        <h1 className="c-h2">That link has expired.</h1>
        <p className="c-muted">Sign-in links work once. Ask for a new one and use the latest email.</p>
        <Link href="/collect/settings" className="c-btn solid">
          Get a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="c-h2">Signing you in</h1>
      <p className="c-muted">One moment while we fetch your collection.</p>
    </>
  );
}

export default function CollectAuthPage() {
  return (
    <section className="c-page">
      <div className="wrap c-narrow">
        <Suspense fallback={<h1 className="c-h2">Signing you in</h1>}>
          <AuthInner />
        </Suspense>
      </div>
    </section>
  );
}
