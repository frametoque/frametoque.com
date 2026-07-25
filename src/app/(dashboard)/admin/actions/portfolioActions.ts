"use server";

import sql from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { imageSize } from "image-size";
import { put } from "@vercel/blob";
import { headers } from "next/headers";

// Mapping category slugs to table names
const TABLE_MAP: Record<string, string> = {
  "web-dev": "work_web",
  "graphic-design": "work_graphics",
  "video-editing": "work_videoediting",
  "videography": "work_videography",
  "photography": "work_photography"
};

/**
 * Fetch portfolio items for a specific category
 */
export async function getPortfolioByCategory(categorySlug: string) {
  if (categorySlug === "photography") {
    const rows = await sql.query(
      `SELECT p.id, e.id as event_id, e.event_name, p.src, p.width, p.height, p.sort_order, e.sort_order as event_sort_order
       FROM work_photography_events e
       JOIN work_photography_photos p ON p.event_id = e.id
       ORDER BY e.sort_order ASC, p.sort_order ASC, p.id ASC`
    );
    return rows;
  }

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  const rows = await sql.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
  return rows;
}

/**
 * Create a new portfolio item under a specific category
 */
export async function createPortfolioItem(categorySlug: string, data: any) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  if (categorySlug === "web-dev") {
    await sql.query(`UPDATE work_web SET sort_order = sort_order + 1`);
    await sql.query(
      `INSERT INTO work_web (domain, image_path, title, description, techs, url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [
        data.domain,
        data.image_path,
        data.title,
        data.description,
        data.techs || [],
        data.url
      ]
    );
  } else if (categorySlug === "graphic-design") {
    await sql.query(`UPDATE work_graphics SET sort_order = sort_order + 1`);
    await sql.query(
      `INSERT INTO work_graphics (image_path, sort_order)
       VALUES ($1, 1)`,
      [data.image_path]
    );
  } else if (categorySlug === "video-editing" || categorySlug === "videography") {
    await sql.query(`UPDATE ${table} SET sort_order = sort_order + 1`);
    await sql.query(
      `INSERT INTO ${table} (url, sort_order)
       VALUES ($1, 1)`,
      [data.url]
    );
  } else if (categorySlug === "photography") {
    // 1. Shift event sort orders
    await sql.query(`UPDATE work_photography_events SET sort_order = sort_order + 1`);
    
    // 2. Insert event if it doesn't exist
    await sql.query(
      `INSERT INTO work_photography_events (event_name, sort_order)
       VALUES ($1, 1)
       ON CONFLICT (event_name) DO NOTHING`,
      [data.event_name]
    );
    
    // Fetch event ID
    const eventRes = await sql.query(
      `SELECT id FROM work_photography_events WHERE event_name = $1`,
      [data.event_name]
    );
    const eventId = eventRes[0].id;
    
    // 3. Shift photo sort orders for this event
    await sql.query(
      `UPDATE work_photography_photos SET sort_order = sort_order + 1 WHERE event_id = $1`,
      [eventId]
    );
    
    // 4. Insert photo at the top
    await sql.query(
      `INSERT INTO work_photography_photos (event_id, src, width, height, sort_order)
       VALUES ($1, $2, $3, $4, 1)`,
      [
        eventId,
        data.src,
        parseInt(data.width) || 0,
        parseInt(data.height) || 0
      ]
    );
  }
}

/**
 * Update an existing portfolio item in a specific category
 */
export async function updatePortfolioItem(categorySlug: string, id: number, data: any) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  if (categorySlug === "web-dev") {
    await sql.query(
      `UPDATE work_web
       SET domain = $1, image_path = $2, title = $3, description = $4, techs = $5, url = $6
       WHERE id = $7`,
      [
        data.domain,
        data.image_path,
        data.title,
        data.description,
        data.techs || [],
        data.url,
        id
      ]
    );
  } else if (categorySlug === "graphic-design") {
    await sql.query(
      `UPDATE work_graphics
       SET image_path = $1
       WHERE id = $2`,
      [data.image_path, id]
    );
  } else if (categorySlug === "video-editing" || categorySlug === "videography") {
    await sql.query(
      `UPDATE ${table}
       SET url = $1
       WHERE id = $2`,
      [data.url, id]
    );
  } else if (categorySlug === "photography") {
    await sql.query(
      `INSERT INTO work_photography_events (event_name)
       VALUES ($1)
       ON CONFLICT (event_name) DO NOTHING`,
      [data.event_name]
    );
    const eventRes = await sql.query(
      `SELECT id FROM work_photography_events WHERE event_name = $1`,
      [data.event_name]
    );
    const eventId = eventRes[0].id;
    await sql.query(
      `UPDATE work_photography_photos
       SET event_id = $1, src = $2, width = $3, height = $4
       WHERE id = $5`,
      [
        eventId,
        data.src,
        parseInt(data.width) || 0,
        parseInt(data.height) || 0,
        id
      ]
    );
  }
}

/**
 * Delete a portfolio item from a specific category
 */
export async function deletePortfolioItem(categorySlug: string, id: number) {
  if (categorySlug === "photography") {
    // 1. Fetch event_id and src first before deleting photo
    const photoRes = await sql.query(`SELECT event_id, src FROM work_photography_photos WHERE id = $1`, [id]);
    if (photoRes.length === 0) return;

    const eventId = photoRes[0].event_id;
    const src = photoRes[0].src;

    // 2. Physically delete the photo file from disk if it exists
    if (src) {
      const relativePath = decodeURIComponent(src);
      const cleanedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\))+/, '');
      const absoluteFilePath = path.join(process.cwd(), "public", cleanedPath);
      try {
        await fs.unlink(absoluteFilePath);
        console.log(`Physically deleted photo file: ${absoluteFilePath}`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to delete physical file ${absoluteFilePath}:`, err);
        }
      }
    }

    // 3. Delete the photo row from database
    await sql.query(`DELETE FROM work_photography_photos WHERE id = $1`, [id]);
    
    // 4. Check if the event now has 0 photos remaining, if so delete the event and its folder
    const countRes = await sql.query(`SELECT COUNT(*) as count FROM work_photography_photos WHERE event_id = $1`, [eventId]);
    if (parseInt(countRes[0].count) === 0) {
      const eventRes = await sql.query(`SELECT event_name FROM work_photography_events WHERE id = $1`, [eventId]);
      if (eventRes.length > 0) {
        const eventName = eventRes[0].event_name;
        // Delete the event row from database
        await sql.query(`DELETE FROM work_photography_events WHERE id = $1`, [eventId]);
        
        // Delete the event's physical directory from disk
        if (eventName) {
          const cleanEventName = eventName.trim();
          const eventDirPath = path.join(process.cwd(), "public", "projects", "photography", cleanEventName);
          try {
            await fs.rm(eventDirPath, { recursive: true, force: true });
            console.log(`Physically deleted event directory: ${eventDirPath}`);
          } catch (err: any) {
            console.error(`Failed to delete event directory ${eventDirPath}:`, err);
          }
        }
      }
    }
    return;
  }

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Swap sort_order between two adjacent portfolio items (for reordering)
 */
