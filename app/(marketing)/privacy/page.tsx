import type { Metadata } from 'next';
import { LEGAL_DOCS } from '@/lib/legal-content';
import { LegalDoc } from '@/components/LegalDoc';

export const metadata: Metadata = {
  title: 'Privacy Policy | Neesh',
  description: "What Neesh collects, how we use it, who we share it with, and your rights.",
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return <LegalDoc doc={LEGAL_DOCS.privacy} />;
}
