'use client';

import { useState } from 'react';
import { AuthorChatAvatar } from '@/components/AuthorChatAvatar';
import { PeerProfileSheet } from '@/components/PeerProfileSheet';

type Props = {
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
};

/** 모집글 동행지기 — 클릭 시 채팅이 아니라 프로필 시트 */
export function GatheringAuthorProfile({
  authorId,
  authorName,
  authorAvatarUrl,
}: Props) {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  return (
    <>
      <AuthorChatAvatar
        authorId={authorId}
        authorName={authorName}
        authorAvatarUrl={authorAvatarUrl}
        size="md"
        showName
        nameClassName="text-sm text-muted-foreground"
        onAuthorClick={setProfileUserId}
      />
      <PeerProfileSheet
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </>
  );
}
