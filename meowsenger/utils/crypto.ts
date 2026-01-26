export const ALGORITHM_NAME = "RSA-OAEP";
export const HASH_NAME = "SHA-256";

// --- Key Generation ---

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: ALGORITHM_NAME,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH_NAME,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

// --- Key Export/Import Utilities ---

export async function exportKey(key: CryptoKey): Promise<string> {
  const format = key.type === "public" ? "spki" : "pkcs8";
  const exported = await window.crypto.subtle.exportKey(format, key);
  return arrayBufferToBase64(exported);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binary = base64ToArrayBuffer(base64);
  return window.crypto.subtle.importKey(
    "spki",
    binary,
    {
      name: ALGORITHM_NAME,
      hash: HASH_NAME,
    },
    true,
    ["encrypt"],
  );
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const binary = base64ToArrayBuffer(base64);
  return window.crypto.subtle.importKey(
    "pkcs8",
    binary,
    {
      name: ALGORITHM_NAME,
      hash: HASH_NAME,
    },
    true,
    ["decrypt"],
  );
}

// --- Password-Based Encryption Protection (for Private Key Storage) ---

async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any, // Cast to any to avoid SharedArrayBuffer vs ArrayBuffer type issues in some TS versions
      iterations: 100000,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPrivateKeyWithPassword(
  privateKey: CryptoKey,
  password: string,
): Promise<string> {
  // 1. Export the Private Key
  const exportedKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);

  // 2. Generate key encryption salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive key
  const wrappingKey = await deriveKeyFromPassword(password, salt);

  // 4. Encrypt the private key
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    wrappingKey,
    exportedKey,
  );

  // 5. Pack: Salt (16) + IV (12) + Content
  const packed = new Uint8Array(
    salt.byteLength + iv.byteLength + encryptedContent.byteLength,
  );
  packed.set(salt, 0);
  packed.set(iv, salt.byteLength);
  packed.set(new Uint8Array(encryptedContent), salt.byteLength + iv.byteLength);

  return arrayBufferToBase64(packed);
}

export async function decryptPrivateKeyWithPassword(
  packedDataBase64: string,
  password: string,
): Promise<CryptoKey> {
  const packed = base64ToArrayBuffer(packedDataBase64);
  const packedArray = new Uint8Array(packed);

  // Extract parts
  const salt = packedArray.slice(0, 16);
  const iv = packedArray.slice(16, 28);
  const data = packedArray.slice(28);

  // Derive Key
  const wrappingKey = await deriveKeyFromPassword(password, salt);

  // Decrypt
  const decryptedKeyData = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    wrappingKey,
    data,
  );

  // Import back to CryptoKey
  return window.crypto.subtle.importKey(
    "pkcs8",
    decryptedKeyData,
    {
      name: ALGORITHM_NAME,
      hash: HASH_NAME,
    },
    true,
    ["decrypt"],
  );
}

// --- Message Encryption (Hybrid RSA-OAEP + AES-GCM) ---

export interface EncryptedMessagePacket {
  ciphertext: string;
  iv: string;
  keys: Record<string, string>; // userId -> encryptedAesKey (base64)
}

export async function encryptChatMessage(
  content: string,
  recipientPublicKeys: { userId: string; key: CryptoKey }[],
): Promise<EncryptedMessagePacket> {
  // 1. Generate random AES key for this single message
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // 2. Encrypt content with AES
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(content),
  );

  // 3. Encrypt AES key with each recipient's RSA public key (Key Wrapping)
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const keys: Record<string, string> = {};

  for (const recipient of recipientPublicKeys) {
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipient.key,
      exportedAesKey,
    );
    keys[recipient.userId] = arrayBufferToBase64(encryptedKey);
  }

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    keys,
  };
}

export async function decryptChatMessage(
  packet: EncryptedMessagePacket,
  myPrivateKey: CryptoKey,
  myUserId: string,
): Promise<string> {
  const encryptedAesKeyBase64 = packet.keys[myUserId];
  if (!encryptedAesKeyBase64) {
    throw new Error("Ciphertext not intended for this user identity.");
  }

  // 1. Decrypt the AES message key using RSA private key
  const encryptedAesKey = base64ToArrayBuffer(encryptedAesKeyBase64);
  const aesKeyBuffer = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    myPrivateKey,
    encryptedAesKey,
  );

  // 2. Import the decrypted AES key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    "AES-GCM",
    true,
    ["decrypt"],
  );

  // 3. Decrypt the actual content
  const ciphertext = base64ToArrayBuffer(packet.ciphertext);
  const iv = base64ToArrayBuffer(packet.iv);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
