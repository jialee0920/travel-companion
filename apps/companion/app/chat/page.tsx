import { PageShell } from '@/components/PageShell';
import { ChatRoomList } from '@/components/ChatRoomList';

export default function ChatPage() {
  return (
    <PageShell active="chat">
      <header className="px-4 pb-2 pt-12">
        <h1 className="text-lg font-bold">채팅</h1>
        <p className="text-xs text-muted-foreground">동행자와 1:1 대화</p>
      </header>
      <ChatRoomList />
    </PageShell>
  );
}
