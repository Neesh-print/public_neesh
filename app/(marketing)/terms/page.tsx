import type { Metadata } from 'next';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Terms of Service | Neesh',
  description: "The terms governing the Neesh marketplace: accounts, orders, fees, payouts, returns, and dispute resolution.",
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return <LegalDoc doc={LEGAL_DOCS.terms} />;
}
