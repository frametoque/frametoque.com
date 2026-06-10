import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Protect `/admin` and `/dashboard` routes
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // No authenticated user — redirect to login page
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|public/).*)",
    "/(api|trpc)(.*)",
  ],
};