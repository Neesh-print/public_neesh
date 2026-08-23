import { coverPublicUrl } from '@/lib/supabase';
import type { Tag, TitleWithPublisher } from '@/lib/types';

// Cover with a designed fallback state: no page ever ships a broken image
// (spec 4.3, 6.3). The fallback card is server-rendered HTML.
export function CoverCard({
  title,
  primaryTag,
}: {
  title: TitleWithPublisher;
  primaryTag?: Tag;
}) {
  const src = coverPublicUrl(title.cover_image_path);
  if (src) {
    return <img className="cover" src={src} alt={`${title.name} cover`} loading="lazy" />;
  }
  return (
    <div className="cover-fallback" aria-label={`${title.name}, no cover image yet`}>
      <div>
        <div className="fallback-bar" />
        <div className="fallback-name">{title.name}</div>
      </div>
      <div className="fallback-meta">
        {title.publisher.name}
        {primaryTag ? ` · ${primaryTag.name}` : ''}
        <br />
        Cover coming soon
      </div>
    </div>
  );
}
