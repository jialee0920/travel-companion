import { UserAvatar } from '@/components/UserAvatar';
import type { GatheringMemberProfile } from '@/lib/db/gathering-participants';

type Props = {
  members: GatheringMemberProfile[];
};

export function GatheringParticipants({ members }: Props) {
  return (
    <section className="mt-6 px-5">
      <h3 className="text-sm font-semibold text-foreground">
        참여 중인 동행
        <span className="ml-1.5 font-medium text-muted-foreground">
          {members.length}명
        </span>
      </h3>

      <ul className="mt-3 flex flex-col gap-2.5">
        {members.map((member) => (
          <li
            key={member.user_id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5"
          >
            <UserAvatar
              name={member.name}
              avatarUrl={member.avatar_url}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {member.name}
              </p>
            </div>
            {member.is_author && (
              <span className="shrink-0 rounded-full bg-primary-muted px-2 py-0.5 text-micro font-semibold text-primary">
                작성자
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
