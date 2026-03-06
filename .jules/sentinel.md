## 2025-02-23 - Socket.io Authentication Bypass and Impersonation
**Vulnerability:** Socket.io server lacked authentication middleware and blindly trusted `senderId` and `roomId` from client messages.
**Learning:** WebSocket implementations in Next.js API routes often operate outside the standard request lifecycle, requiring manual session validation (cookie parsing and token verification) that mirrors the main application auth.
**Prevention:** Always attach authentication middleware to the `io` instance (`io.use`) and use `socket.data` to store trusted user identity. Never rely on client-provided IDs for sensitive actions like sending messages or joining private rooms.

## 2025-02-24 - Critical Hardcoded Secrets and Build-Time Failures
**Vulnerability:** `JWT_SECRET` and `SESSION_SECRET` had hardcoded default values in the codebase, allowing session forgery if environment variables were missing.
**Learning:** Using top-level `process.env` checks for secrets can cause build failures in Next.js if the secrets aren't present during the build process (even if not used). Lazy evaluation (runtime checks inside functions) is safer for build stability while maintaining security.
**Prevention:** Implement `getSecret()` helper functions that throw errors at runtime, rather than defining constants at the module level.

## 2024-05-24 - [Critical Security Fix] Remove Hardcoded SESSION_SECRET Fallback
**Vulnerability:** The application used a hardcoded fallback string (`SUPER_SECRET_KEY_REPLACE_IN_PROD`) for `SESSION_SECRET` if the environment variable was missing. This is a critical risk, as instances could unintentionally run in production with a known secret, allowing attackers to forge session tokens and bypass authentication entirely.
**Learning:** Hardcoded fallback values for cryptographic secrets in top-level module scope are a dangerous anti-pattern. This occurred partly because top-level initialization can cause build issues in Next.js when environment variables are missing during build-time, tempting developers to use fallbacks.
**Prevention:** Always implement "lazy" runtime checks via getter functions (e.g., `getSecretKey()`) for required environment variables. Throw explicit descriptive errors if they are missing at runtime, rather than supplying an insecure default. This satisfies build requirements while guaranteeing the application crashes safely (fail securely) in production if misconfigured.
