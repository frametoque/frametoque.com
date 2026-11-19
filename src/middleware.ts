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
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
    if (role?.toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden: Administrator access required" }, { status: 403 });
    }
    return;
  }

  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      // No authenticated user — redirect to login page
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isAdminRoute(req)) {
      const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

      if (role !== "admin") {
        // Logged in, but not an admin — send them to their own dashboard
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