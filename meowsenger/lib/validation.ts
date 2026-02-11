export const VALIDATION_RULES = {
  username: {
    min: 3,
    max: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: "Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
  },
  password: {
    min: 8,
    max: 100,
    message: "Password must be between 8 and 100 characters long.",
  },
  publicKey: {
    min: 100,
    max: 1000,
    message: "Invalid public key format.",
  },
  encryptedPrivateKey: {
    min: 500,
    max: 4000,
    message: "Invalid encrypted private key format.",
  },
};

export function validateUsername(username: any): string | null {
  if (typeof username !== "string") return "Username must be a string.";
  if (username.length < VALIDATION_RULES.username.min || username.length > VALIDATION_RULES.username.max) {
    return VALIDATION_RULES.username.message;
  }
  if (!VALIDATION_RULES.username.pattern.test(username)) {
    return VALIDATION_RULES.username.message;
  }
  return null;
}

export function validatePassword(password: any): string | null {
  if (typeof password !== "string") return "Password must be a string.";
  if (password.length < VALIDATION_RULES.password.min || password.length > VALIDATION_RULES.password.max) {
    return VALIDATION_RULES.password.message;
  }
  return null;
}

export function validatePublicKey(publicKey: any): string | null {
  if (typeof publicKey !== "string") return "Public key must be a string.";
  if (publicKey.length < VALIDATION_RULES.publicKey.min || publicKey.length > VALIDATION_RULES.publicKey.max) {
    return VALIDATION_RULES.publicKey.message;
  }
  return null;
}

export function validateEncryptedPrivateKey(encryptedPrivateKey: any): string | null {
  if (typeof encryptedPrivateKey !== "string") return "Encrypted private key must be a string.";
  if (encryptedPrivateKey.length < VALIDATION_RULES.encryptedPrivateKey.min || encryptedPrivateKey.length > VALIDATION_RULES.encryptedPrivateKey.max) {
    return VALIDATION_RULES.encryptedPrivateKey.message;
  }
  return null;
}
