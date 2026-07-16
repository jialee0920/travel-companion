import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Store } from 'lucide-react';
import { CommentSection } from '@/components/CommentSection';
import { GroupBuyWidget } from '@/components/GroupBuyWidget';
import { LinkifiedText } from '@/components/LinkifiedText';
import { PageGutter } from '@/components/PageGutter';
import { PageShell } from '@/components/PageShell';
import { listComments } from '@/lib/db/comments';
import { listParticipants } from '@/lib/db/orders';
import { getProductById } from '@/lib/db/products';
import { PAGE_GUTTER_CLASS } from '@/lib/layout/page-container';
import { resolveProductImageUrl } from '@/lib/products/format';
import { cn } from '@/lib/utils';
import { isKakaoChannelAction, isPaymentAction } from '@/lib/products/action-type';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [participants, comments] = await Promise.all([
    listParticipants(id),
    listComments('product', id),
  ]);
  const imageUrl = resolveProductImageUrl(product.imageUrl);
  const detailImageUrls = product.detailImageUrls;
  const isKakaoChannel = isKakaoChannelAction(product.actionType);

  const detailAndParticipants = (
    <>
      {detailImageUrls.length > 0 ? (
        <section className="mt-8">
          <h2 className={cn(PAGE_GUTTER_CLASS, 'text-sm font-bold')}>상세정보</h2>
          <div className="mt-3 w-full bg-white">
            {detailImageUrls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${url}-${index}`}
                src={url}
                alt={`${product.name} 상세 ${index + 1}`}
                className="h-auto w-full object-contain"
              />
            ))}
          </div>
        </section>
      ) : null}

      {isPaymentAction(product.actionType) && participants.length > 0 ? (
        <section className={cn(PAGE_GUTTER_CLASS, 'mt-6')}>
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
      ) : null}
    </>
  );

  return (
    <PageShell active="group-buy" hideNav>
      {isKakaoChannel ? (
        <div className="relative w-full bg-white">
          <Image
            src={imageUrl}
            alt={product.name}
            width={1080}
            height={1920}
            className="h-auto w-full"
            sizes="(max-width: 448px) 100vw, 448px"
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
      ) : (
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
      )}

      <PageGutter className="py-5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Store className="size-4" />
          {product.sellerName}
        </div>
        <h1 className="mt-1.5 text-xl font-bold">{product.name}</h1>
        {product.ticketLabel ? (
          <p className="mt-1 text-xs font-medium text-primary">{product.ticketLabel}</p>
        ) : null}
        <LinkifiedText
          text={product.description}
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
        />
      </PageGutter>

      <GroupBuyWidget product={product}>{detailAndParticipants}</GroupBuyWidget>

      <CommentSection
        targetType="product"
        targetId={product.id}
        initialComments={comments}
        loginReturnUrl={`/product/${product.id}`}
      />
    </PageShell>
  );
}
