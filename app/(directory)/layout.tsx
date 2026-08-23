import { DirectoryHeader } from '@/components/SiteNav';

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DirectoryHeader />
      <main className="container directory-main">{children}</main>
    </>
  );
}
