import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/chats/[id]/settings
// Updates chat settings (Name, Visibility, Description) - Admin Only
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { name, visibility, description } = await request.json();
  const { id: chatId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Check permissions (Admin/Owner)
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        userId_chatId: { userId, chatId },
      },
    });

    if (
      !participant ||
      (participant.role !== "ADMIN" && participant.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Update Chat
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        visibility: visibility !== undefined ? visibility : undefined,
      },
    });

    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json(
      { error: "Failed to update chat settings" },
      { status: 500 },
    );
  }
}
