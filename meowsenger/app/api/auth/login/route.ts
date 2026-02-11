import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateUsername, validatePassword } from "@/lib/validation";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);

    if (usernameError || passwordError) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Create session
    await createSession(user.id);

    // Return the Encrypted Private Key so the client can decrypt it with the password
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        publicKey: user.publicKey,
        encryptedPrivateKey: user.encryptedPrivateKey,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
