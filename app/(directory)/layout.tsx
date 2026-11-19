import { DirectoryHeader } from '@/components/SiteChrome';
import { Footer } from '@/components/Footer';
import { CollectProvider } from '@/components/collect/CollectProvider';

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <CollectProvider>
      <DirectoryHeader />
      <main>{children}</main>
      <Footer />
    </CollectProvider>
  );
}
