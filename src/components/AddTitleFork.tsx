'use client';

import Link from 'next/link';
import { useState } from 'react';

// The Add a title fork: one entry point for everyone. Publishers head into
// the signup flow (search first, so claiming beats duplicating); spaces and
// readers get a mini form that lands in directory_suggestions for review.
export function AddTitleFork() {
  const [publisher, setPublisher] = useState<boolean | null>(null);

  return (
    <>
      {publisher === null && (
        <div className="auth-fork">
          <button className="button" onClick={() => setPublisher(true)}>
            I publish it
          </button>
          <button className="button ghost" onClick={() => setPublisher(false)}>
            I&apos;m not the publisher
          </button>
        </div>
      )}

      {publisher === true && (
        <>
          <p className="lede">
            Your title is probably already in our index. Search for it and claim the
            page; if it&apos;s missing, you can add it from there and it&apos;ll be live
            today, free, with a page you control.
          </p>
          <p>
            <Link className="button" href="/auth/publisher">
              Find your magazine
            </Link>
          </p>
          <p className="muted">
            <button className="linklike" onClick={() => setPublisher(null)}>
              Back
            </button>
          </p>
        </>
      )}

      {publisher === false && (
        <>
          <p className="lede">
            Tell us what&apos;s missing. If it fits the index, it&apos;ll usually be live
            within a couple of days, and we&apos;ll email you when it is.
          </p>
          <form action="/api/suggest-title" method="post" className="suggest-form">
            <div className="field">
              <label htmlFor="st-title">Magazine title</label>
              <input id="st-title" name="title_name" required maxLength={200} />
            </div>
            <div className="field">
              <label htmlFor="st-website">Publisher website, if you know it</label>
              <input
                id="st-website"
                name="publisher_website"
                type="url"
                placeholder="https://"
                maxLength={500}
              />
            </div>
            <div className="field">
              <label htmlFor="st-email">Your email</label>
              <input id="st-email" name="email" type="email" required maxLength={320} />
            </div>
            <div className="field">
              <label htmlFor="st-role">I&apos;m a</label>
              <select id="st-role" name="role" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                <option value="space">Space (shop, café, hotel)</option>
                <option value="reader">Reader</option>
              </select>
            </div>
            <button className="button" type="submit">
              Add it to the queue
            </button>
          </form>
          <p className="muted">
            <button className="linklike" onClick={() => setPublisher(null)}>
              Back
            </button>
          </p>
        </>
      )}
    </>
  );
}
