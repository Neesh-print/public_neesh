'use client';

import Link from 'next/link';
import { useState } from 'react';
import { StartSearch } from './StartSearch';

const BENEFITS: [string, string][] = [
  [
    'Own it.',
    'Mark every issue you have, back to issue one. Your collection lives in one place instead of three tote bags and a closet.',
  ],
  [
    'Follow it.',
    'Follow a magazine and hear when the next issue is out, without committing to the whole back catalogue.',
  ],
  ['Find it.', "Save the issues you're after and see which shops carry the magazine, closest first."],
];

// /collect. One job: get the visitor searching within seconds. The search
// field sits above the fold on a phone; once there's a query, the photo and
// benefit rows give way to results (on mobile).
export function CollectLanding() {
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;

  return (
    <div className={`c-landing${searching ? ' searching' : ''}`}>
      <div className="wrap c-landing-hero">
        <div className="c-landing-copy">
          <span className="c-mono accent c-eyebrow">Your collection</span>
          <h1 className="c-display">Build your magazine collection on Neesh.</h1>
          <p className="c-lede">
            Every magazine you&rsquo;ve kept deserves a record. Save the issues on your shelf, follow the magazines
            you love, and find the shops that carry them. Free and private.
          </p>
          <StartSearch onQuery={setQuery} />
        </div>
        <picture className="c-landing-photo">
          <source media="(min-width: 900px)" srcSet="/assets/bench-tempura.jpg" />
          <img src="/assets/couch-pair.jpg" alt="Two people reading magazines on a sofa" />
        </picture>
      </div>

      <div className="wrap c-landing-more">
        <div className="c-benefits">
          {BENEFITS.map(([head, body]) => (
            <div key={head} className="c-benefit">
              <h2>{head}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
        <p className="c-fine">
          Your collection is private. Shops and publishers only ever see anonymous totals, and never for small groups
          of readers.
        </p>

        <div className="c-contribute">
          <h2 className="c-display-2">Missing from Neesh? Add it.</h2>
          <p className="c-prose">
            The Neesh Index is built by people who care about print. If a magazine or an issue isn&rsquo;t here yet,
            add it in under a minute and tell us whether it&rsquo;s on your shelf or on your list. Additions carry a
            reader-added label until we&rsquo;ve checked them.
          </p>
          <Link href="/collect/add" className="c-btn">
            Add a magazine
          </Link>
        </div>
      </div>
    </div>
  );
}
