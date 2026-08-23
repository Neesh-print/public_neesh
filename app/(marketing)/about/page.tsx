import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical, siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';

export const revalidate = 86400;

// Standalone page nested in nav under Journal. Not a Journal article, no
// Article markup: AboutPage keeps its type and never carries a stale
// publication date (handoff 11).
export const metadata: Metadata = {
  title: 'About Neesh | Infrastructure for independent print',
  description:
    'Neesh is building the infrastructure independent print never had. An index of 300+ magazines and a wholesale marketplace connecting them with shops and spaces worldwide.',
  alternates: { canonical: canonical('/about') },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Neesh',
          url: canonical('/about'),
          about: { '@type': 'Organization', name: 'Neesh', url: siteUrl() },
        }}
      />
      <article className="prose-page container">
        <h1>Magazines live or die on shelves, and the shelves disappeared.</h1>
        <p>
          The newsstands closed. The wholesalers cut their ranges. Half the world&apos;s
          best magazine shops shut in the last five years. Meanwhile independent
          publishing got better than it&apos;s been in decades, and almost none of it can
          be found anywhere physical.
        </p>
        <p>
          Print has no shortage of believers. What it&apos;s been missing is
          infrastructure.
        </p>

        <h2>What we&apos;re building</h2>
        <p>
          An index of every independent magazine worth knowing about, public and free, so
          publishers can be found and buyers can find them.
        </p>
        <p>
          And a wholesale marketplace underneath it, so that finding turns into stocking.
          Publishers set their terms and see their sales. Shops and spaces order in a few
          clicks without opening a distributor account.
        </p>
        <p>
          The shelf has moved. We&apos;re putting magazines in cafés, hotels, spas,
          studios, gyms, and waiting rooms, because that&apos;s where people actually
          spend their time now.
        </p>

        <h2>Why us</h2>
        <p>
          Neesh is run out of Portland, Oregon by me, Gem Nwannem. I&apos;ve spent a
          decade in supply chain and logistics and have been making, buying, hoarding, and
          evangelizing print since college. I&apos;m also a vinyl DJ and radio host, so
          this analog thing runs deep.
        </p>
        <p>
          Independent print doesn&apos;t have a demand problem. It has a distribution
          problem, and distribution is a solved discipline in every industry except this
          one. I built Neesh because I&apos;ve built the solutions for other industries
          and want to do the same here. I love print and I want it to exist for decades to
          come.
        </p>

        <h2>What we believe</h2>
        <p>Publishers should keep their margin and their relationships.</p>
        <p>Sales data should arrive while it&apos;s still useful.</p>
        <p>Unsold copies should be sold, not pulped.</p>
        <p>
          A magazine should be findable in the room where it makes sense, not only in the
          four shops that still carry print.
        </p>
        <p>
          And fifty years from now, someone should still be able to make a magazine and
          make a living doing it.
        </p>

        <div className="cta-row">
          <Link className="button" href="/auth">
            Claim your title
          </Link>
          <Link className="button ghost" href="/packs">
            See the packs
          </Link>
        </div>
      </article>
    </>
  );
}
