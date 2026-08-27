'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Pack } from '@/lib/packs';

// The shelf treatment (design handoff "Packs Shelf 1b"): all five packs on
// one row sorted by room, the selected pack lifting off the shelf, a detail
// row beneath, and an order column where the stand is a checkbox that
// rewrites a single running total. One selection, always-one-selected; one
// standAdded flag shared by every stand control (shelf tile, panel toggle,
// phone sticky bar). Ordering goes straight to the pack's Stripe link —
// with-stand when the stand is on.
const STAND_PRICE = 100;
const STAND_IMG = '/assets/magazine-stand.jpg';

export function PackShelf({ packs }: { packs: Pack[] }) {
  const [selectedId, setSelectedId] = useState(packs[0].slug);
  const [standAdded, setStandAdded] = useState(false);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Legacy deep links (#the-studio, #studio) still land on their pack.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const k = packs.find((p) => p.slug === hash || `the-${p.slug}` === hash);
    if (k) setSelectedId(k.slug);
  }, [packs]);

  const pack = packs.find((p) => p.slug === selectedId) ?? packs[0];
  const total = pack.price + (standAdded ? STAND_PRICE : 0);
  const orderHref = standAdded ? pack.withStand : pack.order;

  function onTileKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % packs.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + packs.length) % packs.length;
    if (next === -1) return;
    e.preventDefault();
    setSelectedId(packs[next].slug);
    tileRefs.current[next]?.focus();
  }

  const standCheckbox = (extra: string) => (
    <span className={`shelf-check ${extra}${standAdded ? ' on' : ''}`} aria-hidden="true">
      {standAdded ? '✓' : ''}
    </span>
  );

  return (
    <section id="the-packs" className="shelf-section">
      <div className="wrap">
        <div className="shelf-eyebrow">
          <span className="lead">The packs · Five rooms</span>
          <span className="meta">
            $200 each &middot; Shipping included<span className="opt"> &middot; Stand optional</span>
          </span>
        </div>

        <div className="shelf-head">
          <h2>
            Pick the room.
            <br />
            We pick the print.
          </h2>
          <p>
            <strong>You don&rsquo;t have time to become a magazine buyer. We already are.</strong>{' '}
            Every pack ships with 8&ndash;10 titles like the ones below.
          </p>
        </div>

        <div className="shelf-row" role="radiogroup" aria-label="Choose a pack">
          {packs.map((p, i) => {
            const selected = p.slug === selectedId;
            return (
              <button
                key={p.slug}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                ref={(el) => {
                  tileRefs.current[i] = el;
                }}
                className={`shelf-tile${selected ? ' selected' : ''}`}
                onClick={() => setSelectedId(p.slug)}
                onKeyDown={(e) => onTileKeyDown(e, i)}
              >
                <span className="lift">
                  <span
                    className="cover"
                    role="img"
                    aria-label={p.name}
                    style={{ backgroundImage: `url(${p.image})` }}
                  >
                    <span className="badge pick" aria-hidden="true">
                      {selected ? '✓' : ''}
                    </span>
                  </span>
                  <span className="name">{p.name}</span>
                  <span className="rooms">{p.short}</span>
                </span>
              </button>
            );
          })}

          <span className="shelf-divider" aria-hidden="true" />

          <button
            type="button"
            role="checkbox"
            aria-checked={standAdded}
            className={`shelf-tile stand${standAdded ? ' selected' : ''}`}
            onClick={() => setStandAdded((v) => !v)}
          >
            <span className="lift">
              <span
                className="cover stand-cover"
                role="img"
                aria-label="Wooden counter stand"
                style={{ backgroundImage: `url(${STAND_IMG})` }}
              >
                <span className="badge add" aria-hidden="true">
                  {standAdded ? '✓' : ''}
                </span>
              </span>
              <span className="accessory-eyebrow" aria-hidden="true">
                Accessory
              </span>
              <span className="name-row">
                <span className="name">Wooden stand</span>
                <span className="plus">+$100</span>
              </span>
              <span className="rooms">Handmade counter stand</span>
            </span>
          </button>
        </div>

        <div className="shelf-detail">
          <div className="shelf-identity">
            <span className="now">Now showing</span>
            <h3>{pack.name}</h3>
            <span className="all-rooms">{pack.rooms}</span>
          </div>

          <div className="shelf-desc">
            <p>{pack.blurb}</p>
            <span className="value">
              {pack.count} &middot; retails at {pack.retail}
            </span>
            <Link href={`/packs/${pack.slug}`} className="shelf-see mobile-only">
              <span>See what&rsquo;s in it &rarr;</span>
            </Link>
          </div>

          <div className="shelf-order">
            <div className="total-row" aria-live="polite">
              <span className="amount">${total}</span>
              <span className="label">Total</span>
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={standAdded}
              className={`stand-toggle${standAdded ? ' on' : ''}`}
              onClick={() => setStandAdded((v) => !v)}
            >
              {standCheckbox('panel')}
              <img src={STAND_IMG} alt="" className="thumb" />
              <span className="toggle-copy">
                <span className="toggle-label">Wooden stand</span>
                <span className="toggle-note">
                  {standAdded ? 'Ships with the pack, one box' : 'Add a counter stand'}
                </span>
              </span>
              <span className="toggle-price">+$100</span>
            </button>
            <a href={orderHref} className="shelf-cta">
              Order this pack <span aria-hidden="true">&rarr;</span>
            </a>
            <Link href={`/packs/${pack.slug}`} className="shelf-see">
              <span>See what&rsquo;s in it &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Phone-only sticky order bar */}
      <div className="shelf-bar">
        <button
          type="button"
          role="checkbox"
          aria-checked={standAdded}
          className="bar-stand"
          onClick={() => setStandAdded((v) => !v)}
        >
          {standCheckbox('panel')}
          <img src={STAND_IMG} alt="" className="thumb" />
          <span className={`bar-label${standAdded ? ' on' : ''}`}>
            {standAdded ? 'Wooden stand added' : 'Add the wooden stand'}
          </span>
          <span className="bar-price">+$100</span>
        </button>
        <div className="bar-total">
          <span className="bar-total-copy" aria-live="polite">
            <span className="label">Total</span>
            <span className="amount">${total}</span>
          </span>
          <a href={orderHref} className="shelf-cta">
            Order this pack <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
