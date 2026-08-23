import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Journal | Neesh',
  description:
    'Essays, interviews, and reporting on independent print, distribution, and why physical media keeps outliving its obituaries. From Neesh.',
  alternates: { canonical: canonical('/journal') },
};

// A hub with pinned pieces and sections, not a reverse-chronological feed.
// A feed would bury the thesis pieces within a month (v3 design notes).
// The three essay bodies are being written; the cards render as placeholders
// with their real titles and teasers until they publish.
const PINNED = [
  {
    title: 'What print can learn from vinyl',
    teaser:
      "Vinyl was declared dead, abandoned by the majors, and kept alive by a handful of pressing plants and the people who needed it. Then it came back. Here's what actually caused that, and which parts print can copy.",
  },
  {
    title: 'Every magazine should be evergreen',
    teaser:
      "The periodical model is what's killing independent print. Publishers overprint against a date, the date passes, and the unsold copies become someone's storage problem. There's a better way to make a magazine.",
  },
  {
    title: "The newsstand is gone. Here's what replaced it.",
    teaser:
      "Half the world's best magazine shops closed in the last five years. The shelf didn't disappear, it moved into cafés, hotels, gyms, and waiting rooms. What that means for anyone trying to sell print.",
  },
];

const SECTIONS = [
  { name: 'Essays', line: 'Arguments about print, distribution, and physical media.' },
  { name: 'Interviews', line: 'Publishers, retailers, and the people keeping print moving.' },
  { name: 'Title write-ups', line: 'Individual magazines worth knowing about.' },
  { name: 'Pack stories', line: 'What went into each pack and why.' },
  { name: 'From the shelf', line: 'Spaces stocking print, and what happened after they did.' },
  {
    name: 'Indexed',
    line: 'The Neesh newsletter. Monthly, on wider culture through the lens of independent print. Archive lives here.',
  },
];

export default function JournalPage() {
  return (
    <>
      <section className="m-hero">
        <div className="container">
          <h1>Journal</h1>
          <p className="lede">
            Essays, interviews, and reporting on independent print. Why it keeps outliving
            its obituaries, what distribution actually costs, and who&apos;s making the
            best work right now.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <ul className="pinned-grid">
            {PINNED.map((piece) => (
              <li key={piece.title} className="pinned-card">
                <h2>{piece.title}</h2>
                <p>{piece.teaser}</p>
                <p className="muted">Coming soon</p>
              </li>
            ))}
            <li className="pinned-card">
              <h2>About Neesh</h2>
              <p>Who we are, what we&apos;re building, and why.</p>
              <p>
                <Link href="/about">Read it</Link>
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="audience-block">
        <div className="container">
          <dl className="sections-list">
            {SECTIONS.map((section) => (
              <div key={section.name}>
                <dt>{section.name}</dt>
                <dd>{section.line}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="closing-band band">
        <div className="container">
          <h2>Indexed</h2>
          <p>
            A monthly read on culture through independent print. One letter, a few
            magazines, no roundups.
          </p>
          <a className="button" href="/newsletter">
            Subscribe
          </a>
        </div>
      </section>
    </>
  );
}
