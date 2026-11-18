import type { Metadata } from 'next';
import { Calculator } from '@/components/calculator/Calculator';

// The magazine calculator (build spec, Nov 17, 2026). Static: the page is
// the client component and its benchmarks; nothing here reads the database,
// so the once-a-day rebuild does not affect it.

const HEADLINE = 'Know what your issue makes before you print.';

export const metadata: Metadata = {
  title: 'The magazine calculator | Neesh',
  description:
    'Plan a magazine issue on real numbers. See your profit, the cash you need up front and what to change, using prices and terms from across independent print.',
  alternates: { canonical: '/calculator' },
  openGraph: {
    title: 'The magazine calculator | Neesh',
    description:
      'Plan a magazine issue on real numbers. See your profit, the cash you need up front and what to change, using prices and terms from across independent print.',
    url: '/calculator',
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(HEADLINE)}&sub=${encodeURIComponent('The magazine calculator')}`,
        width: 1200,
        height: 630,
        alt: HEADLINE,
      },
    ],
  },
};

export default function CalculatorPage() {
  return <Calculator />;
}
