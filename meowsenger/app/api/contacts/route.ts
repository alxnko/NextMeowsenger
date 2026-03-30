import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/contacts - List users the current user has interacted with
export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ⚡ Bolt: Replaced sequential database lookups (fetching chat IDs then fetching contacts)
    // with a single optimized query using a relation filter. This avoids application-side
    // joins and reduces database roundtrips.
    const contacts = await prisma.chatParticipant.findMany({
      where: {
        userId: { not: userId }, // Exclude self
        chat: {
          participants: {
            some: { userId }, // Only chats where the current user is a participant
          },
        },
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
