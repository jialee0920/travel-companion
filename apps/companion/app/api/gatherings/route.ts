import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createGathering, listGatherings } from '@/lib/db/gatherings';
import { isKnownRegionCode } from '@/lib/regions';
import { NATIONAL_REGION_CODE } from '@/lib/regions/product-tabs';

function isValidGatheringRegion(region: string): boolean {
  return region === NATIONAL_REGION_CODE || isKnownRegionCode(region);
}

export async function GET() {
  try {
    const gatherings = await listGatherings();
    return NextResponse.json({ gatherings });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '모집글 조회 실패' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, region, target_count, gathering_date } = body as {
      title?: string;
      description?: string;
      region?: string;
      target_count?: number;
      gathering_date?: string | null;
    };

    const trimmedTitle = title?.trim() ?? '';
    const trimmedDescription = description?.trim() ?? '';
    const trimmedRegion = region?.trim() ?? '';

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

    const gathering = await createGathering({
      title: trimmedTitle,
      description: trimmedDescription,
      region: trimmedRegion,
      authorId: session.id,
      authorName: session.nickname,
      targetCount: target_count,
      gatheringDate: gathering_date?.trim() || null,
    });

    return NextResponse.json({ gathering }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '모집글 작성 실패' },
      { status: 500 },
    );
  }
}
