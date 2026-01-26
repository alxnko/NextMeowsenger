import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/contacts - List users the current user has interacted with
export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all chats where the user is a participant
    const myChats = await prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });

    const chatIds = myChats.map((c) => c.chatId);

    // Find all other participants in those chats
    const contacts = await prisma.chatParticipant.findMany({
      where: {
        chatId: { in: chatIds },
        userId: { not: userId }, // Exclude self
      },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            publicKey: true,
          },
        },
      },
      distinct: ["userId"], // Unique users only
    });

    return NextResponse.json({ contacts: contacts.map((c) => c.user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
