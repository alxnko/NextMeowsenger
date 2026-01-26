import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List pending requests (Admin only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { id: chatId } = await params;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check admin role
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (
      !requester ||
      (requester.role !== "ADMIN" && requester.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.joinRequest.findMany({
      where: { chatId, status: "PENDING" },
      include: {
        user: {
          select: { id: true, username: true, publicKey: true },
        },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}

// PUT: Approve or Reject
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get("x-user-id");
  const { id: chatId } = await params;
  const { requestId, action } = await request.json(); // action: "APPROVE" | "REJECT"

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check admin role
    const requester = await prisma.chatParticipant.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (
      !requester ||
      (requester.role !== "ADMIN" && requester.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest)
      return NextResponse.json({ error: "Request not found" }, { status: 404 });

    if (action === "APPROVE") {
      // Transaction: Update request status AND create participant
      await prisma.$transaction([
        prisma.joinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        }),
        prisma.chatParticipant.create({
          data: {
            userId: joinRequest.userId,
            chatId: joinRequest.chatId,
            role: "MEMBER",
            encryptedKey: "",
          },
        }),
      ]);
    } else if (action === "REJECT") {
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });
    } else {
      return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
