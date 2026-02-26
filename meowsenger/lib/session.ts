const encoder = new TextEncoder();

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not defined");
  }

  const secretKeyData = encoder.encode(secret);

  cachedKey = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  return cachedKey;
}

export async function signSession(userId: string): Promise<string> {
  const key = await getKey();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
  const payload = `${userId}.${expiresAt}`;
  const data = encoder.encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, data);

  // Convert signature to base64url
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payload}.${signatureBase64}`;
}

export async function verifySession(token: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAtStr, signatureBase64Url] = parts;
  if (!userId || !expiresAtStr || !signatureBase64Url) return null;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) return null;

  if (Date.now() > expiresAt) {
    return null; // Expired
  }

  try {
    const signatureBase64 = signatureBase64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    const padLen = (4 - (signatureBase64.length % 4)) % 4;
    const padded = signatureBase64.padEnd(signatureBase64.length + padLen, '=');

    const key = await getKey();
    const payload = `${userId}.${expiresAtStr}`;
    const data = encoder.encode(payload);
    const signature = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);

    if (!isValid) return null;
    return userId;
  } catch (e) {
    console.error("Session verification failed", e);
    return null;
  }
}
