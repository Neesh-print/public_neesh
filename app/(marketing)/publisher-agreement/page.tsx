import type { Metadata } from 'next';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Publisher Agreement | Neesh',
  description: "The terms that apply once you are approved to sell on Neesh: listings, fulfillment windows, commission, payouts, and returns.",
  alternates: { canonical: '/publisher-agreement' },
};

export default function Page() {
  return <LegalDoc doc={LEGAL_DOCS.publisherAgreement} />;
}
