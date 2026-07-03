import { PageShell } from '@/components/PageShell';
import { ChatRoomView } from '@/components/ChatRoomView';

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function ChatRoomPage({ params }: Props) {
  const { roomId } = await params;

  return (
    <PageShell active="chat" hideNav>
      <ChatRoomView roomId={roomId} />
    </PageShell>
  );
}
