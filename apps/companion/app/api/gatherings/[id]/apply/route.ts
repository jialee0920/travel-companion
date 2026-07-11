import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import {
  ApplyGatheringError,
  applyToGathering,
  cancelGatheringApplication,
} from '@/lib/db/gathering-participants';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await applyToGathering({
      gatheringId: id,
      userId: session.id,
    });

    return NextResponse.json({
      gathering: result.gathering,
      alreadyApplied: result.alreadyApplied,
      message: result.alreadyApplied ? '이미 신청한 모집글입니다.' : '신청 완료!',
    });
  } catch (error) {
    console.error(error);
    if (error instanceof ApplyGatheringError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '동행 신청 실패' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await cancelGatheringApplication({
      gatheringId: id,
      userId: session.id,
    });

    return NextResponse.json({
      gathering: result.gathering,
      message: '참여를 취소했습니다.',
    });
  } catch (error) {
    console.error(error);
    if (error instanceof ApplyGatheringError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '참여 취소 실패' },
      { status: 500 },
    );
  }
}
