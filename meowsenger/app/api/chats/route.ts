import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateSecureRandomString } from "@/lib/utils";

// GET /api/chats - List user's chats
export async function GET(request: Request) {
  const session = await getSession();
  const userId = session?.id;

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
              take: 5,
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

    // Collect senderIds from lastMessages that are not in the fetched participants
    const missingSenderIds = new Set<string>();
    const chats = participants.map((p: any) => {
      const chat = p.chat;
      const lastMessage = chat.messages[0] || null;

      let senderInParticipants = true;

      if (lastMessage) {
        const senderId = lastMessage.senderId;
        // Check if sender is among the fetched participants
        senderInParticipants = chat.participants.some(
          (cp: any) => cp.user.id === senderId,
        );
        if (!senderInParticipants) {
          missingSenderIds.add(senderId);
        }
      }

      return {
        ...chat,
        lastMessage,
        lastReadAt: p.lastReadAt,
        _senderInParticipants: senderInParticipants, // Store result for second pass
      };
    });

    // Fetch missing sender details
    if (missingSenderIds.size > 0) {
      const additionalUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(missingSenderIds) } },
        select: { id: true, username: true, publicKey: true },
      });

      const userMap = new Map(additionalUsers.map((u) => [u.id, u]));

      // Append missing senders to chat participants so frontend can resolve "You: ..." or "Username: ..."
      for (const chat of chats) {
        if (chat.lastMessage && !chat._senderInParticipants) {
          const user = userMap.get(chat.lastMessage.senderId);
          if (user) {
            // Structure it like a ChatParticipant
            chat.participants.push({
              user,
              userId: user.id,
              chatId: chat.id,
              // Minimal dummy fields if needed by types, though frontend mainly accesses .user
              role: "MEMBER",
              encryptedKey: "",
            });
          }
        }
      }
    }

    // Clean up temporary performance optimization property
    for (const chat of chats) {
      delete chat._senderInParticipants;
    }

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
    const { type, name, participantIds, isPublic, slug, description } = await request.json();
    const session = await getSession();
    const creatorId = session?.id;

    if (!creatorId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Validate channel-specific requirements
    if (type === "CHANNEL") {
      if (!name?.trim()) {
        return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
      }
      
      // Validate and generate slug for public channels
      if (isPublic) {
        if (!slug?.trim()) {
          return NextResponse.json({ error: "Slug is required for public channels" }, { status: 400 });
        }
        
        // Check if slug is already taken
        const existingSlug = await prisma.chat.findUnique({
          where: { slug: slug.toLowerCase() },
        });
        
        if (existingSlug) {
          return NextResponse.json({ error: "Slug is already taken" }, { status: 400 });
        }
      }
    }

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
    let finalParticipantIds = participantIds || [];
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

    // For CHANNEL type, only the creator is initially added
    if (type === "CHANNEL") {
      finalParticipantIds = [creatorId];
    }

    let inviteCode = undefined;
    if (skippedUsers.length > 0) {
      // Generate invite code if users were skipped
      inviteCode = generateSecureRandomString(12);
    }

    const chat = await prisma.chat.create({
      data: {
        type: type as any,
        name: name || null,
        description: description || null,
        visibility: (isPublic ? "PUBLIC" : "PRIVATE") as any,
        inviteCode: inviteCode,
        slug: (type === "CHANNEL" && isPublic && slug) ? slug.toLowerCase() : null,
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

    return NextResponse.json({
      chat,
      skippedUsers,
      inviteCode: chat.inviteCode,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
