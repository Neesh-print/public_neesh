'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowIcon } from './Logo';

// The Add a title fork, v2: one entry point for everyone. Publishers head
// into the claim flow (search first, so claiming beats duplicating); spaces
// and readers get a mini form that lands in directory_suggestions.
export function AddTitleFork() {
  const [state, setState] = useState<'fork' | 'publisher' | 'form'>('fork');

  const back = (
    <button
      type="button"
      onClick={() => setState('fork')}
      className="text-link"
      style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      Back
    </button>
  );

  if (state === 'fork') {
    return (
      <>
        <h1>Add a title</h1>
        <p className="sub">Do you publish it?</p>
        <div className="door-cards">
          <button type="button" className="door-card dark" onClick={() => setState('publisher')}>
            <span className="title">Yes, it is mine</span>
            <span className="sub">Claim it and set your own terms.</span>
          </button>
          <button type="button" className="door-card" onClick={() => setState('form')}>
            <span className="title">No, I just want it</span>
            <span className="sub">Tell us and we will chase it.</span>
          </button>
        </div>
      </>
    );
  }

  if (state === 'publisher') {
    return (
      <>
        <h1>Then claim it, do not suggest it</h1>
        <p className="sub">
          A claimed title gets your pricing, your terms, and sales data back. Search the index
          first, in case it is already there.
        </p>
        <div className="inline-actions" style={{ marginTop: 8 }}>
          <Link href="/auth/publisher" className="btn solid">
            Find your magazine
            <ArrowIcon />
          </Link>
          {back}
        </div>
      </>
    );
  }

  return (
    <>
      <h1>What are we missing?</h1>
      <p className="sub">If it fits the index, we will add it.</p>
      <form action="/api/suggest-title" method="post" className="utility-form">
        <label className="field">
          <span>Magazine title</span>
          <input name="title_name" required maxLength={200} placeholder="e.g. Mushroom People" />
        </label>
        <label className="field">
          <span>Publisher website (optional)</span>
          <input name="publisher_website" type="url" placeholder="https://yourmagazine.com" maxLength={500} />
        </label>
        <label className="field">
          <span>Your email</span>
          <input name="email" type="email" required maxLength={320} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>I am a</span>
          <select name="role" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option value="space">Space (shop, café, hotel)</option>
            <option value="reader">Reader</option>
          </select>
        </label>
        <div className="inline-actions">
          <button className="btn solid" type="submit">
            Add it to the queue
          </button>
          {back}
        </div>
      </form>
    </>
  );
}
