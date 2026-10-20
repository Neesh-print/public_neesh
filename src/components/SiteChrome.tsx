'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo, ArrowIcon } from './Logo';
import { useCollectOptional } from './collect/CollectProvider';

// v2 chrome (design handoff): marketing header (single 74px row, mono nav,
// hover dropdowns), directory header (62px logo/search/auth row over a 44px
// nav row), and the full-screen black drawer under 900px. Active page gets a
// 2px accent underline.

const DRAWER_LINKS = [
  { label: 'Explore', href: '/index' },
  { label: 'Your collection', href: '/collect' },
  { label: 'For Publishers', href: '/publishers' },
  { label: 'For Spaces', href: '/spaces' },
  { label: 'Packs', href: '/packs' },
  { label: 'Journal', href: '/journal' },
];

const DRAWER_UTILITY = [
  { label: 'Cities', href: '/cities' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Add a title', href: '/add-title' },
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Contact', href: 'mailto:hi@neesh.art' },
];

// Owned plus wanted issues, shown beside "Your collection" once anything is
// saved. Pages without the collection provider show no count.
function CollectCount() {
  const collect = useCollectOptional();
  if (!collect?.ready || collect.count === 0) return null;
  return <span className="nav-count">{collect.count}</span>;
}

// Signed in readers land on their shelf; everyone else on the landing page.
function useCollectHref(): string {
  const collect = useCollectOptional();
  return collect && (collect.count > 0 || collect.session) ? '/collect/shelf' : '/collect';
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/collect') return pathname === '/collect' || pathname.startsWith('/collect/');
  if (href === '/index') return pathname === '/index' || pathname.startsWith('/index/') || pathname === '/catalog' || pathname.startsWith('/catalog/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Drawer({ close }: { close: () => void }) {
  return (
    <div className="drawer">
      <div className="drawer-head">
        <Link href="/" className="logo" onClick={close} style={{ color: '#fff' }}>
          <Logo width={84} />
        </Link>
        <button type="button" className="drawer-close" aria-label="Close menu" onClick={close}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="drawer-nav" aria-label="Menu">
        {DRAWER_LINKS.map((item) => (
          <Link key={item.href} href={item.href} onClick={close}>
            {item.label}
            <ArrowIcon size={18} />
          </Link>
        ))}
        <Link href="/auth" className="auth" onClick={close}>
          Sign Up / Log In
          <ArrowIcon size={18} />
        </Link>
      </nav>
      <div className="drawer-utility">
        {DRAWER_UTILITY.map((item) =>
          item.href.startsWith('mailto:') ? (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} onClick={close}>
              {item.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  const collectHref = useCollectHref();
  return (
    <>
      <Link href="/index" className={isActive(pathname, '/index') ? 'active' : undefined}>
        Explore
      </Link>
      <Link href={collectHref} className={isActive(pathname, '/collect') ? 'active' : undefined}>
        Your collection
        <CollectCount />
      </Link>
      <Link href="/publishers" className={isActive(pathname, '/publishers') ? 'active' : undefined}>
        For Publishers
      </Link>
      <div className="nav-item">
        <Link href="/spaces" className={isActive(pathname, '/spaces') ? 'active' : undefined}>
          For Spaces
        </Link>
        <div className="nav-menu">
          <Link href="/packs">Packs</Link>
        </div>
      </div>
      <div className="nav-item">
        <Link href="/journal" className={isActive(pathname, '/journal') ? 'active' : undefined}>
          Journal
        </Link>
        <div className="nav-menu">
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
        </div>
      </div>
    </>
  );
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="mk-header">
        <div className="wrap mk-header-inner">
          <Link href="/" className="logo">
            <Logo width={98} />
          </Link>
          <nav className="mono-nav" aria-label="Main">
            <NavLinks pathname={pathname} />
            <Link href="/auth" className="auth">
              Sign Up / Log In
            </Link>
          </nav>
          <button type="button" className="menu-button" aria-label="Open menu" onClick={() => setOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            Menu
          </button>
        </div>
      </header>
      {open && <Drawer close={() => setOpen(false)} />}
    </>
  );
}

// The directory search is live: typing filters the index in place (the grid
// listens for the neesh:index-q event); from any other directory page it
// navigates to /index carrying the query.
export function DirectoryHeader() {
  const pathname = usePathname();
  const collect = useCollectOptional();
  const collectHref = useCollectHref();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const onIndex = pathname === '/index' || pathname === '/catalog';
  // The phone header has room for the short form only.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (pathname === '/collect') {
      window.dispatchEvent(new CustomEvent('neesh:collect-search', { detail: value }));
    } else if (onIndex) {
      window.dispatchEvent(new CustomEvent('neesh:index-q', { detail: value }));
    } else if (value.trim()) {
      router.push(`/index?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <>
      <header className="dir-header">
        <div className="wrap">
          <div className="dir-row-one">
            <Link href="/" className="logo">
              <Logo width={98} />
            </Link>
            <div className="dir-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71747F" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4.5-4.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder={narrow ? 'Search 300+ magazines' : 'Search 300+ independent magazines'}
                aria-label="Search the index"
              />
            </div>
            {collect?.email ? (
              <Link href="/collect/settings" className="dir-auth">
                {collect.email}
              </Link>
            ) : (
              <Link href="/auth" className="dir-auth">
                Sign Up / Log In
              </Link>
            )}
            {collect && (
              <Link href={collectHref} className="collect-pill" aria-label={`Your collection${collect.count ? `, ${collect.count} issues` : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 4h16v16H4z" />
                  <path d="M9 4v16M15 4v16" />
                </svg>
                {collect.ready && collect.count > 0 && <span>{collect.count}</span>}
              </Link>
            )}
            <button
              type="button"
              className="menu-button round"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
          <nav className="mono-nav dir-row-two" aria-label="Main">
            {DRAWER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href === '/collect' ? collectHref : item.href}
                className={isActive(pathname, item.href) ? 'active' : undefined}
              >
                {item.label}
                {item.href === '/collect' && <CollectCount />}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {open && <Drawer close={() => setOpen(false)} />}
    </>
  );
}
