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
