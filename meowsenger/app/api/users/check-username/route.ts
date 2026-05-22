import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateUsername } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const session = await getSession();
  const currentUserId = session?.id;

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return NextResponse.json(
      { available: false, error: usernameError },
      { status: 200 },
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: { id: true },
    });

    // Username is available if it doesn't exist OR belongs to current user
    const available = !existing || existing.id === currentUserId;

    return NextResponse.json({ available, username });
  } catch (error) {
    console.error("Username check failed", error);
    return NextResponse.json(
      { error: "Failed to check username" },
      { status: 500 },
    );
  }
}
