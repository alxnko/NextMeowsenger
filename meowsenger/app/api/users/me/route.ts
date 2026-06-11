import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateUsername } from "@/lib/validation";

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
    let finalUsername = username;
    if (username !== undefined) {
      if (typeof username !== "string") {
        return NextResponse.json(
          { error: "Username must be a string" },
          { status: 400 },
        );
      }
      const usernameError = validateUsername(username);
      if (usernameError) {
        return NextResponse.json(
          { error: usernameError },
          { status: 400 },
        );
      }
      // Security: We only use the explicitly validated, un-trimmed raw username,
      // as `validateUsername` enforcing strict regex acts as our normalization boundary.
      finalUsername = username;
    }

    // Check availability if username is changing
    if (finalUsername !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { username: finalUsername },
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
    if (finalUsername !== undefined) updateData.username = finalUsername;
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
