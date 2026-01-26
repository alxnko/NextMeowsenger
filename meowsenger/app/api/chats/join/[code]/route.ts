import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Join a chat via invite code
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { code } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { inviteCode: code },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    if (chat.participants.length > 0) {
      return NextResponse.json({ error: "Already a member", chatId: chat.id });
    }

    const newParticipant = await prisma.chatParticipant.create({
      data: {
        userId,
        chatId: chat.id,
        role: "MEMBER",
        encryptedKey: "", // Todo: Real E2EE key distribution
      },
    });

    return NextResponse.json({ success: true, chatId: chat.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// GET: Preview chat info from code
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const chat = await prisma.chat.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 },
      );
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
