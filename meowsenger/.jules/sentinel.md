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
