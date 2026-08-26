import Link from 'next/link';

// The v2 index card: 3/4 cover at 4px radius (scale 1.05 on hover via CSS),
// Featured pill, Archivo name, mono publisher, niche chip + "Order now" chip.
// Plain component so both server pages (niche, publisher) and the client
// grid can render it.
export interface GridItem {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  publisher: string;
  niche: string | null;
  onNeesh: boolean;
  featured: boolean;
}

export function TitleGridCard({ item, eager = false }: { item: GridItem; eager?: boolean }) {
  return (
    <Link href={`/titles/${item.slug}`} className="t-card">
      <div className="t-card-cover">
        {item.cover ? (
          <img src={item.cover} alt={`${item.name} cover`} loading={eager ? 'eager' : 'lazy'} />
        ) : (
          <div className="t-card-fallback">
            <span className="name">{item.name}</span>
            <div className="meta">
              <span className="pub">{item.publisher}</span>
              <span className="soon">Cover coming soon</span>
            </div>
          </div>
        )}
        {item.featured && <span className="featured-pill">Featured</span>}
      </div>
      <span className="t-card-name">{item.name}</span>
      <span className="t-card-pub">{item.publisher}</span>
      <div className="t-card-chips">
        {item.niche && <span className="chip">{item.niche}</span>}
        {item.onNeesh && <span className="chip order">Order now</span>}
      </div>
    </Link>
  );
}
