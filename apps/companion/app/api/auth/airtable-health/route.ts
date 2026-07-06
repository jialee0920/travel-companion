import { NextResponse } from 'next/server';
import { listRecords } from '@/lib/airtable/client';
import { getAirtableConfig } from '@/lib/airtable/config';

type CheckResult = {
  ok: boolean;
  baseId?: string;
  table?: string;
  error?: string;
};

async function checkTable(table: string): Promise<CheckResult> {
  const config = getAirtableConfig();
  if (!config) {
    return { ok: false, error: 'AIRTABLE_PERSONAL_ACCESS_TOKEN 또는 AIRTABLE_BASE_ID가 없습니다.' };
  }

  try {
    await listRecords(table, { maxRecords: 1 });
    return { ok: true, baseId: config.baseId, table };
  } catch (error) {
    return {
      ok: false,
      baseId: config.baseId,
      table,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/** Airtable 연결 진단 — 테이블별 접근 테스트 */
export async function GET() {
  const config = getAirtableConfig();
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Airtable 환경 변수가 설정되지 않았습니다.',
        required: ['AIRTABLE_PERSONAL_ACCESS_TOKEN', 'AIRTABLE_BASE_ID'],
      },
      { status: 500 },
    );
  }

  const [users, otp, products, orders, participants] = await Promise.all([
    checkTable(config.usersTable),
    checkTable(config.otpTable),
    checkTable(config.productsTable),
    checkTable(config.ordersTable),
    checkTable(config.participantsTable),
  ]);

  const commerceOk = products.ok && orders.ok && participants.ok;

  return NextResponse.json({
    ok: users.ok && commerceOk,
    config: {
      baseId: config.baseId,
      usersTable: config.usersTable,
      otpTable: config.otpTable,
      productsTable: config.productsTable,
      ordersTable: config.ordersTable,
      participantsTable: config.participantsTable,
    },
    checks: {
      users,
      otp,
      products,
      orders,
      participants,
    },
    note: '공동구매(2단계)는 products, orders, participants 테이블이 필요합니다.',
  });
}
