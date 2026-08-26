'use client';

import { useCallback, useEffect, useState } from 'react';

export interface PackSlide {
  id: string;
  name: string;
  audience: string;
  body: string[];
  image: string;
  interiors: string[];
  order: string;
  withStand: string;
}

// The original curated-packs slider: one pack visible at a time, arrows,
// dots, hash sync (#the-studio selects the slide), keyboard navigation,
// and a lightbox on every image. Ported from the static page's JS.
export function PacksShowcase({ packs }: { packs: PackSlide[] }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const go = useCallback(
    (n: number, updateHash = true) => {
      const next = (n + packs.length) % packs.length;
      setIndex(next);
      if (updateHash && typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', `#${packs[next].id}`);
      }
    },
    [packs]
  );

  useEffect(() => {
    function fromHash(scroll: boolean) {
      const hash = window.location.hash.replace('#', '');
      const k = packs.findIndex((p) => p.id === hash);
      if (k === -1) return;
      go(k, false);
      if (scroll) document.getElementById('packs')?.scrollIntoView({ block: 'start' });
    }
    fromHash(true);
    const onHash = () => fromHash(false);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [packs, go]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (lightbox) {
        if (event.key === 'Escape') setLightbox(null);
        return;
      }
      if (event.key === 'ArrowLeft') go(index - 1);
      if (event.key === 'ArrowRight') go(index + 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, lightbox, go]);

  function zoom(src: string, alt: string) {
    setLightbox({ src, alt });
  }

  return (
    <>
      <div className="pk-sliderarea">
        <div className="pk-slider">
          {packs.map((pack, k) => (
            <div
              className={`pk-slide${k === index ? ' active' : ''}`}
              id={pack.id}
              key={pack.id}
            >
              <div className="pk-pack">
                <div className="top">
                  <button
                    type="button"
                    className="pk-zoombtn"
                    onClick={() => zoom(pack.image, `${pack.name} pack`)}
                  >
                    <img
                      loading="lazy"
                      decoding="async"
                      src={pack.image}
                      alt={`${pack.name} pack`}
                    />
                  </button>
                  <div>
                    <h3>{pack.name}</h3>
                    <div className="aud">{pack.audience}</div>
                    {pack.body.map((para) => (
                      <p className="desc" key={para.slice(0, 24)}>
                        {para}
                      </p>
                    ))}
                    <div className="ctarow">
                      <a className="button" href={pack.order}>
                        Order this pack
                      </a>
                      <a className="button ghost" href={pack.withStand}>
                        With stand, $300
                      </a>
                    </div>
                  </div>
                </div>
                <div className="inside">
                  <div className="label">Inside the pack</div>
                  <div className={`pk-strip${pack.interiors.length === 3 ? ' three' : ''}`}>
                    {pack.interiors.map((src) => (
                      <button
                        type="button"
                        className="pk-zoombtn"
                        key={src}
                        onClick={() => zoom(src, `${pack.name} spread`)}
                      >
                        <img loading="lazy" decoding="async" src={src} alt={`${pack.name} spread`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pk-navarea">
        <div className="pk-slidenav">
          <button className="arrow" aria-label="Previous pack" onClick={() => go(index - 1)}>
            ←
          </button>
          <div className="pk-dots">
            {packs.map((pack, k) => (
              <button
                key={pack.id}
                className={k === index ? 'on' : undefined}
                aria-label={`Pack ${k + 1}`}
                onClick={() => go(k)}
              />
            ))}
          </div>
          <button className="arrow" aria-label="Next pack" onClick={() => go(index + 1)}>
            →
          </button>
        </div>
        <div className="pk-slidecount">
          {index + 1} of {packs.length}
        </div>
      </div>

      {lightbox && (
        <div
          className="pk-lightbox open"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded spread"
          onClick={() => setLightbox(null)}
        >
          <button className="close" aria-label="Close">
            ×
          </button>
          <img src={lightbox.src} alt={lightbox.alt} />
        </div>
      )}
    </>
  );
}
