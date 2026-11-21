import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/domains/validation";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  const rate = checkRateLimit(`loc:suggest:${ip}`, 30, 60000); // 30 per min
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const query = rawQuery.trim().substring(0, 100);

  if (!query) {
    return NextResponse.json([]);
  }

  try {
    // Photon API is built on top of OpenStreetMap data and uses Elasticsearch for high quality,
    // fuzzy point-of-interest and address search. It is 100% free and requires no API key.
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=7.8731&lon=80.7718`;
    const response = await fetch(photonUrl);
    if (!response.ok) {
      return NextResponse.json([]);
    }
    const data = await response.json().catch(() => null);

    if (data && Array.isArray(data.features)) {
      const mapped = data.features.map((feature: any) => {
        const props = feature.properties || {};
        const name = props.name || props.street || "Location";

        // Build a detailed display name for the address details
        const addressParts = [
          props.street && props.street !== name ? props.street : null,
          props.city || props.town || props.village || props.district,
          props.state,
          props.country
        ].filter(Boolean);

        const display_name = addressParts.length > 0
          ? `${name}, ${addressParts.join(", ")}`
          : name;

        return {
          name,
          display_name
        };
      });

      return NextResponse.json(mapped);
    }
  } catch (err) {
    console.error("Photon API geocoding error:", err);
  }

  return NextResponse.json([]);
}
