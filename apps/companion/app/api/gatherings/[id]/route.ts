import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import {
  countAppliedApplicants,
  deleteGatheringWithParticipants,
  getGatheringById,
  updateGathering,
  type GatheringStatus,
} from '@/lib/db/gatherings';
import { isKnownRegionCode } from '@/lib/regions';
import { NATIONAL_REGION_CODE } from '@/lib/regions/product-tabs';

type Props = {
  params: Promise<{ id: string }>;
};

function isValidGatheringRegion(region: string): boolean {
  return region === NATIONAL_REGION_CODE || isKnownRegionCode(region);
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const gathering = await getGatheringById(id);
    if (!gathering) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ gathering });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '모집글 조회 실패' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getGatheringById(id);
    if (!existing) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (existing.author_id !== session.id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, region, target_count, gathering_date, status } = body as {
      title?: string;
      description?: string;
      region?: string;
      target_count?: number;
      gathering_date?: string | null;
      status?: string;
    };

    const trimmedTitle = title?.trim() ?? '';
    const trimmedDescription = description?.trim() ?? '';
    const trimmedRegion = region?.trim() ?? '';
    const nextStatus: GatheringStatus = status === 'closed' ? 'closed' : 'open';

    if (!trimmedTitle) {
      return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
    }
    if (!trimmedDescription) {
      return NextResponse.json({ error: '설명을 입력해주세요.' }, { status: 400 });
    }
    if (!trimmedRegion || !isValidGatheringRegion(trimmedRegion)) {
      return NextResponse.json({ error: '올바른 지역을 선택해주세요.' }, { status: 400 });
    }
    if (
      target_count === undefined ||
      !Number.isInteger(target_count) ||
      target_count < 2 ||
      target_count > 50
    ) {
      return NextResponse.json({ error: '모집 인원은 2~50명으로 입력해주세요.' }, { status: 400 });
    }
    if (target_count < existing.current_count) {
      return NextResponse.json(
        {
          error: `모집 인원은 현재 인원(${existing.current_count}명)보다 작을 수 없습니다.`,
        },
        { status: 400 },
      );
    }

    const gathering = await updateGathering(id, {
      title: trimmedTitle,
      description: trimmedDescription,
      region: trimmedRegion,
      targetCount: target_count,
      gatheringDate: gathering_date?.trim() || null,
      status: nextStatus,
    });

    return NextResponse.json({ gathering });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '모집글 수정 실패' },
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
    const existing = await getGatheringById(id);
    if (!existing) {
      return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (existing.author_id !== session.id) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    await deleteGatheringWithParticipants(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '모집글 삭제 실패' },
      { status: 500 },
    );
  }
}
