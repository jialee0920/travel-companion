import { upsertUser } from '@/lib/airtable/users';
import { generateOrderCode } from '@/lib/geo';
import { addParticipant, incrementProductCount, saveOrder, updateOrderPayment } from '@/lib/db/orders';

export type CompleteOrderInput = {
  merchantUid: string;
  pgTransactionId: string;
  amount: number;
  name: string;
  phone: string;
  productId: string;
  productName: string;
  region: string;
  profileId?: string;
};

/** PG 승인 후 Orders·Participants 저장 (기존 PortOne confirm POST와 동일) */
export async function completeOrderAfterPayment(input: CompleteOrderInput): Promise<void> {
  const user = await upsertUser({
    name: input.name,
    phone: input.phone,
    region: input.region,
  });

  const order = await updateOrderPayment(input.merchantUid, {
    payment_status: 'paid',
    imp_uid: input.pgTransactionId,
    profile_id: user.id,
  });

  if (order) {
    await addParticipant({
      product_id: input.productId,
      profile_id: user.id,
      display_name: input.name.slice(0, 1) + '**',
      order_code: order.order_code,
    });
    await incrementProductCount(input.productId);
    return;
  }

  const orderCode = generateOrderCode();
  await saveOrder({
    order_code: orderCode,
    profile_id: input.profileId ?? user.id,
    product_id: input.productId,
    product_name: input.productName,
    participant_name: input.name,
    participant_phone: input.phone,
    region: input.region,
    amount: input.amount,
    payment_status: 'paid',
    imp_uid: input.pgTransactionId,
    merchant_uid: input.merchantUid,
  });
  await addParticipant({
    product_id: input.productId,
    profile_id: user.id,
    display_name: input.name.slice(0, 1) + '**',
    order_code: orderCode,
  });
  await incrementProductCount(input.productId);
}
