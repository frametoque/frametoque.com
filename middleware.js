import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login",  
  "/sso-callback",
  "/api/webhooks(.*)",
]);

const getDomain = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'frametoque.online';
  }
  if (process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
    return 'frame-toque.vercel.app';
  }
  return 'localhost';
};

export default clerkMiddleware(async (auth, req) => {
 
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
}, {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  
  domain: getDomain(),
  
  signInUrl: '/login',
  signUpUrl: '/login',  
  
  allowedRedirectOrigins: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://frame-toque.vercel.app',
    'https://frametoque.online',
    'https://www.frametoque.online' 
  ]
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};