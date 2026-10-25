'use client';

import { useState } from 'react';
import { browserClient } from '@/lib/collect/browser';
import { useCollect } from './CollectProvider';

const REASONS = [
  { value: 'inaccurate', label: 'Something here is wrong' },
  { value: 'duplicate', label: 'It’s listed twice' },
  { value: 'offensive', label: 'It’s offensive or spam' },
  { value: 'other', label: 'Something else' },
] as const;

interface Target {
  kind: 'title' | 'issue';
  id: string;
  label: string;
}

// Report a problem on a title page: the title or one of its issues. Two
// open reports flag a record until reviewed (a database trigger). Reports
// need an account so one person can't flag a record alone.
export function ReportLink({ targets }: { targets: Target[] }) {
  const { session, openSheet, notice } = useCollect();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('inaccurate');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = browserClient();
    const picked = targets.find((t) => t.id === target);
    if (!session || !supabase || !picked) return;
    setSending(true);
    const { error } = await supabase.from('content_reports').insert({
      target_kind: picked.kind,
      target_id: picked.id,
      reason,
      note: note.trim().slice(0, 1000) || null,
      reporter_id: session.user.id,
    });
    setSending(false);
    // 23505: this reader already has an open report on it, which is the
    // outcome they wanted. P0001: the daily report limit.
    if (error && error.code === 'P0001') {
      notice("You've sent a lot of reports today. Try again tomorrow");
      return;
    }
    if (error && error.code !== '23505') {
      notice("Couldn't send. Try again");
      return;
    }
    setOpen(false);
    setNote('');
    notice('Thanks. We check every report');
  }

  return (
    <>
      <button type="button" className="c-report" onClick={() => (session ? setOpen(true) : openSheet())}>
        Report a problem
      </button>
      <div className={`c-scrim${open ? ' open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <form
        className={`c-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-label="Report a problem"
        aria-hidden={!open}
        inert={!open || undefined}
        onSubmit={submit}
      >
        <h2 className="c-h2">Report a problem</h2>
        {targets.length > 1 && (
          <label className="c-field">
            <span>What&rsquo;s it about?</span>
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <fieldset className="c-choices">
          {REASONS.map((r) => (
            <label key={r.value} className="c-check">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="c-field">
          <span>
            What should we know? <em>(optional)</em>
          </span>
          <textarea value={note} maxLength={1000} rows={3} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="c-actions">
          <button className="c-btn solid" type="submit" disabled={sending}>
            Send report
          </button>
          <button type="button" className="c-textbtn" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
