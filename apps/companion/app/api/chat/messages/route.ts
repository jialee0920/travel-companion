import { NextResponse } from 'next/server';
import { isRoomMember, listMessages, sendMessage } from '@/lib/db/chat';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const profileId = searchParams.get('profileId');

  if (!roomId || !profileId) {
    return NextResponse.json({ error: 'roomId, profileId 필요' }, { status: 400 });
  }

  try {
    const allowed = await isRoomMember(roomId, profileId);
    if (!allowed) {
      return NextResponse.json({ error: '접근 권한 없음' }, { status: 403 });
    }

    const messages = await listMessages(roomId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '메시지 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, senderId, body: text } = body as {
      roomId?: string;
      senderId?: string;
      body?: string;
    };

    if (!roomId || !senderId || !text?.trim()) {
      return NextResponse.json({ error: 'roomId, senderId, body 필요' }, { status: 400 });
    }

    const allowed = await isRoomMember(roomId, senderId);
    if (!allowed) {
      return NextResponse.json({ error: '접근 권한 없음' }, { status: 403 });
    }

    const message = await sendMessage({ roomId, senderId, body: text });
    return NextResponse.json({ message });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '전송 실패' },
      { status: 500 },
    );
  }
}
