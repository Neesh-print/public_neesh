import type { Metadata } from 'next';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Retailer Agreement | Neesh',
  description: "The terms that apply once your retailer application is approved: purchasing, payment, delivery, inspection, and returns.",
  alternates: { canonical: '/retailer-agreement' },
};

export default function Page() {
  return <LegalDoc doc={LEGAL_DOCS.retailerAgreement} />;
}
