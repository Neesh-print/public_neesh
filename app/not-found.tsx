import Link from 'next/link';

// 404 copy from the transactional doc (4.1).
export default function NotFound() {
  return (
    <main className="container system-page">
      <h1>This page doesn&apos;t exist</h1>
      <p>
        It might have moved, or the magazine might have asked us to take its page down.
        Both happen.
      </p>
      <div className="cta-row">
        <Link className="button" href="/index">
          Browse the index
        </Link>
        <Link className="button ghost" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
