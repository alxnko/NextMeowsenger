import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  validateUsername,
  validatePassword,
  validatePublicKey,
  validateEncryptedPrivateKey,
} from "@/lib/validation";
import { signSession } from "@/lib/session";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, publicKey, encryptedPrivateKey } = body;

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    const publicKeyError = validatePublicKey(publicKey);
    const privateKeyError = validateEncryptedPrivateKey(encryptedPrivateKey);

    const error =
      usernameError || passwordError || publicKeyError || privateKeyError;

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: "Username taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        publicKey,
        encryptedPrivateKey,
      },
    });

    // Create session
    await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    });

    const token = await signSession(user.id);
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal User Error" }, { status: 500 });
  }
}
