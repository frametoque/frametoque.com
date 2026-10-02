import sql from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function getDashboardStats() {
  // 1. SECURITY: Always check auth inside the data fetcher if it's sensitive!
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // 2. SPEED: Direct DB query using React Server Components.
  // This runs on the server, avoiding HTTP overhead.
  
  // NOTE: This is an example query. Replace with actual queries from your monolithic actions.
  const usersCountPromise = sql`SELECT count(*) FROM users`;
  const revenuePromise = sql`SELECT sum(amount) FROM invoices WHERE status = 'paid'`;

  // 3. SPEED: Run independent queries in parallel
  const [usersCount, revenue] = await Promise.all([usersCountPromise, revenuePromise]);

  return {
    users: parseInt(usersCount[0]?.count || "0"),
    revenue: parseFloat(revenue[0]?.sum || "0")
  };
}
