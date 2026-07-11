import { NextResponse } from 'next/server';
import { listUserGatherings } from '@/lib/db/gathering-participants';

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const userId = id?.trim();
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const gatherings = await listUserGatherings(userId);
    return NextResponse.json({ gatherings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '참여 동행 조회 실패' },
      { status: 500 },
    );
  }
}
