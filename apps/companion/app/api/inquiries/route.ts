import { NextResponse } from 'next/server';
import { saveInquiry } from '@/lib/db/inquiries';
import { resolveRegionForStorage } from '@/lib/region-filter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, message, region } = body as {
      name?: string;
      phone?: string;
      message?: string;
      region?: string;
    };

    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      return NextResponse.json({ error: '이름, 연락처, 문의 내용을 입력해주세요.' }, { status: 400 });
    }

    const inquiry = await saveInquiry({
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      region: resolveRegionForStorage(region),
    });

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (error) {
    console.error('[inquiries] Airtable 저장 실패:', error);
    return NextResponse.json({ error: '문의 저장에 실패했습니다.' }, { status: 500 });
  }
}
