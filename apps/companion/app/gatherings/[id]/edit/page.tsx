import { notFound, redirect } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { GatheringForm } from '@/components/GatheringForm';
import { PageShell } from '@/components/PageShell';
import { getSessionUser } from '@/lib/auth/session';
import { countAppliedApplicants, getGatheringById } from '@/lib/db/gatherings';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GatheringEditPage({ params }: Props) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) {
    redirect(`/login?returnUrl=${encodeURIComponent(`/gatherings/${id}/edit`)}`);
  }

  const gathering = await getGatheringById(id);
  if (!gathering) notFound();
  if (gathering.author_id !== session.id) {
    redirect(`/gatherings/${id}`);
  }

  const applicantCount = await countAppliedApplicants(gathering.id);

  return (
    <PageShell active="explore" hideNav>
      <AppHeader
        title="모집글 수정"
        subtitle="내용을 수정하거나 삭제할 수 있어요"
        backHref={`/gatherings/${gathering.id}`}
      />
      <GatheringForm
        mode="edit"
        gathering={gathering}
        applicantCount={applicantCount}
      />
    </PageShell>
  );
}
