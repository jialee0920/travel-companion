import { AppHeader } from '@/components/AppHeader';
import { GatheringForm } from '@/components/GatheringForm';
import { PageShell } from '@/components/PageShell';

export default function GatheringNewPage() {
  return (
    <PageShell active="explore" hideNav>
      <AppHeader
        title="모집글 작성"
        subtitle="동행할 사람을 모집해 보세요"
        backHref="/gatherings"
      />
      <GatheringForm mode="create" />
    </PageShell>
  );
}
