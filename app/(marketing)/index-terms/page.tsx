import type { Metadata } from 'next';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Index Terms | Neesh',
  description: LEGAL_DOCS.indexTerms.sub,
  alternates: { canonical: '/index-terms' },
};

export default function Page() {
  return <LegalDoc doc={LEGAL_DOCS.indexTerms} />;
}
