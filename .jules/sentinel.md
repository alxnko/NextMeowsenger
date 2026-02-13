## 2025-02-23 - Socket.io Authentication Bypass and Impersonation
**Vulnerability:** Socket.io server lacked authentication middleware and blindly trusted `senderId` and `roomId` from client messages.
**Learning:** WebSocket implementations in Next.js API routes often operate outside the standard request lifecycle, requiring manual session validation (cookie parsing and token verification) that mirrors the main application auth.
**Prevention:** Always attach authentication middleware to the `io` instance (`io.use`) and use `socket.data` to store trusted user identity. Never rely on client-provided IDs for sensitive actions like sending messages or joining private rooms.
