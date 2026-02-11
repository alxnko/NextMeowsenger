import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

const SECRET_KEY = process.env.SESSION_SECRET || "SUPER_SECRET_KEY_REPLACE_IN_PROD";

// Helper to sign data
export function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const payload = JSON.stringify({ userId, expiresAt: expiresAt.toISOString() });
  const signature = sign(payload);
  const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const [b64Payload, signature] = token.split(".");
  if (!b64Payload || !signature) return null;

  const payloadStr = Buffer.from(b64Payload, "base64").toString();

  if (!verify(payloadStr, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadStr);
    if (new Date(payload.expiresAt) < new Date()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
