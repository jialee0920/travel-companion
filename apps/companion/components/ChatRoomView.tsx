'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { PeerProfileSheet } from '@/components/PeerProfileSheet';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CHAT_POLL_INTERVAL_MS, type ChatMessageRow } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

type Props = {
  roomId: string;
};

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatRoomView({ roomId }: Props) {
  const { profile, ready } = useUserProfile();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('');
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestMessageAtRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const mergeMessages = useCallback((incoming: ChatMessageRow[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const msg of incoming) map.set(msg.id, msg);
      const merged = [...map.values()].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const last = merged[merged.length - 1];
      if (last) latestMessageAtRef.current = last.created_at;
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;
    setLoading(true);
    latestMessageAtRef.current = null;

    fetch(
      `/api/chat/messages?roomId=${encodeURIComponent(roomId)}&profileId=${encodeURIComponent(profile.id)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.messages) {
          setMessages(data.messages);
          const last = data.messages[data.messages.length - 1] as ChatMessageRow | undefined;
          if (last) latestMessageAtRef.current = last.created_at;
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetch(`/api/chat/rooms?profileId=${encodeURIComponent(profile.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const room = (data.rooms ?? []).find((r: { id: string }) => r.id === roomId);
        if (room?.peer) {
          setPeerId(room.peer.id ?? null);
          setPeerName(room.peer.name);
          setPeerAvatar(room.peer.avatar_url);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, profile?.id]);

  useEffect(() => {
    if (!profile?.id || loading) return;

    let cancelled = false;

    const poll = async () => {
      const since = latestMessageAtRef.current;
      const params = new URLSearchParams({
        roomId,
        profileId: profile.id,
      });
      if (since) params.set('since', since);

      try {
        const res = await fetch(`/api/chat/messages?${params.toString()}`);
        const data = await res.json();
        if (cancelled || !data.messages?.length) return;
        mergeMessages(data.messages);
      } catch {
        // 폴링 실패는 다음 주기에 재시도
      }
    };

    const interval = setInterval(poll, CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, profile?.id, loading, mergeMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id || !text.trim() || sending) return;

    const body = text.trim();
    setText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, senderId: profile.id, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '전송 실패');

      mergeMessages([data.message]);
    } catch (err) {
      setText(body);
      alert(err instanceof Error ? err.message : '메시지 전송 실패');
    } finally {
      setSending(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">채팅을 이용하려면 로그인이 필요합니다.</p>
        <Link href="/chat" className="mt-3 inline-block text-sm font-medium text-primary">
          채팅 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-12">
        <Link
          href="/chat"
          aria-label="뒤로"
          className="flex size-9 items-center justify-center rounded-full bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => peerId && setProfileOpen(true)}
          disabled={!peerId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-opacity hover:opacity-80 disabled:opacity-100"
        >
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-secondary">
            {peerAvatar ? (
              <Image src={peerAvatar} alt="" fill className="object-cover" sizes="36px" />
            ) : (
              <span className="flex size-full items-center justify-center text-sm font-bold text-primary">
                {peerName.slice(0, 1) || '?'}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold">{peerName || '대화'}</span>
            <span className="block text-xs text-muted-foreground">1:1 동행 채팅</span>
          </span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            첫 메시지를 보내보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((msg) => {
              const mine = msg.sender_id === profile.id;
              return (
                <li
                  key={msg.id}
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
                      mine
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border bg-card',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={cn(
                        'mt-1 text-micro',
                        mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      )}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-border bg-background px-4 py-3 pb-24"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
          rows={1}
          className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="전송"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </form>

      <PeerProfileSheet
        userId={profileOpen ? peerId : null}
        chatActive
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
