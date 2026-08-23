import Link from 'next/link';
import { CoverCard } from './CoverCard';
import type { TitleWithPublisher } from '@/lib/types';

// The catalog card treatment from the live /explore page: 3:4 cover with a
// soft shadow and hover lift, then name, publisher, and a niche chip.
export function TitleCard({
  title,
  chip,
  featured = false,
}: {
  title: TitleWithPublisher;
  chip?: string | null;
  featured?: boolean;
}) {
  return (
    <li className="title-card">
      <Link href={`/titles/${title.slug}`} className="title-card-link">
        <div className="title-card-cover">
          <CoverCard title={title} />
          {featured && <span className="featured-badge">★ Featured</span>}
        </div>
        <div className="title-card-body">
          <h3>{title.name}</h3>
          <p className="title-card-meta">{title.publisher.name}</p>
          {chip && <span className="title-card-chip">{chip}</span>}
        </div>
      </Link>
    </li>
  );
}
