import { NextResponse } from 'next/server';
import { getUserById, userDisplayName } from '@/lib/airtable/users';

type Props = {
  params: Promise<{ id: string }>;
};

/** 공개 프로필 (채팅·시트용) — 실명·전화번호 제외 */
export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const userId = id?.trim();
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: userDisplayName(user),
        avatar_url: user.avatarUrl,
        age: user.age,
        region: user.region?.trim() || null,
        bio: user.bio,
        interest_categories: user.interestCategories,
        companion_seed_id: user.companionSeedId,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 조회 실패' },
      { status: 500 },
    );
  }
}
