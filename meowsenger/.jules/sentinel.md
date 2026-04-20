## 2026-01-26 - Weak Invite Code Generation

**Vulnerability:**
The application was using `uuidv4().slice(0, 8)` for invite codes, which only provides 32 bits of entropy (8 hex characters). This makes it feasible for an attacker to brute-force active invite codes. Other parts of the app were using timestamp-based codes (`INV-${Date.now().toString(36)}-...`), which are also partially predictable.

**Learning:**
Slicing a UUID significantly reduces its entropy and cryptographic strength. For short, manageable, yet secure identifiers, a dedicated cryptographically secure random string generator (using `crypto.getRandomValues`) should be used with sufficient length (at least 70 bits of entropy).

**Prevention:**
Always use `generateSecureRandomString(length)` from `@/lib/utils` for security-sensitive identifiers like invite codes or temporary IDs. Ensure the length provides adequate entropy (e.g., 12 alphanumeric characters provide ~71.4 bits). Avoid using timestamps in security-critical identifiers.

## 2026-02-24 - Socket.IO Authorization Bypass

**Vulnerability:**
The `join_room` socket event in `pages/api/socket.ts` verified that users could only join their own `user_${userId}` room, but for all other room IDs (like Chat IDs), it allowed the join without checking if the user was actually a participant of that chat. This allowed any authenticated user to eavesdrop on any chat room's real-time events by simply emitting `join_room` with a valid Chat ID.

**Learning:**
Real-time subscription channels (like Socket.IO rooms) must have the exact same authorization checks as the REST API endpoints that fetch the initial data. We cannot rely on the client "not knowing" the Chat ID (security by obscurity).

**Prevention:**
Always query the database (`prisma.chatParticipant.findUnique`) inside the socket event handler to explicitly verify the `socket.data.userId` has permission to join the requested `roomId` before calling `socket.join(roomId)`. Default to deny for any unrecognized room patterns.

## 2026-04-08 - Insecure Access Control via Header Injection

**Vulnerability:**
API endpoints were retrieving the current user's ID from the `x-user-id` header. Although a proxy/middleware (`meowsenger/proxy.ts`) was intended to populate this header from a secure session token, the endpoints themselves did not verify the session. An attacker could bypass the proxy or exploit a misconfiguration to inject a custom `x-user-id` header, effectively spoofing any user identity.

**Learning:**
Trusting downstream headers for authentication is an anti-pattern unless the environment strictly guarantees they cannot be supplied by the client. Relying on internal "trust layers" without defense-in-depth at the endpoint level creates a single point of failure.

**Prevention:**
Always derive identity from the source of truth (session cookies/tokens) directly within the endpoint or a robust, non-bypassable authentication middleware. Use utilities like `getSession()` which verify the signature of the session token before returning the user ID.

## 2026-06-12 - Privilege Escalation via Mass Assignment

**Vulnerability:**
The `PUT /api/chats/[id]/settings` endpoint directly accepted the `visibility` field from the request payload and passed it to the `prisma.chat.update` method without validating if the value was allowed. Since `visibility` in the Prisma schema is defined as a `String` rather than an Enum, an attacker could supply arbitrary strings (e.g., `HACKED_PUBLIC`) causing the database to store invalid visibility states, potentially bypassing privacy logic or breaking the frontend.

**Learning:**
When database schemas use flexible types (like `String`) instead of strict Enums for fields that represent discrete states (e.g., roles, visibility, status), the application layer MUST enforce strict validation before writing to the database. Failing to do so allows mass assignment and data corruption.

**Prevention:**
Always validate input parameters against an allowlist of valid constants (e.g., `["PUBLIC", "PRIVATE"].includes(visibility)`) before passing them to the ORM or database, especially when the database schema cannot enforce the constraint natively.
