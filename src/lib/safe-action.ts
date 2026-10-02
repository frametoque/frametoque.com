import { auth } from "@clerk/nextjs/server";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * A wrapper for Server Actions to ensure they are authenticated.
 * This makes your mutations MUCH more secure.
 */
export async function secureAction<T, Args extends any[]>(
  action: (userId: string, ...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> {
  const { userId } = await auth();

  if (!userId) {
    throw new ActionError("Unauthorized: You must be logged in to perform this action.");
  }

  // Optional: You can also add role checks here (e.g., if user is an admin)
  // const user = await clerkClient.users.getUser(userId);
  // if (user.publicMetadata.role !== 'admin') throw new ActionError("Forbidden");

  try {
    return await action(userId, ...args);
  } catch (error) {
    if (error instanceof ActionError) {
      throw error;
    }
    console.error("Action Error:", error);
    throw new Error("An unexpected error occurred.");
  }
}
