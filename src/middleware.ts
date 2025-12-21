import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  return undefined;
};

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    ...(getDomain() ? { domain: getDomain() } : {}),
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
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
    "/(api|trpc)(.*)",
  ],
};