import { NextRequest, NextResponse } from "next/server";
import { getServiceCards } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const arm = searchParams.get("arm");

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const cards = await getServiceCards(category, arm || undefined);
  return NextResponse.json(cards);
}