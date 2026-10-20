'use client';

import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/collect/browser';
import { useCollect } from './CollectProvider';

// Availability alert request on a wanted issue, pilot titles only. It needs
// an account, since the alert is an email.
export function AlertToggle({ issueId }: { issueId: string }) {
  const { session, openSheet, notice } = useCollect();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!session || !supabase) {
      setOpen(false);
      return;
    }
    supabase
      .from('availability_requests')
      .select('cancelled_at, fulfilled_at')
      .eq('issue_id', issueId)
      .maybeSingle()
      .then(({ data }) => setOpen(Boolean(data && !data.cancelled_at && !data.fulfilled_at)));
  }, [session, issueId]);

  async function toggle() {
    const supabase = browserClient();
    if (!session || !supabase) {
      openSheet();
      return;
    }
    const next = !open;
    setOpen(next);
    const now = new Date().toISOString();
    const { error } = await supabase.from('availability_requests').upsert(
      next
        ? { user_id: session.user.id, issue_id: issueId, cancelled_at: null, fulfilled_at: null, created_at: now }
        : { user_id: session.user.id, issue_id: issueId, cancelled_at: now },
      { onConflict: 'user_id,issue_id' }
    );
    if (error) {
      setOpen(!next);
      notice("Couldn't save. Try again");
    } else if (next) {
      notice("We'll email you when a shop has it");
    }
  }

  if (open === null) return null;
  return (
    <button type="button" className="c-alert" aria-pressed={open} onClick={toggle}>
      {open ? 'We’ll email you when a shop has it. Cancel' : 'Tell me when a shop has it'}
    </button>
  );
}
