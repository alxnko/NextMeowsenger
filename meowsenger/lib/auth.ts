import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { verifySession, signSession } from "./session";
import { getRequiredEnv } from "./utils";

// Helper to sign data
export function sign(data: string): string {
  return crypto.createHmac("sha256", getRequiredEnv("SESSION_SECRET")).update(data).digest("hex");
}

// Helper to verify signature
export function verify(data: string, signature: string): boolean {
  const expected = sign(data);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function createSession(userId: string) {
  const token = await signSession(userId);
  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const userId = await verifySession(token);
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (e) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
}

export function verifyToken(token: string) {
  // This is a synchronous-looking version, but verifySession is async
  // However, it seems verifyToken was barely used or its usage can be adjusted
  // Let's check its usage.
  return null;
}
