## 2025-02-23 - Socket.io Authentication Bypass and Impersonation
**Vulnerability:** Socket.io server lacked authentication middleware and blindly trusted `senderId` and `roomId` from client messages.
**Learning:** WebSocket implementations in Next.js API routes often operate outside the standard request lifecycle, requiring manual session validation (cookie parsing and token verification) that mirrors the main application auth.
**Prevention:** Always attach authentication middleware to the `io` instance (`io.use`) and use `socket.data` to store trusted user identity. Never rely on client-provided IDs for sensitive actions like sending messages or joining private rooms.

## 2025-02-24 - Critical Hardcoded Secrets and Build-Time Failures
**Vulnerability:** `JWT_SECRET` and `SESSION_SECRET` had hardcoded default values in the codebase, allowing session forgery if environment variables were missing.
**Learning:** Using top-level `process.env` checks for secrets can cause build failures in Next.js if the secrets aren't present during the build process (even if not used). Lazy evaluation (runtime checks inside functions) is safer for build stability while maintaining security.
**Prevention:** Implement `getSecret()` helper functions that throw errors at runtime, rather than defining constants at the module level.
