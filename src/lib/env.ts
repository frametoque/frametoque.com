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
  // Skip during build-time page data collection so CI builds succeed without runtime secrets
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const missing: string[] = [];

  for (const varName of REQUIRED_PRODUCTION_VARS) {
    if (!process.env[varName] || process.env[varName]?.trim() === "") {
      missing.push(varName);
    }
  }

  // Validate Field Vault Encryption Key
  if (!process.env.APP_FIELD_ENCRYPTION_KEY?.trim() && !process.env.CREDENTIALS_ENCRYPTION_KEY?.trim()) {
    missing.push("APP_FIELD_ENCRYPTION_KEY (or CREDENTIALS_ENCRYPTION_KEY)");
  }

  if (missing.length > 0) {
    const errorMsg = `[FATAL] Missing required production environment variables: ${missing.join(", ")}. Please configure them in your environment.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

