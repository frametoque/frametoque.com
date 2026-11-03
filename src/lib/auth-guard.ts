import { auth, clerkClient } from "@clerk/nextjs/server";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export interface UserSession {
  userId: string;
  email: string | null;
  role: string | null;
  isAdmin: boolean;
}

/**
 * Retrieves the current session user, checking sessionClaims first for minimal latency.
 */
export async function getSessionUser(): Promise<UserSession | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = (sessionClaims?.metadata as Record<string, unknown> | undefined) || {};
  let role = (metadata?.role as string) || null;

  let email = ((sessionClaims as any)?.email || (sessionClaims as any)?.primary_email || null) as string | null;

  // Fallback to clerkClient if metadata or email isn't in sessionClaims token
  if (!role || !email) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      if (!role) {
        role = (user.publicMetadata?.role as string) || null;
      }
      if (!email && user.emailAddresses?.length) {
        email = user.emailAddresses[0]?.emailAddress || null;
      }
    } catch (e) {
      console.error("[auth-guard] Error fetching user metadata from Clerk:", e);
    }
  }

  const isAdmin = role?.toLowerCase() === "admin";
  return { userId, email, role, isAdmin };
}

/**
 * Enforces that the caller is an authenticated Administrator.
 * Throws AuthError if unauthenticated or unauthorized.
 */
export async function requireAdminSession(): Promise<UserSession> {
  const session = await getSessionUser();
  if (!session) {
    throw new AuthError("Unauthorized: Authentication required", 401);
  }
  if (!session.isAdmin) {
    throw new AuthError("Forbidden: Administrator access required", 403);
  }
  return session;
}

/**
 * Enforces authenticated user session. If targetEmail is provided and user is not admin,
 * strictly enforces that targetEmail matches the session's verified email.
 */
export async function requireUserSession(targetEmail?: string | null): Promise<UserSession> {
  const session = await getSessionUser();
  if (!session) {
    throw new AuthError("Unauthorized: Authentication required", 401);
  }
  if (targetEmail && !session.isAdmin) {
    if (!session.email || session.email.toLowerCase().trim() !== targetEmail.toLowerCase().trim()) {
      throw new AuthError("Forbidden: You do not have permission to access another user's resources", 403);
    }
  }
  return session;
}

