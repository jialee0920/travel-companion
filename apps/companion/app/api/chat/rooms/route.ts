import { NextResponse } from 'next/server';
import { getOrCreateChatRoom, listChatRooms } from '@/lib/db/chat';
import { getSessionUser } from '@/lib/auth/session';
import { resolveRegionForStorage } from '@/lib/region-filter';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  if (!profileId) {
    return NextResponse.json({ error: 'profileId 필요' }, { status: 400 });
  }

  try {
    const rooms = await listChatRooms(profileId);
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '채팅방 목록 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { myProfileId, peerProfileId, companionSeedId, region } = body as {
      myProfileId?: string;
      peerProfileId?: string;
      companionSeedId?: string;
      region?: string;
    };

    if (!myProfileId) {
      return NextResponse.json({ error: 'myProfileId 필요' }, { status: 400 });
    }

    const session = await getSessionUser();
    const resolvedRegion = resolveRegionForStorage(region ?? session?.region);

    const room = await getOrCreateChatRoom({
      myProfileId,
      peerProfileId,
      companionSeedId,
      region: resolvedRegion,
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '채팅방 생성 실패' },
      { status: 500 },
    );
  }
}
