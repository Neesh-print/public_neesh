import { coverPublicUrl } from '@/lib/supabase';
import type { TitleWithPublisher } from '@/lib/types';

// Profile cover with a designed fallback state: no page ever ships a broken
// image. The fallback card is server-rendered HTML in the index-card style.
export function CoverCard({ title }: { title: TitleWithPublisher }) {
  const src = coverPublicUrl(title.cover_image_path);
  if (src) {
    return <img className="title-cover" src={src} alt={`${title.name} cover`} loading="eager" />;
  }
  return (
    <div
      className="title-cover"
      aria-label={`${title.name}, no cover image yet`}
      style={{ borderRadius: 8 }}
    >
      <div className="t-card-fallback" style={{ height: '100%', borderRadius: 8 }}>
        <span className="name" style={{ fontSize: 24 }}>
          {title.name}
        </span>
        <div className="meta">
          <span className="pub">{title.publisher.name}</span>
          <span className="soon">Cover coming soon</span>
        </div>
      </div>
    </div>
  );
}
