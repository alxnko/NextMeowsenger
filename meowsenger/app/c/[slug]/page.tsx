import { ChatWindow } from "@/components/ChatWindow";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str,
  );
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let chatId: string | null = null;

  // 1. Try to find by slug first
  const chatBySlug = await prisma.chat.findUnique({
    where: { slug: decodedSlug.toLowerCase() },
    select: { id: true },
  });

  if (chatBySlug) {
    chatId = chatBySlug.id;
  } else if (isUUID(decodedSlug)) {
    // 2. If not found by slug, and param looks like a UUID, try to find by ID
    const chatById = await prisma.chat.findUnique({
      where: { id: decodedSlug },
      select: { id: true },
    });
    if (chatById) {
      chatId = chatById.id;
    }
  }

  if (!chatId) {
    notFound();
  }

  return <ChatWindow chatId={chatId} />;
}
