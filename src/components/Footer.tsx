import Link from 'next/link';
import { Logo } from './Logo';

// v2 footer: black band, 82px white wordmark, mono uppercase links.
// Rendered by the marketing and directory layouts; the minimal chrome
// (newsletter) omits it, matching the prototype's chromeOwn screens.
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <Link href="/" className="logo" style={{ color: '#fff' }}>
          <Logo width={82} />
        </Link>
        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://www.instagram.com/neeshprint/" rel="noopener noreferrer">
            Instagram
          </a>
          <Link href="/newsletter">Newsletter</Link>
          <a href="mailto:hi@neesh.art">Contact</a>
        </div>
      </div>
    </footer>
  );
}
