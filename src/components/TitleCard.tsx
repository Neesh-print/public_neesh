import Link from 'next/link';
import { CoverCard } from './CoverCard';
import { FREQUENCY_LABELS, placeLabel } from '@/lib/seo';
import type { TitleWithPublisher } from '@/lib/types';

export function TitleCard({ title }: { title: TitleWithPublisher }) {
  const meta = [
    title.frequency ? FREQUENCY_LABELS[title.frequency] : null,
    placeLabel(title.city, title.country),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="title-card">
      <Link href={`/titles/${title.slug}`} aria-label={title.name}>
        <CoverCard title={title} />
      </Link>
      <div className="title-card-body">
        <h3>
          <Link href={`/titles/${title.slug}`}>{title.name}</Link>
        </h3>
        <p className="title-card-meta">{meta || title.publisher.name}</p>
      </div>
    </li>
  );
}
