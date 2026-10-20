'use client';

import { useEffect, useRef } from 'react';
import { useCollect } from './CollectProvider';
import { SignInFields, useSendLink } from './SignInForm';

// The save prompt: a bottom sheet, not a modal. Tapping the scrim or Not now
// dismisses it for the rest of the visit.
export function SaveSheet() {
  const { sheet, setSheet, session, track } = useCollect();
  const link = useSendLink();
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);
  const open = sheet !== 'closed' && !session;

  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      window.setTimeout(() => input.current?.focus({ preventScroll: true }), 380);
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (link.status === 'sent') setSheet('sent');
  }, [link.status, setSheet]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function dismiss() {
    if (sheet === 'ask') track('collect_save_prompt_dismissed');
    setSheet('closed');
  }

  return (
    <>
      <div className={`c-scrim${open ? ' open' : ''}`} onClick={dismiss} aria-hidden="true" />
      <div
        className={`c-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label="Save it to your collection"
        aria-hidden={!open}
        inert={!open || undefined}
      >
        {sheet === 'sent' ? (
          <>
            <h2 className="c-h2">Check your inbox</h2>
            <p className="c-sheet-body">
              We sent a sign-in link to {link.email}. Tap it on any device and your collection comes with you.
            </p>
            <button type="button" className="c-btn" onClick={() => setSheet('closed')}>
              Done
            </button>
          </>
        ) : (
          <form className="c-stack" onSubmit={link.send}>
            <h2 className="c-h2">Save it to your collection</h2>
            <p className="c-sheet-body">
              Your marks are saved on this device. Add your email to keep your collection on Neesh across devices
              and hear when a magazine you follow has a new issue. We&rsquo;ll send a sign-in link, no password.
            </p>
            <SignInFields link={link} inputRef={input} />
            <div className="c-actions">
              <button className="c-btn solid" type="submit" disabled={link.status === 'sending'}>
                Send my link
              </button>
              <button type="button" className="c-textbtn" onClick={dismiss}>
                Not now
              </button>
            </div>
            <p className="c-fine">Your collection is private. Shops and publishers only ever see anonymous totals.</p>
          </form>
        )}
      </div>
    </>
  );
}
