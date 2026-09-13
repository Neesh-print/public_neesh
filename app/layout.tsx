import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
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
  openGraph: {
    type: 'website',
    siteName: 'Neesh',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Neesh — the marketplace for independent magazines',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
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
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PG3P6FN6');`,
          }}
        />
        {/* End Google Tag Manager */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* v2 type system: Archivo (variable width) display, Manrope body,
            IBM Plex Mono eyebrows/nav/metadata. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Sitewide Organization block, the entity anchor. */}
        <JsonLd data={organizationLd()} />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PG3P6FN6"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
