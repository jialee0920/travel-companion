import { getUserById, maskDisplayName, upsertUser, userDisplayName } from '@/lib/airtable/users';
import { generateOrderCode } from '@/lib/geo';
import {
  assertGroupBuyQuantityAvailable,
  parseOrderQuantity,
} from '@/lib/group-buy/quantity';
import { getProductById } from '@/lib/db/products';
import {
  addParticipant,
  getOrderByMerchantUid,
  saveOrder,
  syncProductCount,
  updateOrderPayment,
} from '@/lib/db/orders';

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
  const pendingOrder = await getOrderByMerchantUid(input.merchantUid);
  const quantity = parseOrderQuantity(pendingOrder?.quantity);

  const product = await getProductById(input.productId);
  if (product) {
    assertGroupBuyQuantityAvailable(product, quantity);
  }

  const user = await upsertUser({
    name: input.name,
    phone: input.phone,
    region: input.region,
  });

  // 공개 참여자 표시는 Nickname 기준 (profileId 우선)
  const profileUser =
    (input.profileId ? await getUserById(input.profileId) : null) ?? user;
  const displayName = maskDisplayName(userDisplayName(profileUser));

  const order = await updateOrderPayment(input.merchantUid, {
    payment_status: 'paid',
    imp_uid: input.pgTransactionId,
    profile_id: input.profileId ?? user.id,
  });

  if (order) {
    await addParticipant({
      product_id: input.productId,
      profile_id: input.profileId ?? user.id,
      display_name: displayName,
      order_code: order.order_code,
    });
    await syncProductCount(input.productId);
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
    quantity,
    payment_status: 'paid',
    imp_uid: input.pgTransactionId,
    merchant_uid: input.merchantUid,
  });
  await addParticipant({
    product_id: input.productId,
    profile_id: input.profileId ?? user.id,
    display_name: displayName,
    order_code: orderCode,
  });
  await syncProductCount(input.productId);
}
