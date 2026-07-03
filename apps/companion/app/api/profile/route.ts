import { NextResponse } from 'next/server';
import { upsertProfile, getProfileById } from '@/lib/db/profiles';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, region = 'mukho' } = body as {
      name?: string;
      phone?: string;
      region?: string;
    };

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: '이름과 연락처를 입력해주세요.' }, { status: 400 });
    }

    const profile = await upsertProfile({
      name: name.trim(),
      phone: phone.trim(),
      region,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 저장 실패' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id 필요' }, { status: 400 });
  }

  try {
    const profile = await getProfileById(id);
    if (!profile) return NextResponse.json({ error: '없음' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
