import { notFound } from 'next/navigation';
import { Calendar, MapPin, Users } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { CommentSection } from '@/components/CommentSection';
import { GatheringApplyButton } from '@/components/GatheringApplyButton';
import { GatheringAuthorActions } from '@/components/GatheringAuthorActions';
import { GatheringAuthorProfile } from '@/components/GatheringAuthorProfile';
import { GatheringParticipants } from '@/components/GatheringParticipants';
import { LinkifiedText } from '@/components/LinkifiedText';
import { PageShell } from '@/components/PageShell';
import { getSessionUser } from '@/lib/auth/session';
import { getAirtableConfig } from '@/lib/airtable/config';
import { listComments } from '@/lib/db/comments';
import {
  hasUserApplied,
  listGatheringMemberProfiles,
} from '@/lib/db/gathering-participants';
import {
  getGatheringById,
  syncGatheringParticipantCount,
} from '@/lib/db/gatherings';
import { formatGatheringDateLong } from '@/lib/gatherings/datetime';
import { getRegionDisplayName } from '@/lib/regions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GatheringDetailPage({ params }: Props) {
  const { id } = await params;
  const raw = await getGatheringById(id);
  if (!raw) notFound();

  // 예전 Current Count(동행지기 포함)가 남아 있으면 신청자 기준으로 보정
  const gathering =
    (getAirtableConfig()
      ? await syncGatheringParticipantCount(id)
      : null) ?? raw;

  const session = await getSessionUser();
  const isAuthor = !!session && session.id === gathering.author_id;

  const [comments, members, initiallyApplied] = await Promise.all([
    listComments('gathering', id),
    listGatheringMemberProfiles({
      gatheringId: gathering.id,
      authorId: gathering.author_id,
      authorName: gathering.author_name,
      authorAvatarUrl: gathering.author_avatar_url,
    }),
    session
      ? hasUserApplied(gathering.id, session.id)
      : Promise.resolve(false),
  ]);

  const applicantCount = gathering.current_count;
  const dateLabel = formatGatheringDateLong(gathering.gathering_date);
  const isFull =
    gathering.status === 'closed' ||
    gathering.current_count >= gathering.target_count;
  const loginReturnUrl = `/gatherings/${gathering.id}`;

  return (
    <PageShell active="explore" hideNav>
      <AppHeader title="모집글" backHref="/gatherings" />

      <article className="px-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary-muted px-2 py-0.5 text-xs font-bold text-primary">
            {getRegionDisplayName(gathering.region)}
          </span>
          {isFull && (
            <span className="text-xs font-semibold text-muted-foreground">모집 완료</span>
          )}
        </div>
        <h2 className="mt-2 text-xl font-bold">{gathering.title}</h2>
        <div className="mt-2">
          <GatheringAuthorProfile
            authorId={gathering.author_id}
            authorName={gathering.author_name}
            authorAvatarUrl={gathering.author_avatar_url}
          />
        </div>

        <LinkifiedText
          text={gathering.description}
          className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
        />

        <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span>
              참여자 {applicantCount} / {gathering.target_count}명 모집
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            {getRegionDisplayName(gathering.region)}
          </p>
          {dateLabel && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-4" />
              {dateLabel}
            </p>
          )}
        </div>

        {isAuthor ? (
          <GatheringAuthorActions
            gatheringId={gathering.id}
            applicantCount={applicantCount}
          />
        ) : (
          <GatheringApplyButton
            gatheringId={gathering.id}
            authorId={gathering.author_id}
            initialGathering={gathering}
            initiallyApplied={initiallyApplied}
            loginReturnUrl={loginReturnUrl}
          />
        )}
      </article>

      <GatheringParticipants
        gatheringId={gathering.id}
        members={members}
        canManage={isAuthor}
      />

      <CommentSection
        targetType="gathering"
        targetId={gathering.id}
        initialComments={comments}
        loginReturnUrl={loginReturnUrl}
      />
    </PageShell>
  );
}
