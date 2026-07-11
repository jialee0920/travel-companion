import { getAirtableConfig } from '@/lib/airtable/config';
import {
  createGathering as createAirtableGathering,
  getGatheringById as getAirtableGatheringById,
  listGatherings as listAirtableGatherings,
  updateGatheringCounts as updateAirtableGatheringCounts,
  type GatheringRecord,
  type GatheringStatus,
} from '@/lib/airtable/gatherings';

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
