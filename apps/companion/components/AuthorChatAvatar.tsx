'use client';

import { Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useStartChat } from '@/hooks/useStartChat';
import { cn } from '@/lib/utils';

type Props = {
  authorId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  companionSeedId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** 이름도 함께 표시 */
  showName?: boolean;
  nameClassName?: string;
  /**
   * 제공 시 채팅 대신 이 콜백 호출 (프로필 시트 등).
   * 미제공 시 기존처럼 1:1 채팅을 시작합니다.
   */
  onAuthorClick?: (authorId: string) => void;
};

/** 작성자 아바타 — 기본은 채팅, onAuthorClick 있으면 프로필 등 커스텀 동작 */
export function AuthorChatAvatar({
  authorId,
  authorName,
  authorAvatarUrl,
  companionSeedId,
  size = 'sm',
  className,
  showName = false,
  nameClassName,
  onAuthorClick,
}: Props) {
  const { startChat, startingId, profileId } = useStartChat();
  const trimmedId = authorId?.trim() || '';
  const openProfile = !!onAuthorClick && !!trimmedId;
  const canChat =
    !onAuthorClick &&
    ((!!trimmedId && trimmedId !== profileId) || !!companionSeedId?.trim());
  const clickable = openProfile || canChat;
  const busy =
    startingId != null &&
    (startingId === trimmedId || startingId === companionSeedId);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!clickable || busy) return;

    if (onAuthorClick && trimmedId) {
      onAuthorClick(trimmedId);
      return;
    }

    await startChat({
      peerProfileId: trimmedId || undefined,
      companionSeedId: companionSeedId ?? undefined,
    });
  }

  const avatar = (
    <span className="relative inline-flex">
      <UserAvatar name={authorName} avatarUrl={authorAvatarUrl} size={size} />
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
          <Loader2 className="size-3.5 animate-spin text-primary" />
        </span>
      )}
    </span>
  );

  if (!clickable) {
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
        {avatar}
        {showName && (
          <span className={cn('truncate text-xs font-medium', nameClassName)}>
            {authorName}
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={
        openProfile ? `${authorName} 프로필 보기` : `${authorName}님과 채팅하기`
      }
      className={cn(
        'inline-flex min-w-0 items-center gap-2 rounded-full text-left transition-opacity hover:opacity-80 disabled:opacity-70',
        className,
      )}
    >
      {avatar}
      {showName && (
        <span className={cn('truncate text-xs font-medium', nameClassName)}>
          {authorName}
        </span>
      )}
    </button>
  );
}
