import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/chats/[id]/join - Join or Request Access
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { id: chatId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Check if valid already
    const existing = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });
    if (existing) {
      return NextResponse.json({
        status: "MEMBER",
        message: "Already a member",
      });
    }

    // Check pending
    const pending = await prisma.joinRequest.findFirst({
      where: { userId, chatId, status: "PENDING" },
    });
    if (pending) {
      return NextResponse.json({
        status: "PENDING",
        message: "Request already pending",
      });
    }

    if (chat.visibility === "PUBLIC") {
      // Auto-join
      await prisma.chatParticipant.create({
        data: {
          userId,
          chatId,
          role: "MEMBER",
          encryptedKey: "",
        },
      });
      return NextResponse.json({
        status: "MEMBER",
        message: "Joined successfully",
      });
    } else {
      // Create Request
      await prisma.joinRequest.create({
        data: {
          userId,
          chatId,
          status: "PENDING",
        },
      });
      return NextResponse.json({ status: "PENDING", message: "Request sent" });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to join chat" }, { status: 500 });
  }
}
