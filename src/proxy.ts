import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
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
    "/((?!_next/static|_next/image|_next/data|favicon.ico|public/).*)",
    "/(api|trpc)(.*)",
  ],
};