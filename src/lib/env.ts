/**
 * Startup Environment Variable Validation.
 * Fails fast on production startup if critical configuration is missing.
 */

const REQUIRED_PRODUCTION_VARS = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

export function validateEnvironment(): void {
  // Only enforce strict validation in production runtime
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing: string[] = [];

  for (const varName of REQUIRED_PRODUCTION_VARS) {
    if (!process.env[varName] || process.env[varName]?.trim() === "") {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[FATAL] Missing required production environment variables: ${missing.join(", ")}. Please configure them in your environment.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

