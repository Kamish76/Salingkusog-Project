import { auth } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

// Use Neon Auth middleware configured to process OAuth verifier exchanges
const authMiddleware = auth.middleware({
  loginUrl: "/",
});

export async function proxy(request: NextRequest) {
  // If returning from OAuth with a session verifier, execute the exchange
  if (request.nextUrl.searchParams.has("neon_auth_session_verifier")) {
    return authMiddleware(request);
  }

  // Allow standard routes to proceed (page-level RBAC handles authorization gates)
  return NextResponse.next();
}

export { proxy as middleware };
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
