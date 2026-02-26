import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: chatId } = await params;
  const user = await getSession();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Verify membership
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });

    if (!participant)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const before = url.searchParams.get("before");

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Return in chronological order for the client
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
