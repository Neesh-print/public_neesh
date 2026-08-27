// The single demand CTA on a title profile: one form for spaces and readers
// alike (email, postcode, which one you are). Progressively enhanced, plain
// form post, no JS required; the API maps the role onto the stored signal
// types so the demand data stays split by audience.
export function WantTitleForm({ titleId }: { titleId: string }) {
  return (
    <details className="want-details">
      <summary>
        <span className="q">Buy it wholesale.</span>
        <span className="hint">Tell us where you are and we will let you know when it is near you.</span>
      </summary>
      <form className="want-form" action="/api/signal" method="post">
        <input type="hidden" name="title_id" value={titleId} />
        <input type="hidden" name="signal_type" value="title_interest" />
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required maxLength={320} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Postcode</span>
          <input name="postcode" required minLength={2} maxLength={16} placeholder="e.g. 97214" />
        </label>
        <label className="field">
          <span>I am a</span>
          <select name="role" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option value="space">Space (shop, café, hotel)</option>
            <option value="reader">Reader</option>
          </select>
        </label>
        <div className="inline-actions">
          <button className="btn solid" type="submit" style={{ padding: '14px 24px', fontSize: 15 }}>
            Let me know
          </button>
        </div>
      </form>
    </details>
  );
}
