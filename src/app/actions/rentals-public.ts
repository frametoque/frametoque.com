"use server";

import sql from "@/lib/db";
import { slugify, isUUID } from "@/lib/slugify";

export interface PublicRentalProduct {
  id: string;
  slug: string;
  item_name: string;
  category: string;
  daily_rate: number;
  image_url: string | null;
  images: string[];
  description: string | null;
  item_condition: string;
  status: string;
  is_currently_out: boolean;
  quantity: number;
}

export interface BookedDateRange {
  start_date: string;
  end_date: string;
}

export async function getPublicRentals(params?: {
  search?: string;
  category?: string;
  sort?: "price-asc" | "price-desc" | "name" | "popular";
}): Promise<PublicRentalProduct[]> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const rows = await sql`
      SELECT 
        i.id,
        i.item_name,
        i.category,
        COALESCE(i.rental_price_per_day, 0) as rental_price_per_day,
        i.image_url,
        i.images,
        i.description,
        COALESCE(i.item_condition, 'Brand New') as item_condition,
        COALESCE(i.status, 'Available') as status,
        COALESCE(i.quantity, 1) as quantity,
        EXISTS (
          SELECT 1 
          FROM admin_rentals r
          WHERE r.inventory_id = i.id
            AND r.status IN ('Active', 'Reserved', 'Overdue')
            AND (r.return_date IS NULL OR r.return_date > ${todayStr}::date)
            AND r.start_date <= ${todayStr}::date
            AND r.end_date >= ${todayStr}::date
        ) as is_currently_out
      FROM admin_inventory i
      WHERE COALESCE(i.available_for_rent, false) = true
        AND COALESCE(i.is_to_buy, false) = false
        AND COALESCE(i.status, 'Available') NOT IN ('Disposed', 'Retired', 'Sold')
      ORDER BY 
        CASE WHEN ${params?.sort === "price-asc"} THEN i.rental_price_per_day END ASC,
        CASE WHEN ${params?.sort === "price-desc"} THEN i.rental_price_per_day END DESC,
        i.item_name ASC
    `;

    let filtered = rows.map((r: any) => {
      let parsedImages: string[] = [];
      if (r.images) {
        try {
          const parsed = JSON.parse(r.images);
          if (Array.isArray(parsed)) parsedImages = parsed;
        } catch {
          parsedImages = String(r.images).split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (r.image_url && !parsedImages.includes(r.image_url)) {
        parsedImages.unshift(r.image_url);
      }

      return {
        id: String(r.id),
        slug: slugify(r.item_name) || String(r.id),
        item_name: r.item_name,
        category: r.category || "Equipment",
        daily_rate: parseFloat(r.rental_price_per_day || "0"),
        image_url: r.image_url || parsedImages[0] || null,
        images: parsedImages,
        description: r.description || null,
        item_condition: r.item_condition || "Brand New",
        status: r.status || "Available",
        is_currently_out: Boolean(r.is_currently_out),
        quantity: parseInt(r.quantity || "1", 10),
      };
    });

    if (params?.category && params.category !== "All") {
      const targetCat = params.category.toLowerCase().trim();
      filtered = filtered.filter((item: any) => {
        const itemCats = item.category.toLowerCase().split(",").map((c: string) => c.trim());
        return itemCats.some((c: string) => c === targetCat || c.includes(targetCat) || targetCat.includes(c));
      });
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (item: any) =>
          item.item_name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }

    return filtered;
  } catch (err) {
    console.error("Failed to fetch public rentals:", err);
    return [];
  }
}

