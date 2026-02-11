import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "./lib/session";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;
  let userId: string | null = null;

  if (sessionToken) {
    userId = await verifySession(sessionToken);
  }

  // Clone headers to modify them
  const requestHeaders = new Headers(request.headers);

  if (userId) {
    // Session valid: Set the trusted user ID header
    requestHeaders.set("x-user-id", userId);
  } else {
    // Session invalid or missing: Remove the user ID header to prevent spoofing
    // This ensures downstream API routes cannot be tricked by a client-provided header
    requestHeaders.delete("x-user-id");
  }

  // Pass the modified headers to the next handler
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Only run on API routes to avoid overhead on static assets or pages
export const config = {
  matcher: "/api/:path*",
};
