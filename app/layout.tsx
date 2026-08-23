import type { Metadata } from 'next';
import Link from 'next/link';
import { organizationLd, siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Neesh Directory',
    template: '%s',
  },
  description:
    'A working index of independent magazines, who publishes them, and where they publish from.',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Sitewide Organization block, the entity anchor (spec 1.5) */}
        <JsonLd data={organizationLd()} />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/directory" className="wordmark">
              Neesh
            </Link>
            <nav className="site-nav">
              <Link href="/directory">Directory</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <p>
              <strong>Neesh</strong> · Independent print, indexed
            </p>
            <p>
              <a href="https://instagram.com/neesh.art" rel="me">
                Instagram
              </a>
            </p>
            <p className="muted">
              Run a magazine listed here? Claim your profile from its page, or ask us to
              remove it. Removal happens the same day.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
