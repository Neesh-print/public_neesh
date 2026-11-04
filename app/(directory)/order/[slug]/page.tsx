import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTitleBySlug } from '@/lib/queries';
import { canonical } from '@/lib/seo';
import { OrderFork } from '@/components/OrderFork';

// Five minutes, so a publisher's edit from the Neesh portal shows up
// quickly. The portal's on-demand refresh (/api/revalidate-listing) is
// challenged by the Vercel firewall, so this is what keeps pages fresh.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: 'Order on Neesh',
    alternates: { canonical: canonical(`/order/${slug}`) },
    robots: { index: false },
  };
}

// The step between a title profile and the retailer signup: makes the
// wholesale model explicit and forks spaces from readers.
export default async function OrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title || !title.available_on_neesh) notFound();

  return (
    <section>
      <div className="utility-page roomy">
        <OrderFork titleId={title.id} titleName={title.name} titleSlug={title.slug} />
      </div>
    </section>
  );
}
