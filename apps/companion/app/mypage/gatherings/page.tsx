import { AppHeader } from '@/components/AppHeader';
import { MyGatheringsList } from '@/components/MyGatheringsList';
import { PageShell } from '@/components/PageShell';

export default function MyGatheringsPage() {
  return (
    <PageShell active="profile" hideNav>
      <AppHeader
        title="내 동행"
        subtitle="신청·주최한 모집글"
        backHref="/mypage"
      />
      <MyGatheringsList />
    </PageShell>
  );
}
