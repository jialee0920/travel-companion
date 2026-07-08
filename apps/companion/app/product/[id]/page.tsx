import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Store } from 'lucide-react';
import { BottomChrome } from '@/components/BottomChrome';
import { bottomChromePaddingClass } from '@/lib/bottom-chrome';
import { getProductById } from '@/lib/db/products';
import { GroupBuyWidget } from '@/components/GroupBuyWidget';
import { listParticipants } from '@/lib/db/orders';
import { resolveProductImageUrl } from '@/lib/products/format';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const participants = await listParticipants(id);
  const imageUrl = resolveProductImageUrl(product.imageUrl);

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background ${bottomChromePaddingClass(true)}`}>
      <div className="relative h-56 w-full bg-white">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-contain"
          sizes="448px"
          priority
        />
        <Link
          href="/group-buy"
          aria-label="뒤로"
          className="absolute left-4 top-12 flex size-10 items-center justify-center rounded-full bg-card/90 backdrop-blur"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Store className="size-4" />
          {product.sellerName}
        </div>
        <h1 className="mt-1.5 text-xl font-bold">{product.name}</h1>
        {product.ticketLabel ? (
          <p className="mt-1 text-xs font-medium text-primary">{product.ticketLabel}</p>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      </div>

      <div className="px-5">
        <GroupBuyWidget product={product} />
      </div>

      {participants.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="text-sm font-bold">
            참여자 <span className="text-primary">{participants.length}</span>명
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">{p.display_name}</span>
                <span className="font-mono text-xs font-semibold text-primary">{p.order_code}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomChrome hideNav />
    </main>
  );
}
