import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/chats - List user's chats
export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const participants = await prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chat: {
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
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    const chats = participants.map((p: any) => ({
      ...p.chat,
      lastMessage: p.chat.messages[0] || null,
      lastReadAt: p.lastReadAt, // Add this line
    }));

    chats.sort((a: any, b: any) => {
      const dateA = new Date(
        a.lastMessage?.createdAt || a.updatedAt || a.createdAt,
      ).getTime();
      const dateB = new Date(
        b.lastMessage?.createdAt || b.updatedAt || b.createdAt,
      ).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 },
    );
  }
}

// POST /api/chats - Create a new chat
export async function POST(request: Request) {
  try {
    const { type, name, participantIds, isPublic } = await request.json();
    const creatorId = request.headers.get("x-user-id");

    if (!creatorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // If DIRECT, check if already exists
    if (type === "DIRECT") {
      const targetId = participantIds.find((id: string) => id !== creatorId);
      console.log(
        `[API/CHATS] Checking existing DIRECT chat between ${creatorId} and ${targetId}`,
      );

      const existingChat = await prisma.chat.findFirst({
        where: {
          type: "DIRECT",
          participants: {
            every: {
              userId: { in: [creatorId, targetId] },
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, username: true, publicKey: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (existingChat) {
        // Double check it has exactly 2 participants (unless it's a self-chat)
        const isSelf = creatorId === targetId;
        const participantCount = existingChat.participants.length;

        if (
          (isSelf && participantCount === 1) ||
          (!isSelf && participantCount === 2)
        ) {
          console.log(`[API/CHATS] Found existing chat: ${existingChat.id}`);
          return NextResponse.json({ chat: existingChat });
        }
      }
    }

    // For GROUP type, check privacy settings of participants
    let finalParticipantIds = participantIds;
    let skippedUsers: any[] = [];

    if (type === "GROUP") {
      const usersPrivacy = await prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, username: true, allowAutoGroupAdd: true },
      });

      skippedUsers = usersPrivacy.filter(
        (u: any) => u.id !== creatorId && !u.allowAutoGroupAdd,
      );
      finalParticipantIds = usersPrivacy
        .filter((u: any) => u.id === creatorId || u.allowAutoGroupAdd)
        .map((u: any) => u.id);
    }

    const chat = await prisma.chat.create({
      data: {
        type: type as any,
        name: name || null,
        description: (request as any).description || null,
        visibility: (isPublic ? "PUBLIC" : "PRIVATE") as any,
        participants: {
          create: finalParticipantIds.map((id: string) => ({
            userId: id,
            role: id === creatorId ? "OWNER" : "MEMBER",
            encryptedKey: "",
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, publicKey: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ chat, skippedUsers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
