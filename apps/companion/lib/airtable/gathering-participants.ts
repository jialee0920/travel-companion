import {
  createRecord,
  deleteRecord,
  escapeAirtableFormula,
  listRecords,
  updateRecord,
} from './client';
import { requireAirtableConfig } from './config';
import { getUserById, userDisplayName } from './users';

export type GatheringParticipantStatus = 'applied' | 'cancelled';

export type AirtableGatheringParticipantFields = {
  'Gathering ID'?: string;
  'User ID'?: string;
  'Gathering Link'?: string[];
  'User Link'?: string[];
  'Author ID'?: string;
  Status?: GatheringParticipantStatus;
  'Chat Room ID'?: string;
  'Applied At'?: string;
};

export type GatheringParticipantRecord = {
  id: string;
  gathering_id: string;
  user_id: string;
  author_id: string;
  status: GatheringParticipantStatus;
  chat_room_id: string | null;
  applied_at: string;
};

export type GatheringMemberProfile = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  regions: string[];
  bio: string | null;
  interest_categories: string[];
  is_author: boolean;
};

function mapParticipant(record: {
  id: string;
  createdTime?: string;
  fields: AirtableGatheringParticipantFields;
}): GatheringParticipantRecord {
  const status =
    record.fields.Status === 'cancelled' ? 'cancelled' : 'applied';
  return {
    id: record.id,
    gathering_id: record.fields['Gathering ID']?.trim() || '',
    user_id: record.fields['User ID']?.trim() || '',
    author_id: record.fields['Author ID']?.trim() || '',
    status,
    chat_room_id: record.fields['Chat Room ID']?.trim() || null,
    applied_at:
      record.fields['Applied At']?.trim() ||
      record.createdTime ||
      new Date().toISOString(),
  };
}

/** Airtable Link 필드 — 순수 record ID 문자열 배열만 (빈 값이면 undefined) */
function buildAirtableLinkField(recordId: string | undefined | null): string[] | undefined {
  const trimmed = recordId?.trim();
  if (!trimmed) return undefined;
  return [trimmed];
}

function buildGatheringParticipantCreateFields(input: {
  gatheringId: string;
  userId: string;
  authorId: string;
  appliedAt: string;
}): AirtableGatheringParticipantFields {
  const fields: AirtableGatheringParticipantFields = {
    'Gathering ID': input.gatheringId,
    'User ID': input.userId,
    'Author ID': input.authorId,
    Status: 'applied',
    'Applied At': input.appliedAt,
  };

  const gatheringLink = buildAirtableLinkField(input.gatheringId);
  const userLink = buildAirtableLinkField(input.userId);
  if (gatheringLink) fields['Gathering Link'] = gatheringLink;
  if (userLink) fields['User Link'] = userLink;

  return fields;
}

export async function findAppliedParticipant(
  gatheringId: string,
  userId: string,
): Promise<GatheringParticipantRecord | null> {
  const config = requireAirtableConfig();
  const formula = `AND({Gathering ID}="${escapeAirtableFormula(gatheringId)}",{User ID}="${escapeAirtableFormula(userId)}",{Status}="applied")`;
  const records = await listRecords<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    { filterByFormula: formula, maxRecords: 1 },
  );
  if (records.length === 0) return null;
  return mapParticipant(records[0]);
}

export async function listAppliedParticipants(
  gatheringId: string,
): Promise<GatheringParticipantRecord[]> {
  const config = requireAirtableConfig();
  const formula = `AND({Gathering ID}="${escapeAirtableFormula(gatheringId)}",{Status}="applied")`;
  const records = await listRecords<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    { filterByFormula: formula },
  );
  return records
    .map(mapParticipant)
    .sort(
      (a, b) =>
        new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime(),
    );
}

export async function listAppliedParticipationsByUser(
  userId: string,
): Promise<GatheringParticipantRecord[]> {
  const config = requireAirtableConfig();
  const formula = `AND({User ID}="${escapeAirtableFormula(userId)}",{Status}="applied")`;
  const records = await listRecords<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    { filterByFormula: formula },
  );
  return records
    .map(mapParticipant)
    .sort(
      (a, b) =>
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
    );
}

export async function listParticipantsByGathering(
  gatheringId: string,
): Promise<GatheringParticipantRecord[]> {
  const config = requireAirtableConfig();
  const formula = `{Gathering ID}="${escapeAirtableFormula(gatheringId)}"`;
  const records = await listRecords<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    { filterByFormula: formula },
  );
  return records.map(mapParticipant);
}

export async function deleteParticipantsByGathering(gatheringId: string): Promise<number> {
  const rows = await listParticipantsByGathering(gatheringId);
  const config = requireAirtableConfig();
  await Promise.all(rows.map((row) => deleteRecord(config.gatheringParticipantsTable, row.id)));
  return rows.length;
}

export async function createGatheringParticipant(input: {
  gatheringId: string;
  userId: string;
  authorId: string;
}): Promise<GatheringParticipantRecord> {
  const config = requireAirtableConfig();
  const appliedAt = new Date().toISOString();
  const fields = buildGatheringParticipantCreateFields({
    gatheringId: input.gatheringId,
    userId: input.userId,
    authorId: input.authorId,
    appliedAt,
  });
  const created = await createRecord<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    fields,
    { typecast: true },
  );
  return mapParticipant(created);
}

/** applied → cancelled (레코드 유지, 참여 목록·카운트에서 제외) */
export async function cancelGatheringParticipant(
  participantId: string,
): Promise<GatheringParticipantRecord> {
  const config = requireAirtableConfig();
  const updated = await updateRecord<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    participantId,
    { Status: 'cancelled' },
    { typecast: true },
  );
  return mapParticipant(updated);
}

/** 동행지기(맨 앞) + applied 참여자 프로필 */
export async function listGatheringMemberProfiles(input: {
  gatheringId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
}): Promise<GatheringMemberProfile[]> {
  const participants = await listAppliedParticipants(input.gatheringId);
  const applicantIds = participants
    .map((p) => p.user_id)
    .filter((id) => id && id !== input.authorId);

  const [authorUser, ...applicantUsers] = await Promise.all([
    input.authorId ? getUserById(input.authorId) : Promise.resolve(null),
    ...applicantIds.map((id) => getUserById(id)),
  ]);

  const members: GatheringMemberProfile[] = [
    {
      user_id: input.authorId,
      name: authorUser
        ? userDisplayName(authorUser)
        : input.authorName.trim() || '동행지기',
      avatar_url: authorUser?.avatarUrl ?? input.authorAvatarUrl,
      age: authorUser?.age ?? null,
      regions: authorUser?.regions ?? [],
      bio: authorUser?.bio ?? null,
      interest_categories: authorUser?.interestCategories ?? [],
      is_author: true,
    },
  ];

  for (let i = 0; i < applicantIds.length; i += 1) {
    const userId = applicantIds[i];
    const user = applicantUsers[i];
    members.push({
      user_id: userId,
      name: user ? userDisplayName(user) : '사용자',
      avatar_url: user?.avatarUrl ?? null,
      age: user?.age ?? null,
      regions: user?.regions ?? [],
      bio: user?.bio ?? null,
      interest_categories: user?.interestCategories ?? [],
      is_author: false,
    });
  }

  return members;
}
