import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionData = JSON.stringify({ userId, expires: expires.toISOString() });

  // Sign the session data
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(sessionData)
    .digest('hex');

  const token = `${Buffer.from(sessionData).toString('base64')}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'strict',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const sessionData = Buffer.from(dataB64, 'base64').toString();
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(sessionData)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedSignatureBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
      return null;
    }

    const { userId, expires } = JSON.parse(sessionData);
    if (new Date(expires) < new Date()) return null;

    return { userId };
  } catch (e) {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
