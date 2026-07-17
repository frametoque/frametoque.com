"use server";

import * as shared from "./analytics-shared";

export async function getAnalyticsData(dateRange = "all time") {
  return shared.getAnalyticsData(dateRange);
}

export async function getActiveVisitors() {
  return shared.getActiveVisitors();
}

export async function getActiveVisitors30m() {
  return shared.getActiveVisitors30m();
}

export async function getChartData(zoomLevel: string) {
  return shared.getChartData(zoomLevel);
}