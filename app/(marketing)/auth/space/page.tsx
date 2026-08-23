import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Set up your space | Neesh',
  description: 'Set up your space on Neesh and stock independent magazines.',
  alternates: { canonical: canonical('/auth/space') },
  robots: { index: false },
};

export default function AuthSpacePage() {
  return (
    <div className="auth-page container">
      <h1>Set up your space</h1>
      <p className="lede">
        Tell us about the room and we&apos;ll show you what fits. Takes under a minute and
        nothing is locked in.
      </p>
      <a className="button" href="https://neesh.art/apply/retailer">
        Get started
      </a>
    </div>
  );
}
