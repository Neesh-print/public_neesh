import type { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign up or log in | Neesh',
  description: 'Sign up as a publisher or a space, or log in to Neesh.',
  alternates: { canonical: canonical('/auth') },
  robots: { index: false },
};

// One destination for Sign Up and Log In (handoff section 7). The fork:
// publisher path searches the index first so claiming beats duplicating;
// the space path routes to the existing signup flow.
export default function AuthPage() {
  return (
    <div className="auth-page container">
      <h1>Sign up or log in</h1>
      <div className="auth-fork">
        <Link className="button" href="/auth/publisher">
          I publish a magazine
        </Link>
        <Link className="button" href="/auth/space">
          I have a space
        </Link>
      </div>
      <p className="muted">
        <em>Already have an account?</em>{' '}
        <a href="https://neesh.art/login">Log in</a>
      </p>
    </div>
  );
}
