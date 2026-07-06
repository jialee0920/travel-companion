import { NextResponse } from 'next/server';
import { findUserByPhone, upsertUser } from '@/lib/airtable/users';
import { DEFAULT_REGION_CODE } from '@/lib/regions';
import { normalizePhone } from '@/lib/user-profile';

function toProfile(user: { id: string; name: string; phone: string; region: string; avatarUrl: string | null }) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    region: user.region,
    avatar_url: user.avatarUrl,
  };
}

/** @deprecated POST /api/auth/login 사용 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, region = DEFAULT_REGION_CODE } = body as {
      name?: string;
      phone?: string;
      region?: string;
    };

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: '이름과 연락처를 입력해주세요.' }, { status: 400 });
    }

    const profile = await upsertUser({
      name: name.trim(),
      phone: normalizePhone(phone),
      region,
    });

    return NextResponse.json({ profile: toProfile(profile) });
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
  const phone = searchParams.get('phone');
  const region = searchParams.get('region') ?? DEFAULT_REGION_CODE;

  try {
    if (phone) {
      const user = await findUserByPhone(phone, region);
      if (!user) return NextResponse.json({ error: '없음' }, { status: 404 });
      return NextResponse.json({ profile: toProfile(user) });
    }

    if (!id) {
      return NextResponse.json({ error: 'id 또는 phone 필요' }, { status: 400 });
    }

    return NextResponse.json({ error: 'id 조회는 아직 지원하지 않습니다. phone을 사용하세요.' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
