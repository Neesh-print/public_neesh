import type { Metadata } from 'next';
import Link from 'next/link';
import { appUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign Up | Neesh',
  description: 'Two doors, one index. Publishers claim their titles; spaces buy at wholesale.',
  alternates: { canonical: '/auth' },
};

export default function AuthForkPage() {
  return (
    <section>
      <div className="utility-page">
        <h1>Sign up for Neesh</h1>
        <p className="sub">Two doors, one index. Tell us which side of the shelf you are on.</p>
        <div className="door-cards">
          <Link href="/auth/publisher" className="door-card dark">
            <span className="title">I publish a magazine</span>
            <span className="sub">Find your title and claim it.</span>
          </Link>
          <Link href="/auth/space" className="door-card">
            <span className="title">I have a space</span>
            <span className="sub">Buy at wholesale for your room.</span>
          </Link>
        </div>
        <p className="small">
          Already have an account?{' '}
          <a href={appUrl('/login')} className="text-link">
            Log in
          </a>
        </p>
      </div>
    </section>
  );
}
