import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

// GET: Get invite code for a chat
export async function GET(
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
      select: { inviteCode: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ inviteCode: chat.inviteCode });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Generate/Refresh invite code
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
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (
      !requester ||
      (requester.role !== "ADMIN" && requester.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inviteCode = uuidv4().slice(0, 8); // Short manageable code

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: { inviteCode },
    });

    return NextResponse.json({ inviteCode: updatedChat.inviteCode });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
