import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { faqPageLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FAQ | Neesh',
  description:
    'Everything publishers and spaces ask about Neesh: fees, fulfillment, minimums, packs, and the wooden stand.',
  alternates: { canonical: '/faq' },
};

const GROUPS: { label: string; items: [string, string][] }[] = [
  {
    label: 'For publishers',
    items: [
      [
        'Is Neesh a distributor?',
        "No. We're a marketplace and the software underneath it. You set terms, we connect you with buyers and handle the transaction. If you already work with a distributor, Neesh sits alongside it and reaches the shops they don't call on.",
      ],
      ['What does Neesh cost?', '10 percent of wholesale. Free to list, free to sell.'],
      [
        'Do I have to ship the orders?',
        'Your call. Self-fulfill and keep control, or use Neesh Fulfillment and stop touching boxes. Fulfillment is in beta and taking a small number of orders.',
      ],
      ["What if my magazine isn't in the index yet?", "Tell us and we'll add it. Takes a day."],
      ['Can I take my page down?', 'Yes, same day, no questions.'],
      [
        'Do you take back issues?',
        "Yes, and we'd rather you sold them than stored them. Back issues do well in spaces where nobody's chasing the new one.",
      ],
    ],
  },
  {
    label: 'For spaces',
    items: [
      ['Do I need a distributor account?', "No. That's the point."],
      ["What's the minimum order?", 'For packs, none. For individual titles from the index, it depends on the publisher.'],
      [
        'How much does a pack cost?',
        '$200 for 8 to 10 considered titles. $300 with a handmade wooden magazine stand. Less than what you spend on flowers.',
      ],
      [
        'Do I have to sell them?',
        'Up to you. Plenty of our spaces put them out for guests and never ring one up. Others sell every copy. Fully your call.',
      ],
      [
        'Can I choose the titles?',
        "Packs come pre-curated to take the decision off your plate. If you'd rather choose, dig into the index and build your own.",
      ],
      ['What if my customers take them?', 'Then it worked.'],
    ],
  },
  {
    label: 'Packs',
    items: [
      ['How many magazines come in a pack?', '8 to 10, depending on the titles and their trim sizes.'],
      [
        'Are the titles always the same?',
        "No. Packs get refreshed as new issues come out and new titles join the index. Order the same pack twice and you'll get a different shelf.",
      ],
      [
        'Can I swap titles out?',
        'Not inside a pack. If you want control over specific titles, build your own from the index.',
      ],
      ['Do you ship outside the US?', "Ask us. Depends where you are and what's in the pack."],
      [
        "What's the wooden stand made of?",
        "Wood, by hand, in small batches. It holds a pack upright and it doesn't look like office furniture.",
      ],
    ],
  },
];

export default function FaqPage() {
  const allItems = GROUPS.flatMap((g) => g.items.map(([question, answer]) => ({ question, answer })));
  return (
    <section>
      <div className="wrap" style={{ paddingTop: 'clamp(44px,5.4vw,84px)', paddingBottom: 'var(--section-pad)' }}>
        <JsonLd data={faqPageLd(allItems)} />
        <h1 className="faq-page-heading">FAQ</h1>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <h2 className="faq-group-label">{group.label}</h2>
            <div className="faq-list">
              {group.items.map(([q, a]) => (
                <div className="faq-row" key={q}>
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
