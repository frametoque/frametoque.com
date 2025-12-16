import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ONLY these routes need auth
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
]);

const getDomain = () => {
  if (process.env.NODE_ENV === "production") {
    return "frametoque.online";
  }
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
  ) {
    return "frame-toque.vercel.app";
  }
  return "localhost";
};

export default clerkMiddleware(
  async (auth, req) => {
    // Protect ONLY dashboard routes
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,

    domain: getDomain(),

    signInUrl: "/login",
    signUpUrl: "/login",

    allowedRedirectOrigins: [
      "http://localhost:3000",
      "https://localhost:3000",
      "https://frame-toque.vercel.app",
      "https://frametoque.online",
      "https://www.frametoque.online",
    ],
  }
);

export const config = {
  matcher: [
    // run middleware everywhere (needed for Clerk)
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
