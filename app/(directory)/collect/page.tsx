import type { Metadata } from 'next';
import { CollectLanding } from '@/components/collect/CollectLanding';

export const metadata: Metadata = {
  title: 'Your collection | Neesh',
  description:
    'Build your magazine collection on Neesh. Save the issues on your shelf, follow the magazines you love, and find the shops that carry them. Free and private.',
  alternates: { canonical: '/collect' },
};

// Landing page for the NYC poster and sticker campaign (QR codes carry
// utm_source=print&utm_medium=campaign&utm_campaign=collect-nyc).
export default function CollectLandingPage() {
  return <CollectLanding />;
}
