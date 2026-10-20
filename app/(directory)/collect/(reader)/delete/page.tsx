'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollect } from '@/components/collect/CollectProvider';

// The confirm step of account deletion, from the emailed link.
function DeleteInner() {
  const params = useSearchParams();
  const { session, signOut } = useCollect();
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'expired' | 'error'>('idle');

  async function confirm() {
    setStatus('working');
    const res = await fetch(`/api/collect/account?t=${encodeURIComponent(params.get('t') ?? '')}`, { method: 'DELETE' });
    if (res.ok) {
      if (session) await signOut();
      setStatus('done');
    } else {
      setStatus(res.status === 401 ? 'expired' : 'error');
    }
  }

  if (status === 'done') {
    return (
      <div className="c-stack">
        <h1 className="c-h2">Your collection is deleted.</h1>
        <p className="c-muted">Thanks for keeping a record with us. The Index is still here whenever you want it.</p>
        <Link href="/index" className="c-btn">
          Explore magazines
        </Link>
      </div>
    );
  }
  if (status === 'expired') {
    return (
      <div className="c-stack">
        <h1 className="c-h2">That link has expired.</h1>
        <p className="c-muted">Ask for a new one from Settings.</p>
        <Link href="/collect/settings" className="c-btn">
          Settings
        </Link>
      </div>
    );
  }
  return (
    <div className="c-stack">
      <h1 className="c-h2">Delete your collection?</h1>
      <p className="c-muted c-measure">This removes your shelf, wants, follows and alerts from Neesh. It can&rsquo;t be undone.</p>
      {status === 'error' && (
        <p className="c-error" role="alert">
          That didn&rsquo;t work. Email hi@neesh.art and we&rsquo;ll do it by hand.
        </p>
      )}
      <div className="c-actions">
        <button type="button" className="c-btn solid" disabled={status === 'working'} onClick={confirm}>
          Delete everything
        </button>
        <Link href="/collect/shelf" className="c-textbtn">
          Keep my collection
        </Link>
      </div>
    </div>
  );
}

export default function DeletePage() {
  return (
    <section className="c-page">
      <div className="wrap c-narrow">
        <Suspense>
          <DeleteInner />
        </Suspense>
      </div>
    </section>
  );
}
