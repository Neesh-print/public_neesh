// The single demand CTA on a title profile: one form for spaces and readers
// alike (email, postcode, which one you are). Progressively enhanced, plain
// form post, no JS required; the API maps the role onto the stored signal
// types so the demand data stays split by audience.
export function WantTitleForm({ titleId }: { titleId: string }) {
  return (
    <details className="cta-form">
      <summary>
        Want this title?{' '}
        <span className="cta-subline">
          Tell us where you are and we&apos;ll follow up.
        </span>
      </summary>
      <form action="/api/signal" method="post">
        <input type="hidden" name="title_id" value={titleId} />
        <input type="hidden" name="signal_type" value="title_interest" />
        <div className="field">
          <label htmlFor="wt-email">Email</label>
          <input id="wt-email" name="email" type="email" required maxLength={320} />
        </div>
        <div className="field">
          <label htmlFor="wt-postcode">Postcode</label>
          <input id="wt-postcode" name="postcode" required minLength={2} maxLength={16} />
        </div>
        <div className="field">
          <label htmlFor="wt-role">I&apos;m a</label>
          <select id="wt-role" name="role" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option value="space">Space (shop, café, hotel)</option>
            <option value="reader">Reader</option>
          </select>
        </div>
        <button className="button" type="submit">
          Send
        </button>
      </form>
    </details>
  );
}
