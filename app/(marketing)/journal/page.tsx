import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Journal | Neesh',
  description:
    'Essays, interviews, and reporting on independent print. Why it keeps outliving its obituaries, what distribution actually costs, and who is making the best work right now.',
  alternates: { canonical: '/journal' },
};

const POSTS = [
  'What print can learn from vinyl',
  'Every magazine should be evergreen',
  "The newsstand is gone. Here's what replaced it.",
];

const SECTIONS = [
  'Essays',
  'Interviews',
  'Title write-ups',
  'Pack stories',
  'From the shelf',
];

export default function JournalPage() {
  return (
    <>
      <section>
        <div className="wrap journal-head">
          <h1>Journal</h1>
          <p>
            Essays, interviews, and reporting on independent print. Why it keeps outliving its
            obituaries, what distribution actually costs, and who&rsquo;s making the best work
            right now.
          </p>
        </div>
      </section>
      <section>
        <div className="wrap journal-cols">
          <div className="journal-posts">
            {POSTS.map((headline) => (
              <div className="journal-post" key={headline}>
                <span className="kicker">Coming soon</span>
                <span className="headline">{headline}</span>
              </div>
            ))}
          </div>
          <div className="journal-side">
            <Link href="/about" className="about-card">
              <span className="kicker">About</span>
              <span className="headline">
                Magazines live or die on shelves, and the shelves disappeared.
              </span>
            </Link>
            <div className="journal-sections">
              <span className="label">Sections</span>
              {SECTIONS.map((section) => (
                <span key={section} className="journal-section-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 0', borderTop: '1px solid var(--border)', fontWeight: 600, fontSize: 17 }}>
                  {section}
                  <ArrowIcon size={16} />
                </span>
              ))}
              <Link
                href="/newsletter"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 0', borderTop: '1px solid var(--border)', fontWeight: 600, fontSize: 17 }}
              >
                Indexed, the monthly newsletter
                <ArrowIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
