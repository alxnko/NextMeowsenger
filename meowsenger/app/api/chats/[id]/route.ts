import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = request.headers.get("x-user-id");

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                publicKey: true,
              },
            },
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!chat)
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    // Verify membership
    const isMember = chat.participants.some(
      (p: { userId: string }) => p.userId === userId,
    );

    // Check for pending request
    let isPending = false;
    if (!isMember) {
      const pendingReq = await prisma.joinRequest.findFirst({
        where: { chatId: id, userId, status: "PENDING" },
      });
      if (pendingReq) isPending = true;
    }

    const membershipStatus = isMember
      ? "MEMBER"
      : isPending
        ? "PENDING"
        : "NON_MEMBER";
    const isPublic = chat.visibility === "PUBLIC";

    // Access Control
    if (!isMember && !isPublic) {
      // Private Chat: Return basic info only, no messages, no participants details (maybe just count)
      return NextResponse.json({
        chat: {
          id: chat.id,
          name: chat.name,
          description: chat.description,
          type: chat.type,
          visibility: chat.visibility,
          membershipStatus,
          participants: [], // Hide participants
          messages: [], // Hide messages
        },
      });
    }

    // Public Chat (Non-member) OR Member: Return full info (or preview)
    return NextResponse.json({
      chat: {
        ...chat,
        membershipStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat details" },
      { status: 500 },
    );
  }
}
