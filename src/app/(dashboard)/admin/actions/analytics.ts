"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";

import * as shared from "./analytics-shared";

export async function getAnalyticsData(dateRange = "all time") {
  await requireAdminSession();
  return shared.getAnalyticsData(dateRange);
}

export async function getActiveVisitors() {
  await requireAdminSession();
  return shared.getActiveVisitors();
}

export async function getActiveVisitors30m() {
  await requireAdminSession();
  return shared.getActiveVisitors30m();
}

export async function getChartData(zoomLevel: string) {
  await requireAdminSession();
  return shared.getChartData(zoomLevel);
}