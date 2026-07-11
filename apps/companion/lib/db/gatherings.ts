import { getAirtableConfig } from '@/lib/airtable/config';
import {
  createGathering as createAirtableGathering,
  deleteGathering as deleteAirtableGathering,
  findGatheringsByAuthor as findAirtableGatheringsByAuthor,
  getGatheringById as getAirtableGatheringById,
  listGatherings as listAirtableGatherings,
  updateGathering as updateAirtableGathering,
  updateGatheringCounts as updateAirtableGatheringCounts,
  type GatheringRecord,
  type GatheringStatus,
} from '@/lib/airtable/gatherings';
import {
  deleteParticipantsByGathering as deleteAirtableParticipantsByGathering,
  listAppliedParticipants as listAirtableAppliedParticipants,
} from '@/lib/airtable/gathering-participants';

export type { GatheringRecord, GatheringStatus };

const memoryGatherings = new Map<string, GatheringRecord>();

export async function listGatherings(): Promise<GatheringRecord[]> {
  if (getAirtableConfig()) {
    return listAirtableGatherings();
  }
  return [...memoryGatherings.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function getGatheringById(id: string): Promise<GatheringRecord | null> {
  if (getAirtableConfig()) {
    return getAirtableGatheringById(id);
  }
  return memoryGatherings.get(id) ?? null;
}

export async function findGatheringsByAuthor(authorId: string): Promise<GatheringRecord[]> {
  if (getAirtableConfig()) {
    return findAirtableGatheringsByAuthor(authorId);
  }
  return [...memoryGatherings.values()]
    .filter((g) => g.author_id === authorId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createGathering(input: {
  title: string;
  description: string;
  region: string;
  authorId: string;
  authorName: string;
  targetCount: number;
  gatheringDate?: string | null;
}): Promise<GatheringRecord> {
  if (getAirtableConfig()) {
    return createAirtableGathering(input);
  }

  const row: GatheringRecord = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    region: input.region.trim(),
    author_id: input.authorId,
    author_name: input.authorName.trim(),
    author_avatar_url: null,
    target_count: input.targetCount,
    current_count: 1,
    gathering_date: input.gatheringDate?.trim() || null,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  memoryGatherings.set(row.id, row);
  return row;
}

export async function updateGatheringCounts(
  gatheringId: string,
  input: { currentCount: number; status?: GatheringStatus },
): Promise<GatheringRecord> {
  if (getAirtableConfig()) {
    return updateAirtableGatheringCounts(gatheringId, input);
  }

  const existing = memoryGatherings.get(gatheringId);
  if (!existing) {
    throw new Error('모집글을 찾을 수 없습니다.');
  }
  const updated: GatheringRecord = {
    ...existing,
    current_count: input.currentCount,
    status: input.status ?? existing.status,
  };
  memoryGatherings.set(gatheringId, updated);
  return updated;
}

export async function updateGathering(
  gatheringId: string,
  input: {
    title: string;
    description: string;
    region: string;
    targetCount: number;
    gatheringDate?: string | null;
    status: GatheringStatus;
  },
): Promise<GatheringRecord> {
  if (getAirtableConfig()) {
    return updateAirtableGathering(gatheringId, input);
  }

  const existing = memoryGatherings.get(gatheringId);
  if (!existing) {
    throw new Error('모집글을 찾을 수 없습니다.');
  }
  const updated: GatheringRecord = {
    ...existing,
    title: input.title.trim(),
    description: input.description.trim(),
    region: input.region.trim(),
    target_count: input.targetCount,
    gathering_date: input.gatheringDate?.trim() || null,
    status: input.status,
  };
  memoryGatherings.set(gatheringId, updated);
  return updated;
}

export async function countAppliedApplicants(gatheringId: string): Promise<number> {
  if (getAirtableConfig()) {
    const rows = await listAirtableAppliedParticipants(gatheringId);
    return rows.length;
  }
  return 0;
}

export async function deleteGatheringWithParticipants(gatheringId: string): Promise<void> {
  if (getAirtableConfig()) {
    await deleteAirtableParticipantsByGathering(gatheringId);
    await deleteAirtableGathering(gatheringId);
    return;
  }
  memoryGatherings.delete(gatheringId);
}
