'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { trackRequestItClick, trackSeeStockedClick, trackStockItClick } from '@/lib/neesh-analytics';

// Tiny client wrappers so server-rendered CTAs can push a dataLayer event.
// The element underneath is still a plain link or form: the push happens in
// the handler and the navigation or post carries on untouched, so with JS
// off the CTA works exactly as before, just untracked.
export type TitleCta = 'stock_it' | 'request_it' | 'see_stocked';

const TRACKERS: Record<TitleCta, (titleSlug: string) => void> = {
  stock_it: trackStockItClick,
  request_it: trackRequestItClick,
  see_stocked: trackSeeStockedClick,
};

export function trackTitleCta(cta: TitleCta, titleSlug: string): void {
  try {
    TRACKERS[cta](titleSlug);
  } catch {
    // analytics never breaks the page
  }
}

export function TrackedLink({
  cta,
  titleSlug,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { cta: TitleCta; titleSlug: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackTitleCta(cta, titleSlug);
        onClick?.(event);
      }}
    />
  );
}

export function TrackedForm({
  cta,
  titleSlug,
  onSubmit,
  ...props
}: ComponentProps<'form'> & { cta: TitleCta; titleSlug: string }) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        trackTitleCta(cta, titleSlug);
        onSubmit?.(event);
      }}
    />
  );
}
