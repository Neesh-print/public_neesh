'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCollect } from './CollectProvider';

const TABS = [
  { href: '/collect/shelf', label: 'Shelf' },
  { href: '/collect/wants', label: 'Wants' },
  { href: '/collect/following', label: 'Following' },
  { href: '/collect/add', label: 'Add' },
  { href: '/collect/settings', label: 'Settings' },
];

// Section header for the reader pages, with a save nudge while signed out.
export function CollectTabs() {
  const pathname = usePathname();
  const { ready, session, openSavePrompt } = useCollect();
  return (
    <div className="collect-head">
      <span className="eyebrow">Your collection</span>
      <nav className="collect-tabs" aria-label="Your collection">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'active' : undefined}>
            {tab.label}
          </Link>
        ))}
      </nav>
      {ready && !session && (
        <p className="collect-device-note">
          Saved on this device.{' '}
          <button type="button" className="text-link" onClick={openSavePrompt}>
            Add your email to keep it
          </button>
        </p>
      )}
    </div>
  );
}
