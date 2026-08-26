import { MarketingHeader } from '@/components/SiteChrome';
import { Footer } from '@/components/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
