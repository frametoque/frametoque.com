import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSystemLogs, logSystemAction, clearSystemLogs } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isAdmin = user?.publicMetadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await getSystemLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isAdmin = user?.publicMetadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { task } = await request.json();
    if (!task) {
      return NextResponse.json({ error: "Task description is required" }, { status: 400 });
    }

    await logSystemAction(task);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging system action via API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log action" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isAdmin = user?.publicMetadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cleared = await clearSystemLogs();
    if (cleared) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Failed to clear logs" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error clearing logs via API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear logs" },
      { status: 500 }
    );
  }
}
