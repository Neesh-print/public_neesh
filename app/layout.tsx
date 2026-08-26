import type { Metadata } from 'next';
import { organizationLd, siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Neesh | The Marketplace for Independent Magazines',
    template: '%s',
  },
  description:
    'Where indie mags meet the shops, cafés, hotels, and waiting rooms that stock them. Browse 300+ indie titles. Flat 10 percent fee.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

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
        {/* Sitewide Organization block, the entity anchor. Renders on
            marketing pages and directory pages alike (handoff 11). */}
        <JsonLd data={organizationLd()} />
      </head>
      <body>
        {children}
        <footer className="site-footer">
          <div className="container footer-row">
            <a href="/" className="brand">
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
              <a href="mailto:hi@neesh.art?subject=Remove%20from%20Index">
                Remove from Index
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
