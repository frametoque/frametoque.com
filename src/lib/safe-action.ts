import { requireUserSession, requireAdminSession, AuthError } from "@/lib/auth-guard";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * A wrapper for Server Actions to ensure they are authenticated.
 */
export async function secureAction<T, Args extends any[]>(
  action: (userId: string, ...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> {
  try {
    const session = await requireUserSession();
    return await action(session.userId, ...args);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new ActionError(error.message);
    }
    if (error instanceof ActionError) {
      throw error;
    }
    console.error("Action Error:", error);
    throw new Error("An unexpected error occurred.");
  }
}

/**
 * A wrapper for Admin Server Actions to ensure they are executed strictly by an administrator.
 */
export async function secureAdminAction<T, Args extends any[]>(
  action: (userId: string, ...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> {
  try {
    const session = await requireAdminSession();
    return await action(session.userId, ...args);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new ActionError(error.message);
    }
    if (error instanceof ActionError) {
      throw error;
    }
    console.error("Admin Action Error:", error);
    throw new Error("An unexpected error occurred.");
  }
}
