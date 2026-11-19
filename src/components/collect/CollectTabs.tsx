'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCollect } from './CollectProvider';

// Sub-nav for the reader pages (Shelf, Wants, Following, Add, Settings),
// with a save nudge while signed out.
export function CollectTabs() {
  const pathname = usePathname();
  const { ready, session, items, titles, openSheet } = useCollect();
  const wants = Object.values(items).filter((s) => s === 'want').length;
  const following = Object.values(titles).filter((t) => t.following).length;
  const tabs = [
    { href: '/collect/shelf', label: 'Shelf', count: 0 },
    { href: '/collect/wants', label: 'Wants', count: wants },
    { href: '/collect/following', label: 'Following', count: following },
    { href: '/collect/add', label: 'Add', count: 0 },
    { href: '/collect/settings', label: 'Settings', count: 0 },
  ];
  return (
    <div className="c-subnav">
      <span className="c-mono accent">Your collection</span>
      <nav className="c-tabs" aria-label="Your collection">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link key={tab.href} href={tab.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
              {tab.label}
              {tab.count > 0 && <span className="c-tab-count">{tab.count}</span>}
            </Link>
          );
        })}
      </nav>
      {ready && !session && (
        <p className="c-device-note">
          Saved on this device.{' '}
          <button type="button" className="c-link" onClick={openSheet}>
            Add your email to keep it
          </button>
        </p>
      )}
    </div>
  );
}
