import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Add specific user (Admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  let participantIds: string[];
  try {
    const body = await request.json();
    participantIds = body.participantIds || [body.newMemberId];
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id: chatId } = await params;

  if (!userId || !participantIds || participantIds.length === 0) {
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }

  try {
    // Check permission (Must be ADMIN or OWNER)
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (
      !requester ||
      (requester.role !== "ADMIN" && requester.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usersPrivacy = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, username: true, allowAutoGroupAdd: true },
    });

    const existingParticipants = await prisma.chatParticipant.findMany({
      where: { chatId, userId: { in: participantIds } },
      select: { userId: true },
    });

    const existingIds = new Set(
      existingParticipants.map((p: { userId: string }) => p.userId),
    );

    const skippedUsers = usersPrivacy.filter(
      (u: { allowAutoGroupAdd: boolean; id: string }) =>
        !u.allowAutoGroupAdd || existingIds.has(u.id),
    );
    const toAddIds = usersPrivacy
      .filter(
        (u: { allowAutoGroupAdd: boolean; id: string }) =>
          u.allowAutoGroupAdd && !existingIds.has(u.id),
      )
      .map((u: { id: string }) => u.id);

    if (toAddIds.length > 0) {
      await prisma.chatParticipant.createMany({
        data: toAddIds.map((id: string) => ({
          userId: id,
          chatId,
          role: "MEMBER",
          encryptedKey: "",
        })),
      });
    }

    let inviteCode = null;
    if (skippedUsers.length > 0) {
      // Check if chat has invite code, if not generate one
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { inviteCode: true },
      });

      if (!chat?.inviteCode) {
        inviteCode = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        await prisma.chat.update({
          where: { id: chatId },
          data: { inviteCode },
        });
      } else {
        inviteCode = chat.inviteCode;
      }
    }

    return NextResponse.json({
      success: true,
      addedCount: toAddIds.length,
      skippedUsers,
      inviteCode,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 },
    );
  }
}

// DELETE: Remove member (Admin or Self)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  let targetUserId: string | undefined;
  try {
    const body = await request.json();
    targetUserId = body.targetUserId;
  } catch (e) {
    // Body is optional for self-leaf
  }
  const { id: chatId } = await (params as unknown as { id: string });

  const targetId = targetUserId || userId;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!targetId) {
    return NextResponse.json({ error: "Invalid Target User" }, { status: 400 });
  }

  try {
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (!requester)
      return NextResponse.json({ error: "Not in chat" }, { status: 403 });

    const isSelf = userId === targetId;
    const isAdmin = requester.role === "ADMIN" || requester.role === "OWNER";

    if ((!isSelf && !isAdmin) || !requester.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chatParticipant.delete({
      where: { userId_chatId: { userId: targetId!, chatId } },
    });

    return NextResponse.json({ success: true, leftUserId: targetId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 },
    );
  }
}

// PUT: Update Member Role (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { targetUserId, role } = await request.json(); // role: "ADMIN" | "MEMBER"
  const { id: chatId } = await params;

  if (!userId || !targetUserId || !role) {
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }

  try {
    // 1. Check Requester Permissions (Must be ADMIN or OWNER)
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (
      !requester ||
      (requester.role !== "ADMIN" && requester.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Update Target Role
    const updatedParticipant = await prisma.chatParticipant.update({
      where: {
        userId_chatId: { userId: targetUserId, chatId },
      },
      data: { role },
    });

    return NextResponse.json({ participant: updatedParticipant });
  } catch (error) {
    console.error("Failed to update role", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 },
    );
  }
}
