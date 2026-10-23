import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.LKR || 300.0;
      return NextResponse.json({ rate });
    }
    return NextResponse.json({ rate: 300.0 });
  } catch (error) {
    return NextResponse.json({ rate: 300.0 });
  }
}