export async function reorderPortfolioItems(
  categorySlug: string,
  idA: number,
  idB: number
) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  // Fetch both current sort_orders
  const res = await sql.query(
    `SELECT id, sort_order FROM ${table} WHERE id = ANY($1)`,
    [[idA, idB]]
  );
  if (res.length < 2) throw new Error("Could not find both items to reorder");

  const rowA = res.find((r: any) => r.id === idA);
  const rowB = res.find((r: any) => r.id === idB);

  // Swap their sort_order values
  await sql.query(
    `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
    [rowB.sort_order, idA]
  );
  await sql.query(
    `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
    [rowA.sort_order, idB]
  );
}

/**
 * Batch-assign sort_order 1,2,3... based on the provided id order.
 * Used when saving a drag-and-drop reorder session.
 */
export async function reorderPortfolioItemsBatch(
  categorySlug: string,
  orderedIds: number[]
) {
  if (categorySlug === "photography") {
    for (let i = 0; i < orderedIds.length; i++) {
      await sql.query(
        `UPDATE work_photography_events SET sort_order = $1 WHERE id = $2`,
        [i + 1, orderedIds[i]]
      );
    }
    return;
  }

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await sql.query(
      `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
      [i + 1, orderedIds[i]]
    );
  }
}

/**
 * Upload portfolio media files
 */
export async function uploadPortfolioMedia(formData: FormData, categorySlug?: string): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const cleanFilename = file.name.replace(/\s+/g, "_");
  const filename = categorySlug === "web-dev" 
    ? `projects/web/${Date.now()}-${cleanFilename}`
    : `uploads/portfolio/${Date.now()}-${cleanFilename}`;

  const blob = await put(filename, file, {
    access: "public",
  });

  return blob.url;
}

/**
 * Download portfolio media files from an external URL or internal route and save them to Vercel Blob
 */
export async function uploadPortfolioMediaFromUrl(url: string): Promise<string> {
  if (!url) {
    throw new Error("No URL provided");
  }

  let fetchUrl = url;
  if (url.startsWith("/")) {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    fetchUrl = `${protocol}://${host}${url}`;
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const filename = `projects/web/${Date.now()}-screenshot.png`;

  const uploadedBlob = await put(filename, blob, {
    access: "public",
  });

  return uploadedBlob.url;
}

/**
 * Upload portfolio media files and detect their dimensions automatically.
 */
export async function uploadPortfolioMediaWithDimensions(
  formData: FormData,
  eventName?: string
): Promise<{ url: string; width: number; height: number }> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeFilename = file.name.replace(/\s+/g, "_");

  let filename: string;
  if (eventName) {
    const safeEvent = eventName
      .trim()
      .replace(/[^a-zA-Z0-9 '_\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    filename = `projects/photography/${safeEvent}/${Date.now()}-${safeFilename}`;
  } else {
    filename = `uploads/portfolio/${Date.now()}-${safeFilename}`;
  }

  const blob = await put(filename, buffer, {
    access: "public",
  });

  let width = 1200;
  let height = 800;
  try {
    const dimensions = imageSize(buffer);
    if (dimensions.width && dimensions.height) {
      width = dimensions.width;
      height = dimensions.height;
    }
  } catch (err) {
    console.error("Failed to parse image dimensions, using defaults:", err);
  }

  return { url: blob.url, width, height };
}
