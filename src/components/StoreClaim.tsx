import { appUrl } from '@/lib/seo';

// The claim banner on an unclaimed store page (stockists spec, Phase 2).
// A plain form post, no JS: the claim is stored for manual review, and the
// space is pointed at Neesh signup so the approved page links to an account.
export function StoreClaim({ storeId, storeName }: { storeId: string; storeName: string }) {
  return (
    <div className="publisher-zone store-claim">
      <span className="blurb">
        Is this your shop? Claim the page to add your address, hours and Instagram, and see which
        Index titles spaces like yours stock.
      </span>
      <details className="want-details store-claim-details">
        <summary>
          <span className="q">Claim {storeName}</span>
          <span className="hint">A person checks every claim, usually within a day.</span>
        </summary>
        <form className="want-form" action="/api/claim-store" method="post">
          <input type="hidden" name="store_id" value={storeId} />
          <label className="field">
            <span>Your name</span>
            <input name="name" required maxLength={200} />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              required
              maxLength={320}
              placeholder="Ideally at the shop's own domain"
            />
          </label>
          <label className="field">
            <span>Your role</span>
            <input name="role" maxLength={120} placeholder="e.g. owner, buyer" />
          </label>
          <label className="field">
            <span>Shop website (optional)</span>
            <input name="website" type="url" maxLength={500} placeholder="https://" />
          </label>
          <div className="inline-actions">
            <button className="btn accent" type="submit" style={{ padding: '14px 24px', fontSize: 15 }}>
              Claim this shop
            </button>
          </div>
        </form>
      </details>
      <span className="store-claim-note">
        Buying for a space?{' '}
        <a href={appUrl('/apply/retailer')} className="text-link">
          Set up a Neesh account
        </a>{' '}
        to order Index titles at wholesale.
      </span>
    </div>
  );
}
