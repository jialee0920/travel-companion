import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ChatMessageRow, ChatRoomRow, ChatRoomWithPeer, ProfileRow } from '@/lib/supabase/types';
import { getOrCreateCompanionProfile, getProfileById } from './profiles';

const memoryRooms: ChatRoomRow[] = [];
const memoryMembers: { room_id: string; profile_id: string }[] = [];
const memoryMessages: ChatMessageRow[] = [];

async function findExistingRoom(profileA: string, profileB: string): Promise<ChatRoomRow | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: roomsA } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('profile_id', profileA);
    const roomIds = (roomsA ?? []).map((r) => r.room_id);
    if (roomIds.length === 0) return null;

    const { data: match } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('profile_id', profileB)
      .in('room_id', roomIds)
      .limit(1)
      .maybeSingle();

    if (!match) return null;
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', match.room_id)
      .single();
    return room as ChatRoomRow;
  }

  for (const room of memoryRooms) {
    const members = memoryMembers.filter((m) => m.room_id === room.id).map((m) => m.profile_id);
    if (members.includes(profileA) && members.includes(profileB)) return room;
  }
  return null;
}

export async function getOrCreateChatRoom(input: {
  myProfileId: string;
  peerProfileId?: string;
  companionSeedId?: string;
  region: string;
}): Promise<ChatRoomRow> {
  let peerId = input.peerProfileId;
  if (!peerId && input.companionSeedId) {
    const peer = await getOrCreateCompanionProfile(input.companionSeedId, input.region);
    peerId = peer.id;
  }
  if (!peerId) throw new Error('대화 상대가 필요합니다.');
  if (peerId === input.myProfileId) throw new Error('자신과는 대화할 수 없습니다.');

  const existing = await findExistingRoom(input.myProfileId, peerId);
  if (existing) return existing;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ region: input.region })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: memberError } = await supabase.from('chat_room_members').insert([
      { room_id: room.id, profile_id: input.myProfileId },
      { room_id: room.id, profile_id: peerId },
    ]);
    if (memberError) throw new Error(memberError.message);
    return room as ChatRoomRow;
  }

  const room: ChatRoomRow = {
    id: crypto.randomUUID(),
    region: input.region,
    last_message_at: null,
    created_at: new Date().toISOString(),
  };
  memoryRooms.push(room);
  memoryMembers.push({ room_id: room.id, profile_id: input.myProfileId });
  memoryMembers.push({ room_id: room.id, profile_id: peerId });
  return room;
}

export async function listChatRooms(profileId: string): Promise<ChatRoomWithPeer[]> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data: memberships, error } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('profile_id', profileId);
    if (error) throw new Error(error.message);

    const results: ChatRoomWithPeer[] = [];
    for (const { room_id } of memberships ?? []) {
      const { data: room } = await supabase.from('chat_rooms').select('*').eq('id', room_id).single();
      const { data: members } = await supabase
        .from('chat_room_members')
        .select('profile_id')
        .eq('room_id', room_id);

      const peerId = (members ?? []).map((m) => m.profile_id).find((id) => id !== profileId);
      if (!peerId || !room) continue;

      const peer = await getProfileById(peerId);
      if (!peer) continue;

      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('body')
        .eq('room_id', room_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      results.push({
        ...(room as ChatRoomRow),
        peer: {
          id: peer.id,
          name: peer.name,
          avatar_url: peer.avatar_url,
          companion_seed_id: peer.companion_seed_id,
        },
        last_message: lastMsg?.body ?? null,
      });
    }

    return results.sort(
      (a, b) =>
        new Date(b.last_message_at ?? b.created_at).getTime() -
        new Date(a.last_message_at ?? a.created_at).getTime(),
    );
  }

  const roomIds = memoryMembers.filter((m) => m.profile_id === profileId).map((m) => m.room_id);
  const results: ChatRoomWithPeer[] = [];

  for (const roomId of roomIds) {
    const room = memoryRooms.find((r) => r.id === roomId);
    if (!room) continue;
    const peerMember = memoryMembers.find((m) => m.room_id === roomId && m.profile_id !== profileId);
    if (!peerMember) continue;
    const peer = await getProfileById(peerMember.profile_id);
    if (!peer) continue;
    const msgs = memoryMessages.filter((m) => m.room_id === roomId);
    const last = msgs[msgs.length - 1];
    results.push({
      ...room,
      peer: {
        id: peer.id,
        name: peer.name,
        avatar_url: peer.avatar_url,
        companion_seed_id: peer.companion_seed_id,
      },
      last_message: last?.body ?? null,
    });
  }

  return results.sort(
    (a, b) =>
      new Date(b.last_message_at ?? b.created_at).getTime() -
      new Date(a.last_message_at ?? a.created_at).getTime(),
  );
}

export async function isRoomMember(roomId: string, profileId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('chat_room_members')
      .select('profile_id')
      .eq('room_id', roomId)
      .eq('profile_id', profileId)
      .maybeSingle();
    return Boolean(data);
  }
  return memoryMembers.some((m) => m.room_id === roomId && m.profile_id === profileId);
}

export async function listMessages(roomId: string): Promise<ChatMessageRow[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ChatMessageRow[];
  }
  return memoryMessages.filter((m) => m.room_id === roomId);
}

export async function sendMessage(input: {
  roomId: string;
  senderId: string;
  body: string;
}): Promise<ChatMessageRow> {
  const text = input.body.trim();
  if (!text) throw new Error('메시지를 입력해주세요.');

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (supabase) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ room_id: input.roomId, sender_id: input.senderId, body: text })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from('chat_rooms').update({ last_message_at: now }).eq('id', input.roomId);

    return data as ChatMessageRow;
  }

  const row: ChatMessageRow = {
    id: crypto.randomUUID(),
    room_id: input.roomId,
    sender_id: input.senderId,
    body: text,
    created_at: now,
  };
  memoryMessages.push(row);
  const room = memoryRooms.find((r) => r.id === input.roomId);
  if (room) room.last_message_at = now;
  return row;
}

export async function getRoomPeer(roomId: string, myProfileId: string): Promise<ProfileRow | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: members } = await supabase
      .from('chat_room_members')
      .select('profile_id')
      .eq('room_id', roomId);
    const peerId = (members ?? []).map((m) => m.profile_id).find((id) => id !== myProfileId);
    if (!peerId) return null;
    return getProfileById(peerId);
  }
  const peerMember = memoryMembers.find((m) => m.room_id === roomId && m.profile_id !== myProfileId);
  return peerMember ? getProfileById(peerMember.profile_id) : null;
}
