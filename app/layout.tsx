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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

// Header and footer mirror the neesh.art homepage (MarketingLayout in the
// main app): fixed header, wordmark left, marketing nav right with the
// active page in accent. Links are absolute so they resolve from any domain
// this app is served on.
const NAV_LINKS = [
  { label: 'Explore Magazines', href: 'https://neesh.art/explore' },
  { label: 'For Publishers', href: 'https://neesh.art/publishers' },
  { label: 'For Retailers', href: 'https://neesh.art/retailers' },
  { label: 'Pricing', href: 'https://neesh.art/pricing' },
  { label: 'FAQ', href: 'https://neesh.art/faq' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Sitewide Organization block, the entity anchor (spec 1.5) */}
        <JsonLd data={organizationLd()} />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <a href="https://neesh.art" className="brand">
              <img src="/neesh-logo.png" alt="Neesh" />
            </a>
            <nav className="site-nav">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              <Link href="/directory" className="active" aria-current="page">
                Directory
              </Link>
              <a className="accent" href="https://neesh.art/login">
                Log In
              </a>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container footer-row">
            <a href="https://neesh.art" className="brand">
              <img src="/neesh-logo.png" alt="Neesh" />
            </a>
            <div className="footer-links">
              <a href="https://neesh.art/legal/terms">Terms</a>
              <a href="https://neesh.art/legal/privacy">Privacy</a>
              <a href="https://www.instagram.com/neeshprint/" rel="noopener noreferrer">
                Instagram
              </a>
              <a href="mailto:hi@neesh.art">Contact</a>
            </div>
          </div>
          <div className="container">
            <p className="footer-note">
              Run a magazine listed here? Claim your profile from its page, or ask us to
              remove it. Removal happens the same day.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
