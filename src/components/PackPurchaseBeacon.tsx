'use client';

import { useEffect } from 'react';
import { trackPackPurchase } from '@/lib/neesh-analytics';

const PACK_PRICE = 200;
const RETURN_PARAMS = ['session_id', 'success', 'purchased', 'value'];

// The pack Payment Links send the buyer back to /curatedpacks after paying
// (301 to /packs, query string preserved). This fires pack_purchase once on
// that return, recognised by a Stripe session_id ({CHECKOUT_SESSION_ID}) or
// a success/purchased flag in the query. The order value comes from a value
// param when the redirect carries one and otherwise falls back to the base
// pack price. The markers are then stripped from the URL so a reload does
// not count the purchase twice.
export function PackPurchaseBeacon() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const flag = params.get('success') ?? params.get('purchased');
    const paid = params.has('session_id') || flag === '1' || flag === 'true';
    if (!paid) return;

    const value = Number(params.get('value'));
    trackPackPurchase(Number.isFinite(value) && value > 0 ? value : PACK_PRICE);

    for (const key of RETURN_PARAMS) params.delete(key);
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
    );
  }, []);

  return null;
}
