import type { Metadata } from 'next';

// A reader's own pages: private, never indexed.
export const metadata: Metadata = {
  title: 'Your collection | Neesh',
  robots: { index: false, follow: false },
};

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
