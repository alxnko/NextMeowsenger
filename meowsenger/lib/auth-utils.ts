import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';

export function signToken(userId: string, expires?: Date): string {
  const exp = expires || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionData = JSON.stringify({ userId, expires: exp.toISOString() });

  // Sign the session data
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(sessionData)
    .digest('hex');

  return `${Buffer.from(sessionData).toString('base64')}.${signature}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const sessionData = Buffer.from(dataB64, 'base64').toString();
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(sessionData)
      .digest('hex');

    // Ensure signature length matches expected length to prevent truncation attacks
    if (signature.length !== expectedSignature.length) {
      return null;
    }

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
