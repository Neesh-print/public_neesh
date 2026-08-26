import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Newsletter | Neesh',
  description: "New titles in the index, physical media news and stuff we're reading. 1x a month.",
  alternates: { canonical: '/newsletter' },
};

export default function NewsletterPage() {
  return (
    <section>
      <div className="utility-page">
        <span className="eyebrow">Indexed, monthly</span>
        <h1>What landed on the shelf this month</h1>
        <p className="sub">
          New titles in the index, physical media news and stuff we&rsquo;re reading. 1x a month.
        </p>
        <div style={{ width: '100%', maxWidth: 520, marginTop: 8 }}>
          <NewsletterForm confirmation="Got it. We'll be in touch." />
        </div>
      </div>
    </section>
  );
}
