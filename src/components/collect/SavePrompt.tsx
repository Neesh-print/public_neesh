'use client';

import { useState } from 'react';
import { SignInForm } from './SignInForm';

// Shown once after a reader's first mark on this device (spec: save prompt).
export function SavePrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="collect-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="collect-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-prompt-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="save-prompt-heading">Save it to your collection</h2>
        <p>
          Your marks are saved on this device. Add your email to keep your collection on Neesh across
          devices and hear when a magazine you follow has a new issue. We&rsquo;ll send a sign-in link,
          no password.
        </p>
        <SignInForm secondary={<NotNow onClose={onClose} />} />
      </div>
    </div>
  );
}

function NotNow({ onClose }: { onClose: () => void }) {
  const [clicked, setClicked] = useState(false);
  return (
    <button
      type="button"
      className="text-link collect-not-now"
      disabled={clicked}
      onClick={() => {
        setClicked(true);
        onClose();
      }}
    >
      Not now
    </button>
  );
}
