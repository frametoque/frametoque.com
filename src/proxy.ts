import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// DEV: auth disabled for UI editing — re-enable when done
// const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // DEV: commented out so all routes are public
  // if (isProtectedRoute(req)) {
  //   await auth.protect();
  // }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
    "/(api|trpc)(.*)",
  ],
};