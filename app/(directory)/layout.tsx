import { DirectoryHeader } from '@/components/SiteChrome';
import { Footer } from '@/components/Footer';

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DirectoryHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
