import { HONEYPOT_FIELD } from '@/lib/honeypot';

// Spam trap for the public forms (see src/lib/forms.ts). Off-screen rather
// than display:none, which some bots skip; hidden from assistive tech and
// out of the tab order, so people never meet it.
export function Honeypot() {
  return (
    <div className="hp-field" aria-hidden="true">
      <label>
        Leave this empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
