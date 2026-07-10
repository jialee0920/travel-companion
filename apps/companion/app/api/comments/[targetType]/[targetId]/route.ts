import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createComment, listComments, type CommentTargetType } from '@/lib/db/comments';
import { getGatheringById } from '@/lib/db/gatherings';
import { getProductById } from '@/lib/db/products';

type Props = {
  params: Promise<{ targetType: string; targetId: string }>;
};

function parseTargetType(value: string): CommentTargetType | null {
  if (value === 'gathering' || value === 'product') return value;
  return null;
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const { targetType: rawType, targetId } = await params;
    const targetType = parseTargetType(rawType);
    if (!targetType || !targetId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const comments = await listComments(targetType, decodeURIComponent(targetId));
    return NextResponse.json({ comments });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 조회 실패' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { targetType: rawType, targetId: rawTargetId } = await params;
    const targetType = parseTargetType(rawType);
    const targetId = decodeURIComponent(rawTargetId);
    if (!targetType || !targetId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (targetType === 'gathering') {
      const gathering = await getGatheringById(targetId);
      if (!gathering) {
        return NextResponse.json({ error: '모집글을 찾을 수 없습니다.' }, { status: 404 });
      }
    } else {
      const product = await getProductById(targetId);
      if (!product) {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    const body = await request.json();
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text) {
      return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: '댓글은 1000자 이내로 작성해주세요.' }, { status: 400 });
    }

    const comment = await createComment({
      targetType,
      targetId,
      authorId: session.id,
      authorName: session.nickname,
      body: text,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 작성 실패' },
      { status: 500 },
    );
  }
}
