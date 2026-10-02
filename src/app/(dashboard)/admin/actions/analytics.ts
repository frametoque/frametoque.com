"use server";
import { auth } from "@clerk/nextjs/server";

import * as shared from "./analytics-shared";

export async function getAnalyticsData(dateRange = "all time") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return shared.getAnalyticsData(dateRange);
}

export async function getActiveVisitors() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return shared.getActiveVisitors();
}

export async function getActiveVisitors30m() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return shared.getActiveVisitors30m();
}

export async function getChartData(zoomLevel: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return shared.getChartData(zoomLevel);
}