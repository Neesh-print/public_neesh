import Link from 'next/link';
import { Logo } from '@/components/Logo';

// Minimal chrome: logo-only header, hairline border, no footer. Matches the
// prototype's chromeOwn screens (newsletter here; login and application
// states live in the app).
export default function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="min-header">
        <div className="wrap min-header-inner">
          <Link href="/" className="logo">
            <Logo width={98} />
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
