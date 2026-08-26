import Link from 'next/link';
import { MarketingHeader } from '@/components/SiteChrome';
import { Footer } from '@/components/Footer';

// v2 404: purple mono eyebrow, the removal nod, two CTAs.
export default function NotFound() {
  return (
    <>
      <MarketingHeader />
      <main>
        <section>
          <div className="utility-page">
            <span className="eyebrow">404</span>
            <h1>This page doesn&rsquo;t exist</h1>
            <p className="sub">It may have moved, or the magazine asked us to remove it.</p>
            <div className="cta-row" style={{ marginTop: 8 }}>
              <Link href="/index" className="btn solid">
                Browse the index
              </Link>
              <Link href="/" className="btn ghost">
                Go home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
