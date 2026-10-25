"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { isR2Configured, isVercelBlobConfigured } from "@/lib/storage";
import { migrateVercelBlobToR2, type MigrationOptions } from "@/lib/migrate-blob-to-r2";

export async function getStorageStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  if (user?.publicMetadata?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return {
    vercelBlobConfigured: isVercelBlobConfigured(),
    r2Configured: isR2Configured(),
    r2BucketName: process.env.R2_BUCKET_NAME || null,
    r2PublicUrl: process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || null,
  };
}

export async function runStorageMigration(options: MigrationOptions = {}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  if (user?.publicMetadata?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return await migrateVercelBlobToR2(options);
}
