import { AppHeader } from '@/components/AppHeader';
import { MypageContent } from '@/components/MypageContent';
import { PageShell } from '@/components/PageShell';

export default function MypagePage() {
  return (
    <PageShell active="profile">
      <AppHeader title="마이페이지" subtitle="내 정보 · 동행 · 공동구매" />
      <MypageContent />
    </PageShell>
  );
}