export async function getPublicRentalItemById(idOrSlug: string): Promise<{
  product: PublicRentalProduct | null;
  bookedRanges: BookedDateRange[];
}> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const cleanParam = decodeURIComponent(idOrSlug || "").trim();

    let rows: any[] = [];

    if (isUUID(cleanParam)) {
      rows = await sql`
        SELECT 
          i.id,
          i.item_name,
          i.category,
          COALESCE(i.rental_price_per_day, 0) as rental_price_per_day,
          i.image_url,
          i.images,
          i.description,
          COALESCE(i.item_condition, 'Brand New') as item_condition,
          COALESCE(i.status, 'Available') as status,
          COALESCE(i.quantity, 1) as quantity,
          EXISTS (
            SELECT 1 
            FROM admin_rentals r
            WHERE r.inventory_id = i.id
              AND r.status IN ('Active', 'Reserved', 'Overdue')
              AND (r.return_date IS NULL OR r.return_date > ${todayStr}::date)
              AND r.start_date <= ${todayStr}::date
              AND r.end_date >= ${todayStr}::date
          ) as is_currently_out
        FROM admin_inventory i
        WHERE i.id = ${cleanParam}::uuid
          AND COALESCE(i.available_for_rent, false) = true
        LIMIT 1
      `;
    } else {
      // Find all rentable items and match by slug
      const allRows = await sql`
        SELECT 
          i.id,
          i.item_name,
          i.category,
          COALESCE(i.rental_price_per_day, 0) as rental_price_per_day,
          i.image_url,
          i.images,
          i.description,
          COALESCE(i.item_condition, 'Brand New') as item_condition,
          COALESCE(i.status, 'Available') as status,
          COALESCE(i.quantity, 1) as quantity,
          EXISTS (
            SELECT 1 
            FROM admin_rentals r
            WHERE r.inventory_id = i.id
              AND r.status IN ('Active', 'Reserved', 'Overdue')
              AND (r.return_date IS NULL OR r.return_date > ${todayStr}::date)
              AND r.start_date <= ${todayStr}::date
              AND r.end_date >= ${todayStr}::date
          ) as is_currently_out
        FROM admin_inventory i
        WHERE COALESCE(i.available_for_rent, false) = true
          AND COALESCE(i.is_to_buy, false) = false
          AND COALESCE(i.status, 'Available') NOT IN ('Disposed', 'Retired', 'Sold')
      `;

      const targetSlug = cleanParam.toLowerCase();
      const matched = allRows.find((r: any) => {
        const itemSlug = slugify(r.item_name);
        if (itemSlug === targetSlug) return true;
        // Also support partial/exact clean name match
        const alphaOnlyItem = r.item_name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const alphaOnlyTarget = targetSlug.replace(/[^a-z0-9]/g, "");
        return alphaOnlyItem === alphaOnlyTarget;
      });

      if (matched) {
        rows = [matched];
      }
    }

    if (rows.length === 0) {
      return { product: null, bookedRanges: [] };
    }

    const r = rows[0];
    let parsedImages: string[] = [];
    if (r.images) {
      try {
        const parsed = JSON.parse(r.images);
        if (Array.isArray(parsed)) parsedImages = parsed;
      } catch {
        parsedImages = String(r.images).split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (r.image_url && !parsedImages.includes(r.image_url)) {
      parsedImages.unshift(r.image_url);
    }

    const product: PublicRentalProduct = {
      id: String(r.id),
      slug: slugify(r.item_name) || String(r.id),
      item_name: r.item_name,
      category: r.category || "Equipment",
      daily_rate: parseFloat(r.rental_price_per_day || "0"),
      image_url: r.image_url || parsedImages[0] || null,
      images: parsedImages,
      description: r.description || null,
      item_condition: r.item_condition || "Brand New",
      status: r.status || "Available",
      is_currently_out: Boolean(r.is_currently_out),
      quantity: parseInt(r.quantity || "1", 10),
    };

    // Get upcoming booked date ranges (next 90 days)
    const bookings = await sql`
      SELECT 
        start_date,
        end_date
      FROM admin_rentals
      WHERE inventory_id = ${r.id}::uuid
        AND status IN ('Active', 'Reserved', 'Overdue')
        AND (return_date IS NULL OR return_date >= ${todayStr}::date)
        AND end_date >= ${todayStr}::date
      ORDER BY start_date ASC
      LIMIT 50
    `;

    const bookedRanges: BookedDateRange[] = bookings.map((b: any) => ({
      start_date: new Date(b.start_date).toISOString().split("T")[0],
      end_date: new Date(b.end_date).toISOString().split("T")[0],
    }));

    return { product, bookedRanges };
  } catch (err) {
    console.error("Failed to get public rental item by id:", err);
    return { product: null, bookedRanges: [] };
  }
}

