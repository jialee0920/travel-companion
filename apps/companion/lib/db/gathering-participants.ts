import { getAirtableConfig } from '@/lib/airtable/config';
import {
  createGatheringParticipant as createAirtableParticipant,
  findAppliedParticipant as findAirtableApplied,
  listAppliedParticipationsByUser as listAirtableParticipationsByUser,
  listGatheringMemberProfiles as listAirtableMemberProfiles,
  type GatheringMemberProfile,
  type GatheringParticipantRecord,
} from '@/lib/airtable/gathering-participants';
import {
  findGatheringsByAuthor,
  getGatheringById,
  updateGatheringCounts,
  type GatheringRecord,
} from '@/lib/db/gatherings';

export type { GatheringMemberProfile, GatheringParticipantRecord };

export type UserGatheringListItem = {
  id: string;
  title: string;
  region: string;
  gathering_date: string | null;
  current_count: number;
  target_count: number;
  role: 'host' | 'participant';
  created_at: string;
};

type MemoryParticipant = GatheringParticipantRecord;

const memoryParticipants = new Map<string, MemoryParticipant>();

function memoryKey(gatheringId: string, userId: string) {
  return `${gatheringId}:${userId}`;
}

export async function hasUserApplied(
  gatheringId: string,
  userId: string,
): Promise<boolean> {
  if (getAirtableConfig()) {
    const found = await findAirtableApplied(gatheringId, userId);
    return found != null;
  }
  const row = memoryParticipants.get(memoryKey(gatheringId, userId));
  return row?.status === 'applied';
}

export async function listGatheringMemberProfiles(input: {
  gatheringId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}): Promise<GatheringMemberProfile[]> {
  if (getAirtableConfig()) {
    return listAirtableMemberProfiles(input);
  }

  const members: GatheringMemberProfile[] = [
    {
      user_id: input.authorId,
      name: input.authorName.trim() || '작성자',
      avatar_url: input.authorAvatarUrl,
      age: null,
      region: null,
      bio: null,
      interest_categories: [],
      is_author: true,
    },
  ];

  for (const row of memoryParticipants.values()) {
    if (row.gathering_id !== input.gatheringId) continue;
    if (row.status !== 'applied') continue;
    if (row.user_id === input.authorId) continue;
    members.push({
      user_id: row.user_id,
      name: '사용자',
      avatar_url: null,
      age: null,
      region: null,
      bio: null,
      interest_categories: [],
      is_author: false,
    });
  }
  return members;
}

export async function listUserGatherings(userId: string): Promise<UserGatheringListItem[]> {
  const authored = await findGatheringsByAuthor(userId);
  const byId = new Map<string, UserGatheringListItem>();

  for (const g of authored) {
    byId.set(g.id, {
      id: g.id,
      title: g.title,
      region: g.region,
      gathering_date: g.gathering_date,
      current_count: g.current_count,
      target_count: g.target_count,
      role: 'host',
      created_at: g.created_at,
    });
  }

  if (getAirtableConfig()) {
    const participations = await listAirtableParticipationsByUser(userId);
    const joined = await Promise.all(
      participations.map((p) => getGatheringById(p.gathering_id)),
    );
    for (const g of joined) {
      if (!g || byId.has(g.id)) continue;
      byId.set(g.id, {
        id: g.id,
        title: g.title,
        region: g.region,
        gathering_date: g.gathering_date,
        current_count: g.current_count,
        target_count: g.target_count,
        role: 'participant',
        created_at: g.created_at,
      });
    }
  } else {
    for (const row of memoryParticipants.values()) {
      if (row.user_id !== userId || row.status !== 'applied') continue;
      if (byId.has(row.gathering_id)) continue;
      const g = await getGatheringById(row.gathering_id);
      if (!g) continue;
      byId.set(g.id, {
        id: g.id,
        title: g.title,
        region: g.region,
        gathering_date: g.gathering_date,
        current_count: g.current_count,
        target_count: g.target_count,
        role: 'participant',
        created_at: g.created_at,
      });
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'host' ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export type ApplyGatheringResult = {
  gathering: GatheringRecord;
  alreadyApplied: boolean;
};

export class ApplyGatheringError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApplyGatheringError';
    this.status = status;
  }
}

export async function applyToGathering(input: {
  gatheringId: string;
  userId: string;
}): Promise<ApplyGatheringResult> {
  const gathering = await getGatheringById(input.gatheringId);

  if (!gathering) {
    throw new ApplyGatheringError('모집글을 찾을 수 없습니다.', 404);
  }
  if (gathering.author_id === input.userId) {
    throw new ApplyGatheringError('본인이 작성한 모집글에는 신청할 수 없습니다.', 400);
  }

  const isFull =
    gathering.status === 'closed' ||
    gathering.current_count >= gathering.target_count;
  if (isFull) {
    throw new ApplyGatheringError('모집이 완료되었습니다.', 409);
  }

  if (await hasUserApplied(input.gatheringId, input.userId)) {
    return { gathering, alreadyApplied: true };
  }

  if (getAirtableConfig()) {
    await createAirtableParticipant({
      gatheringId: input.gatheringId,
      userId: input.userId,
      authorId: gathering.author_id,
    });
  } else {
    const row: MemoryParticipant = {
      id: crypto.randomUUID(),
      gathering_id: input.gatheringId,
      user_id: input.userId,
      author_id: gathering.author_id,
      status: 'applied',
      chat_room_id: null,
      applied_at: new Date().toISOString(),
    };
    memoryParticipants.set(memoryKey(input.gatheringId, input.userId), row);
  }

  const nextCount = gathering.current_count + 1;
  const nextStatus =
    nextCount >= gathering.target_count ? 'closed' : gathering.status;
  const updated = await updateGatheringCounts(input.gatheringId, {
    currentCount: nextCount,
    status: nextStatus,
  });

  return { gathering: updated, alreadyApplied: false };
}
