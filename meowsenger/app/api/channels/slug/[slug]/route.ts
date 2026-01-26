import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/channels/slug/[slug] - Get public channel by slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const userId = request.headers.get("x-user-id");

  try {
    const chat = await prisma.chat.findUnique({
      where: { slug: slug.toLowerCase() },
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
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (chat.type !== "CHANNEL") {
      return NextResponse.json({ error: "Not a channel" }, { status: 400 });
    }

    if (chat.visibility !== "PUBLIC") {
      return NextResponse.json({ error: "Channel is not public" }, { status: 403 });
    }

    // Check if user is already a member
    let isMember = false;
    let userRole = null;
    if (userId) {
      const participant = chat.participants.find((p: any) => p.userId === userId);
      if (participant) {
        isMember = true;
        userRole = participant.role;
      }
    }

    return NextResponse.json({
      chat,
      isMember,
      userRole,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 },
    );
  }
}
