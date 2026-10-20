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

// Report an Index record. Two open reports flag it until reviewed (a
// database trigger). Reports need an account so one person can't flag a
// record alone.
export function ReportButton({
  targetKind,
  targetId,
  label,
}: {
  targetKind: 'title' | 'issue' | 'publisher';
  targetId: string;
  label: string;
}) {
  const { session, openSavePrompt, notice } = useCollect();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('inaccurate');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  function start() {
    if (!session) {
      openSavePrompt();
      return;
    }
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = browserClient();
    if (!session || !supabase) return;
    setSending(true);
    const { error } = await supabase.from('content_reports').insert({
      target_kind: targetKind,
      target_id: targetId,
      reason,
      note: note.trim().slice(0, 1000) || null,
      reporter_id: session.user.id,
    });
    setSending(false);
    if (error) {
      notice('That didn’t send. Try again.');
      return;
    }
    setOpen(false);
    setNote('');
    notice('Thanks. We check every report.');
  }

  return (
    <>
      <button type="button" className="report-btn" aria-label={`Report ${label}`} onClick={start}>
        Report
      </button>
      {open && (
        <div className="collect-sheet-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <form
            className="collect-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Report ${label}`}
            onClick={(event) => event.stopPropagation()}
            onSubmit={submit}
          >
            <h2>Report {label}</h2>
            <fieldset className="collect-radios">
              {REASONS.map((r) => (
                <label key={r.value}>
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
            <label className="field">
              <span>What should we know? (optional)</span>
              <textarea value={note} maxLength={1000} rows={3} onChange={(event) => setNote(event.target.value)} />
            </label>
            <div className="collect-actions">
              <button className="btn solid" type="submit" disabled={sending}>
                Send report
              </button>
              <button type="button" className="text-link collect-not-now" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