export async function checkPublicAvailability(params: {
  inventory_id: string;
  start_date: string;
  end_date?: string;
}): Promise<{
  available: boolean;
  message: string;
  requestedDates: {
    start_date: string;
    end_date: string;
    totalDays: number;
  };
  daily_rate?: number;
  estimatedTotal?: number;
}> {
  try {
    const startDate = params.start_date;
    const endDate = params.end_date || params.start_date;

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffTime = Math.max(0, endObj.getTime() - startObj.getTime());
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // Verify item exists and check rate
    const itemRows = await sql`
      SELECT id, item_name, rental_price_per_day, available_for_rent, status
      FROM admin_inventory
      WHERE id = ${params.inventory_id}::uuid
      LIMIT 1
    `;

    if (itemRows.length === 0 || !itemRows[0].available_for_rent) {
      return {
        available: false,
        message: "This equipment is currently not available for rent.",
        requestedDates: { start_date: startDate, end_date: endDate, totalDays },
      };
    }

    const item = itemRows[0];
    const dailyRate = parseFloat(item.rental_price_per_day || "0");
    const estimatedTotal = dailyRate * totalDays;

    if (item.status === "Maintenance" || item.status === "Damaged") {
      return {
        available: false,
        message: `This equipment is temporarily unavailable due to scheduled maintenance.`,
        requestedDates: { start_date: startDate, end_date: endDate, totalDays },
        daily_rate: dailyRate,
        estimatedTotal,
      };
    }

    // Check overlaps in admin_rentals
    const clashes = await sql`
      SELECT id, rental_code, start_date, end_date, status
      FROM admin_rentals
      WHERE inventory_id = ${params.inventory_id}::uuid
        AND status IN ('Active', 'Reserved', 'Overdue')
        AND (return_date IS NULL OR return_date > ${startDate}::date)
        AND start_date <= ${endDate}::date
        AND end_date >= ${startDate}::date
      LIMIT 5
    `;

    if (clashes.length > 0) {
      return {
        available: false,
        message: `Already booked for the selected date(s). Please choose another date or contact our team for alternative gear.`,
        requestedDates: { start_date: startDate, end_date: endDate, totalDays },
        daily_rate: dailyRate,
        estimatedTotal,
      };
    }

    return {
      available: true,
      message: "",
      requestedDates: { start_date: startDate, end_date: endDate, totalDays },
      daily_rate: dailyRate,
      estimatedTotal,
    };
  } catch (err) {
    console.error("Failed to check public rental availability:", err);
    return {
      available: false,
      message: "Could not verify availability right now. Please message us directly on WhatsApp.",
      requestedDates: {
        start_date: params.start_date,
        end_date: params.end_date || params.start_date,
        totalDays: 1,
      },
    };
  }
}

export async function getPublicRentalCategories(): Promise<{ category: string; count: number }[]> {
  try {
    const rows = await sql`
      SELECT category, COUNT(*) as count
      FROM admin_inventory
      WHERE COALESCE(available_for_rent, false) = true
        AND COALESCE(is_to_buy, false) = false
        AND COALESCE(status, 'Available') NOT IN ('Disposed', 'Retired', 'Sold')
      GROUP BY category
      ORDER BY count DESC
    `;

    const catMap = new Map<string, number>();

    rows.forEach((r: any) => {
      const rawCat = r.category || "Equipment";
      const parts = rawCat.split(",").map((c: string) => c.trim()).filter(Boolean);
      parts.forEach((cat: string) => {
        catMap.set(cat, (catMap.get(cat) || 0) + parseInt(r.count, 10));
      });
    });

    const result = Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return result;
  } catch (err) {
    console.error("Failed to get rental categories:", err);
    return [];
  }
}
