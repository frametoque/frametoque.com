import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/dashboard(.*)"]);
const isPublicRoute = createRouteMatcher(["/api/health", "/api/payments/webhook(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  // Enforce API-level admin protection
  if (isAdminApiRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    const claims = sessionClaims as Record<string, any> | undefined;
    const role = (
      (claims?.metadata as { role?: string } | undefined)?.role ||
      (claims?.publicMetadata as { role?: string } | undefined)?.role ||
      (claims?.public_metadata as { role?: string } | undefined)?.role ||
      claims?.role
    )?.toLowerCase();

    if (role && role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrator access required" }, { status: 403 });
    }
    return;
  }

  if (isProtectedRoute(req)) {
    const { userId, sessionClaims, redirectToSignIn } = await auth();

    if (!userId) {
      // Preserve original destination URL and retain Clerk handshake headers
      if (typeof redirectToSignIn === "function") {
        return redirectToSignIn({ returnBackUrl: req.url });
      }
      const loginUrl = new URL("/login", req.url);
      const returnPath = req.nextUrl.pathname + req.nextUrl.search;
      if (returnPath && returnPath !== "/login") {
        loginUrl.searchParams.set("redirect_url", returnPath);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute(req)) {
      const claims = sessionClaims as Record<string, any> | undefined;
      const role = (
        (claims?.metadata as { role?: string } | undefined)?.role ||
        (claims?.publicMetadata as { role?: string } | undefined)?.role ||
        (claims?.public_metadata as { role?: string } | undefined)?.role ||
        claims?.role
      )?.toLowerCase();

      // Only redirect if role is explicitly present and NOT admin.
      // If role is omitted from the JWT session claims, allow request to proceed so
      // server-side requireAdminSession() can verify via clerkClient without false-positive lockouts.
      if (role && role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};