import { MarketingHeader } from '@/components/SiteNav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main className="marketing-main">{children}</main>
    </>
  );
}
