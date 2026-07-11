import { createRecord, escapeAirtableFormula, listRecords } from './client';
import { requireAirtableConfig } from './config';
import { getUserById, userDisplayName } from './users';

export type GatheringParticipantStatus = 'applied' | 'cancelled';

export type AirtableGatheringParticipantFields = {
  'Gathering ID'?: string;
  'User ID'?: string;
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

export async function createGatheringParticipant(input: {
  gatheringId: string;
  userId: string;
  authorId: string;
}): Promise<GatheringParticipantRecord> {
  const config = requireAirtableConfig();
  const appliedAt = new Date().toISOString();
  const created = await createRecord<AirtableGatheringParticipantFields>(
    config.gatheringParticipantsTable,
    {
      'Gathering ID': input.gatheringId,
      'User ID': input.userId,
      'Author ID': input.authorId,
      Status: 'applied',
      'Applied At': appliedAt,
    },
    { typecast: true },
  );
  return mapParticipant(created);
}

/** 작성자(맨 앞) + applied 신청자 프로필 */
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

  const users = await Promise.all(applicantIds.map((id) => getUserById(id)));

  const members: GatheringMemberProfile[] = [
    {
      user_id: input.authorId,
      name: input.authorName.trim() || '작성자',
      avatar_url: input.authorAvatarUrl,
      is_author: true,
    },
  ];

  for (let i = 0; i < applicantIds.length; i += 1) {
    const userId = applicantIds[i];
    const user = users[i];
    members.push({
      user_id: userId,
      name: user ? userDisplayName(user) : '사용자',
      avatar_url: user?.avatarUrl ?? null,
      is_author: false,
    });
  }

  return members;
}
