'use client';

import Link from 'next/link';
import { useState } from 'react';

// The four top-level items plus auth (handoff section 4). Packs nests under
// For Spaces; About and FAQ nest under Journal. The nav label is "Index"
// even though the path is /directory (handoff 5.1).
export const NAV = [
  { label: 'Index', href: '/directory' },
  { label: 'For Publishers', href: '/publishers' },
  { label: 'For Spaces', href: '/spaces', children: [{ label: 'Packs', href: '/packs' }] },
  {
    label: 'Journal',
    href: '/journal',
    children: [
      { label: 'About', href: '/about' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
];

export function AuthLink() {
  // Purple text on white, no pill, no fill, no border (handoff section 4).
  return (
    <Link href="/auth" className="auth-link">
      Sign Up / Log In
    </Link>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((item) =>
        item.children ? (
          <div className="nav-drop" key={item.href}>
            <Link href={item.href} onClick={onNavigate}>
              {item.label}
            </Link>
            <div className="nav-drop-menu">
              {item.children.map((child) => (
                <Link key={child.href} href={child.href} onClick={onNavigate}>
                  {child.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            {item.label}
          </Link>
        )
      )}
    </>
  );
}

function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
  if (!open) return null;
  return (
    <nav className="mobile-menu" aria-label="Menu">
      {NAV.map((item) => (
        <div key={item.href}>
          <Link href={item.href} onClick={close}>
            {item.label}
          </Link>
          {item.children?.map((child) => (
            <Link key={child.href} href={child.href} onClick={close} className="nested">
              {child.label}
            </Link>
          ))}
        </div>
      ))}
      <Link href="/auth" onClick={close} className="auth-link">
        Sign Up / Log In
      </Link>
    </nav>
  );
}

function Hamburger({ open, toggle }: { open: boolean; toggle: () => void }) {
  return (
    <button className="hamburger" aria-label="Toggle menu" aria-expanded={open} onClick={toggle}>
      {open ? '✕' : '☰'}
    </button>
  );
}

// Marketing pages: single row. Logo left, nav items, auth right.
export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <img src="/neesh-logo.png" alt="Neesh" />
        </Link>
        <nav className="site-nav" aria-label="Main">
          <NavItems />
          <AuthLink />
        </nav>
        <Hamburger open={open} toggle={() => setOpen(!open)} />
      </div>
      <MobileMenu open={open} close={() => setOpen(false)} />
    </header>
  );
}

// Directory pages: two rows, the Discogs pattern (handoff section 4).
// Row one is logo, persistent search, auth. Row two is the four nav items.
// Search is not built yet, so the field renders disabled with the
// placeholder rather than the row being omitted.
export function DirectoryHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header directory-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <img src="/neesh-logo.png" alt="Neesh" />
        </Link>
        <input
          className="header-search"
          type="search"
          placeholder="Search 300+ independent magazines"
          disabled
          aria-label="Search the index"
        />
        <span className="header-auth">
          <AuthLink />
        </span>
        <Hamburger open={open} toggle={() => setOpen(!open)} />
      </div>
      <div className="container header-row-two">
        <nav className="site-nav" aria-label="Main">
          <NavItems />
        </nav>
      </div>
      <MobileMenu open={open} close={() => setOpen(false)} />
    </header>
  );
}
