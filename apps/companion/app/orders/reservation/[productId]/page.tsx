import { notFound, redirect } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { MyReservationDetail } from '@/components/MyReservationDetail';
import { PageShell } from '@/components/PageShell';
import { getSessionUser } from '@/lib/auth/session';
import { getProductById } from '@/lib/db/products';

type Props = {
  params: Promise<{ productId: string }>;
};

export default async function MyReservationDetailPage({ params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    redirect('/login?returnUrl=%2Forders');
  }

  const { productId } = await params;
  const product = await getProductById(productId);
  if (!product || product.actionType !== 'reservation') {
    notFound();
  }

  return (
    <PageShell active="profile" hideNav>
      <AppHeader
        title="예약 상세"
        subtitle="내 공동구매"
        backHref="/orders"
      />
      <MyReservationDetail product={product} />
    </PageShell>
  );
}
