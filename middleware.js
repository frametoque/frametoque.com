import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes - ADD YOUR LOGIN PAGE HERE
const isPublicRoute = createRouteMatcher([
  "/",
  "/login",  // Make sure your custom login page is public
  "/signin",
  "/signup", 
  "/sso-callback",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
}, {
  // ADD THESE OPTIONS to fix your redirect issue:
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  // Explicitly set your Vercel domain:
  domain: process.env.NODE_ENV === 'production' ? 'frame-toque.vercel.app' : 'localhost',
  // Force Clerk to use your custom pages:
  signInUrl: '/login',  // This tells Clerk to use YOUR /login page, not theirs
  signUpUrl: '/signup',
  // Allow Clerk to work with your Vercel domain:
  allowedRedirectOrigins: [
    'http://localhost:3000',
    'https://frame-toque.vercel.app'
  ]
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};