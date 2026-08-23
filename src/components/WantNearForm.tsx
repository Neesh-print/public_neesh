export function WantNearForm({ titleId }: { titleId: string }) {
  return (
    <details className="cta-form">
      <summary>Want this near you</summary>
      <form action="/api/signal" method="post">
        <input type="hidden" name="title_id" value={titleId} />
        <input type="hidden" name="signal_type" value="want_near" />
        <div className="field">
          <label htmlFor="wn-postcode">Postcode</label>
          <input id="wn-postcode" name="postcode" required minLength={2} maxLength={16} />
        </div>
        <div className="field">
          <label htmlFor="wn-email">Email</label>
          <input id="wn-email" name="email" type="email" required maxLength={320} />
        </div>
        <button className="button" type="submit">
          Send
        </button>
        <p className="privacy-note">
          We use this to see where demand clusters. Your email stays with us.
        </p>
      </form>
    </details>
  );
}
