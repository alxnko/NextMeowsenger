import { ChatWindow } from "@/components/ChatWindow";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatWindow chatId={id} />;
}
