// Progressively-enhanced CTA: a plain form posting to /api/signal, no JS
// required (spec 5, 8). The route answers with a 303 back to this page.
export function StockRequestForm({ titleId }: { titleId: string }) {
  return (
    <details className="cta-form">
      <summary>
        Stock this title{' '}
        <span className="cta-subline">
          For shops and spaces. Tell us where you are and we&apos;ll set it up.
        </span>
      </summary>
      <form action="/api/signal" method="post">
        <input type="hidden" name="title_id" value={titleId} />
        <input type="hidden" name="signal_type" value="stock_request" />
        <div className="field">
          <label htmlFor="sr-business">Business name</label>
          <input id="sr-business" name="business_name" required maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="sr-email">Email</label>
          <input id="sr-email" name="email" type="email" required maxLength={320} />
        </div>
        <div className="field">
          <label htmlFor="sr-venue">Venue type</label>
          <select id="sr-venue" name="venue_type" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option>Bookshop</option>
            <option>Newsstand</option>
            <option>Record shop</option>
            <option>Cafe</option>
            <option>Gallery or museum shop</option>
            <option>Concept store</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="sr-city">City</label>
          <input id="sr-city" name="city" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="sr-note">Anything else</label>
          <textarea id="sr-note" name="note" rows={3} maxLength={2000} />
        </div>
        <button className="button" type="submit">
          Send stock request
        </button>
      </form>
    </details>
  );
}
