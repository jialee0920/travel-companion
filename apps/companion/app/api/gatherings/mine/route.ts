import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { listUserGatherings } from '@/lib/db/gathering-participants';

/** 내가 주최·신청한 동행 모집글 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const gatherings = await listUserGatherings(session.id);
    return NextResponse.json({ gatherings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '동행 목록 조회 실패' },
      { status: 500 },
    );
  }
}
