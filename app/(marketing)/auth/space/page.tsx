import type { Metadata } from 'next';
import { appUrl } from '@/lib/seo';
import { ArrowIcon } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Sign Up — Spaces | Neesh',
  description:
    'Sign up in under a minute to buy the best independent magazines at wholesale. Nothing locked in.',
  alternates: { canonical: '/auth/space' },
};

export default function AuthSpacePage() {
  return (
    <section>
      <div className="utility-page">
        <span className="eyebrow dim">For spaces</span>
        <h1>Let us get your room on Neesh</h1>
        <p className="sub">
          Sign up in under a minute to buy the best independent magazines at wholesale. Nothing
          locked in.
        </p>
        <a href={appUrl('/apply/retailer')} className="btn solid" style={{ marginTop: 8 }}>
          Get started
          <ArrowIcon />
        </a>
      </div>
    </section>
  );
}
