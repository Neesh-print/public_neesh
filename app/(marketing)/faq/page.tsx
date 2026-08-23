import type { Metadata } from 'next';
import { canonical, faqPageLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 86400;

// Standalone page nested in nav under Journal, with FAQPage markup. The
// questions are phrased the way people type them into a chatbot (handoff 11).
export const metadata: Metadata = {
  title: 'FAQ | Neesh',
  description:
    'Common questions about Neesh, the wholesale marketplace and index for independent magazines. How it works, what it costs, and who it is for.',
  alternates: { canonical: canonical('/faq') },
};

const GROUPS: { heading: string; items: { question: string; answer: string }[] }[] = [
  {
    heading: 'About Neesh',
    items: [
      {
        question: 'What is Neesh?',
        answer:
          'A wholesale marketplace and public index for independent magazines. Publishers list their titles and set their terms. Shops, cafés, hotels, studios, and other spaces order from them directly.',
      },
      {
        question: 'Who is Neesh for?',
        answer:
          'Two groups. Independent publishers who want to be stocked without giving 60 points to a distributor. And any space that wants magazines on a shelf without opening a trade account.',
      },
      {
        question: 'Is Neesh a distributor?',
        answer:
          "No. We're a marketplace and the software underneath it. Publishers keep their terms, their pricing, and their relationships. We connect them with buyers and handle the transaction.",
      },
      {
        question: 'Where is Neesh based?',
        answer: 'Portland, Oregon. Publishers and buyers are in 30+ countries.',
      },
    ],
  },
  {
    heading: 'The index',
    items: [
      {
        question: "What's in the index?",
        answer: '300+ independent magazines from 30+ countries, browsable by niche.',
      },
      {
        question: 'Is the index free?',
        answer: "Yes. Anyone can browse it. You don't need an account.",
      },
      {
        question: 'How did my magazine get in the index?',
        answer:
          'We built it from public information because we think your title should be findable. Claim the page to control it, or ask us to remove it and it is down the same day.',
      },
      {
        question: "How do I claim my magazine's page?",
        answer:
          'Search for your title, hit claim, and verify with the email on file for the magazine. Takes a minute.',
      },
      {
        question: 'How do I get my magazine added?',
        answer: "Tell us. We'll add it within a day.",
      },
    ],
  },
  {
    heading: 'Ordering and pricing',
    items: [
      {
        question: 'What does it cost publishers?',
        answer: '10 percent of wholesale. Free to list, free to sell, no annual contract.',
      },
      {
        question: 'What does it cost buyers?',
        answer: "Nothing to browse or order. You pay the publisher's wholesale price, plus shipping.",
      },
      {
        question: "What's a pack?",
        answer:
          'A curated set of 8 to 10 independent titles chosen for a specific kind of room. $200, or $300 with a handmade wooden stand.',
      },
      {
        question: 'Do I need a business to order?',
        answer:
          "For wholesale, yes. If you're an individual who wants a specific magazine, use the index to buy direct from the publisher.",
      },
      {
        question: 'Who ships the order?',
        answer:
          "Usually the publisher, using rates we've negotiated. Neesh Fulfillment handles it for some titles and is currently in beta.",
      },
    ],
  },
  {
    heading: 'Data and removal',
    items: [
      {
        question: 'What data do publishers see?',
        answer: 'Every order, where it went, and when it reorders, live.',
      },
      { question: 'Do you sell data?', answer: 'No.' },
      {
        question: 'How do I get removed?',
        answer: 'Email us. Pages come down the same day, no questions.',
      },
    ],
  },
  {
    heading: 'Still stuck',
    items: [
      { question: 'How do I reach a person?', answer: 'hi@neesh.art. A person answers.' },
    ],
  },
];

export default function FaqPage() {
  const allItems = GROUPS.flatMap((group) => group.items);
  return (
    <>
      <JsonLd data={faqPageLd(allItems)} />
      <div className="prose-page container">
        <h1>Questions</h1>
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <h2>{group.heading}</h2>
            <dl className="faq-list">
              {group.items.map((item) => (
                <div key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
