import { NextResponse } from 'next/server';
import { seedProductsIfEmpty } from '@/lib/db/products';

/** Products 테이블 시드 (묵호 공동구매 3건) — 비어 있을 때만 삽입 */
export async function POST() {
  try {
    const created = await seedProductsIfEmpty();
    return NextResponse.json({
      success: true,
      created,
      message:
        created > 0
          ? `시드 ${created}건을 Products 테이블에 추가했습니다.`
          : '이미 상품 데이터가 있어 시드를 건너뛰었습니다.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '시드 실패' },
      { status: 500 },
    );
  }
}
