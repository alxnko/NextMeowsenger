import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request) {
  const session = await getSession();
  const userId = session?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, allowAutoGroupAdd } = body;

    // Validation
    if (
      username !== undefined &&
      (typeof username !== "string" || username.trim().length < 3)
    ) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 },
      );
    }

    // Check availability if username is changing
    if (username !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { username: username.trim() },
      });

      if (existing && existing.id !== userId) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 },
        );
      }
    }

    // Update
    const updateData: any = {};
    if (username !== undefined) updateData.username = username.trim();
    if (allowAutoGroupAdd !== undefined)
      updateData.allowAutoGroupAdd = allowAutoGroupAdd;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        publicKey: true,
        allowAutoGroupAdd: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update profile failed", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
