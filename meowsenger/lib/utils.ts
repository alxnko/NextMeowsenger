export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Generates a cryptographically secure random string of the specified length.
 * Uses the Web Crypto API (crypto.getRandomValues).
 *
 * @param length The length of the string to generate.
 * @returns A random string containing alphanumeric characters.
 */
export function generateSecureRandomString(length: number): string {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError("Length must be a non-negative integer");
  }

  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  const result = new Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = charset[values[i] % charset.length];
  }

  return result.join("");
}

/**
 * Retrieves a required environment variable or throws an error if it's missing.
 *
 * @param key The environment variable key.
 * @returns The value of the environment variable.
 * @throws Error if the environment variable is not defined.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not defined`);
  }
  return value;
}
