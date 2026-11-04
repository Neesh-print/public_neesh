import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canonical } from '@/lib/seo';
import { Honeypot } from '@/components/Honeypot';
import { currentEditor } from '@/lib/listing/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit your listing | Neesh',
  description: 'Publishers with a claimed page on the Neesh Index can edit every part of their listing.',
  alternates: { canonical: canonical('/listing') },
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  listing_link:
    'If that address owns a claimed listing, a sign-in link is on its way. It works for 24 hours.',
  listing_bad_email: 'That email address does not look right. Try again.',
  listing_expired: 'That link has expired or was already replaced. Ask for a new one below.',
  listing_signed_out: 'You are signed out.',
};

// Sign in to edit a listing: the publisher types the address their claim was
// approved for (or their Neesh account email) and gets a link. No password.
export default async function ListingSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const editor = await currentEditor();
  if (editor && editor.publisherIds.length > 0 && submitted !== 'listing_signed_out') redirect('/listing/edit');
  const notice = submitted ? NOTICES[submitted] : null;

  return (
    <section>
      <div className="utility-page roomy">
        <span className="eyebrow">For publishers</span>
        <h1>Edit your listing</h1>
        <p className="sub">
          Change anything on your Index page: the name, description, cover, niche, frequency, price,
          where you are based and where you are stocked. Changes go live as soon as you save.
        </p>
        {notice && <p className="submitted-notice">{notice}</p>}
        <form className="search-row" action="/api/listing/link" method="post">
          <Honeypot />
          <input
            type="email"
            name="email"
            required
            maxLength={320}
            autoComplete="email"
            placeholder="The email your claim was approved for"
            aria-label="The email your claim was approved for"
          />
          <button type="submit" className="btn solid">
            Email me a link
          </button>
        </form>
        <p className="small">
          Not claimed yet? Find your title on the <a href="/auth/publisher" className="text-link">publisher page</a>{' '}
          and claim it first. Using a different address now? Email{' '}
          <a href="mailto:hi@neesh.art" className="text-link">hi@neesh.art</a> and we will move it over.
        </p>
      </div>
    </section>
  );
}
