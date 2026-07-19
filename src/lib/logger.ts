import sql from "@/lib/db";
import { headers } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";

let isTableEnsured = false;

export async function ensureSystemLogsTable() {
  if (isTableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_system_logs (
        id SERIAL PRIMARY KEY,
        task VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        device_ip VARCHAR(100),
        device_os VARCHAR(100),
        device_type VARCHAR(100),
        user_email VARCHAR(255)
      )
    `;
    isTableEnsured = true;
  } catch (err) {
    console.error("Migration error for system logs table:", err);
  }
}

export async function logSystemAction(task: string) {
  try {
    // Ensure table exists (cached)
    await ensureSystemLogsTable();

    // Get headers info
    const headersList = await headers();
    const ua = headersList.get("user-agent") || "";
    const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || 
               headersList.get("x-real-ip") || 
               "127.0.0.1";

    let os = "Unknown OS";
    let device = "Desktop";
    let type = "Web Browser";

    if (ua) {
      // OS Detection
      if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
      else if (ua.includes("iPhone")) { os = "iOS"; device = "Mobile"; }
      else if (ua.includes("iPad")) { os = "iOS (iPad)"; device = "Tablet"; }
      else if (ua.includes("Android")) { os = "Android"; device = "Mobile"; }
      else if (ua.includes("Linux")) os = "Linux";

      // Device Type Detection
      if (ua.includes("Mobi") || ua.includes("Phone")) {
        device = "Mobile";
      } else if (ua.includes("Tablet") || ua.includes("iPad")) {
        device = "Tablet";
      }

      // Browser/Client Type Detection
      if (ua.includes("Firefox")) type = "Firefox";
      else if (ua.includes("Chrome") && !ua.includes("Chromium")) type = "Chrome";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) type = "Safari";
      else if (ua.includes("Edge")) type = "Edge";
      else if (ua.includes("Postman")) type = "Postman";
      else if (ua.includes("curl")) type = "Curl";
    }

    // Get user details (optimized to use session claims first to avoid Clerk API call overhead)
    let userEmail = "System / Anonymous";
    try {
      const { userId, sessionClaims } = await auth();
      if (userId) {
        const emailClaim = (sessionClaims as any)?.email || (sessionClaims as any)?.primary_email;
        if (emailClaim) {
          userEmail = emailClaim;
        } else {
          const clerk = await clerkClient();
          const user = await clerk.users.getUser(userId);
          userEmail = user?.emailAddresses[0]?.emailAddress || userEmail;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve Clerk user details for logger:", e);
    }

    await sql`
      INSERT INTO admin_system_logs (task, device_ip, device_os, device_type, user_email)
      VALUES (${task}, ${ip}, ${os}, ${device === "Desktop" ? type : `${device} (${type})`}, ${userEmail})
    `;
  } catch (error) {
    console.error("Failed to log system action:", error);
  }
}

export async function getSystemLogs() {
  await ensureSystemLogsTable();
  try {
    // Auto-delete logs older than 3 months
    await sql`
      DELETE FROM admin_system_logs 
      WHERE timestamp < NOW() - INTERVAL '3 months'
    `;
  } catch (err) {
    console.error("Auto-delete old logs failed:", err);
  }

  try {
    const logs = await sql`
      SELECT id, task, timestamp, device_ip, device_os, device_type, user_email
      FROM admin_system_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    return logs;
  } catch (error) {
    console.error("Failed to fetch system logs:", error);
    return [];
  }
}

export async function clearSystemLogs() {
  await ensureSystemLogsTable();
  try {
    await sql`DELETE FROM admin_system_logs`;
    await logSystemAction("Cleared all system logs");
    return true;
  } catch (error) {
    console.error("Failed to clear system logs:", error);
    return false;
  }
}
