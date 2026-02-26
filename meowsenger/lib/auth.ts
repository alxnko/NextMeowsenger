import { cookies } from 'next/headers';
import { signToken, verifyToken } from './auth-utils';

export { verifyToken, signToken };

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = signToken(userId, expires);

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

  return verifyToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
