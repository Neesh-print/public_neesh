import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Logo';
import { StartSearch } from '@/components/collect/StartSearch';

export const metadata: Metadata = {
  title: 'Your collection | Neesh',
  description:
    "Build your magazine collection on Neesh. Save the issues on your shelf, follow the magazines you love, and find the shops that carry them. Free and private.",
  alternates: { canonical: '/collect' },
};

// Landing page for the NYC poster and sticker campaign (QR codes carry
// utm_source=print&utm_medium=campaign&utm_campaign=collect-nyc). Every
// promise here matches what the product backs up on day one.
export default function CollectLanding() {
  return (
    <>
      <section className="collect-hero">
        <div className="wrap">
          <span className="eyebrow">Your collection</span>
          <h1>Build your magazine collection on Neesh.</h1>
          <p className="collect-sub">
            Every magazine you&rsquo;ve kept deserves a record. Save the issues on your shelf, follow the
            magazines you love, and find the shops that carry them. Free and private.
          </p>
          <div className="cta-row">
            <a href="#start" className="btn solid">
              Start your collection
              <ArrowIcon />
            </a>
            <Link href="/index" className="text-link">
              Explore magazines
            </Link>
          </div>
          <StartSearch />
        </div>
      </section>

      <section className="collect-three">
        <div className="wrap">
          <h2>Your shelf, catalogued</h2>
          <div className="collect-three-grid">
            <div>
              <h3>Own it.</h3>
              <p>
                Mark every issue you have, back to issue one. Your collection lives in one place instead
                of three tote bags and a closet.
              </p>
            </div>
            <div>
              <h3>Follow it.</h3>
              <p>
                Follow a magazine on Neesh and hear when the next issue is out, without committing to the
                whole back catalogue.
              </p>
            </div>
            <div>
              <h3>Find it.</h3>
              <p>
                Save the issues you&rsquo;re after to your collection and see which shops carry the
                magazine, closest first.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="collect-contribute">
        <div className="wrap">
          <h2>Missing from Neesh? Add it.</h2>
          <p>
            The Neesh Index is built by people who care about print. If a magazine or an issue isn&rsquo;t
            here yet, add it in under a minute and tell us whether it&rsquo;s on your shelf or on your
            list. Additions carry a reader-added tag until we&rsquo;ve checked them.
          </p>
          <Link href="/collect/add" className="btn ghost">
            Add a magazine
          </Link>
        </div>
      </section>

      <section className="collect-why">
        <div className="wrap">
          <h2>Records have Discogs. Magazines have Neesh.</h2>
          <p>
            Vinyl collectors have had a shared record of every pressing for twenty years. Magazine people
            have had memory and Instagram saves. Neesh is building the infrastructure independent print
            has been missing, and it starts with knowing what exists, who&rsquo;s keeping it, and where to
            find it.
          </p>
          <p className="collect-signoff">Stacks, shelves and strong opinions. Neesh.</p>
        </div>
      </section>
    </>
  );
}
