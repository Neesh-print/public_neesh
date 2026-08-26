import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';
import { AddTitleFork } from '@/components/AddTitleFork';
import { SubmittedNotice } from '@/components/SubmittedNotice';

export const metadata: Metadata = {
  title: 'Add a title | Neesh',
  description:
    'Add an independent magazine to the Neesh index. Publishers claim a page; everyone else can suggest a title.',
  alternates: { canonical: canonical('/add-title') },
  robots: { index: false },
};

export default function AddTitlePage() {
  return (
    <div className="auth-page">
      <h1>Add a title</h1>
      <p className="lede">Do you publish it?</p>
      <SubmittedNotice />
      <AddTitleFork />
    </div>
  );
}
