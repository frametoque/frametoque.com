"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";

import sql from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { imageSize } from "image-size";
import { putBlob, deleteBlob } from "@/lib/storage";
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
  await requireAdminSession();

  if (categorySlug === "photography") {
    const rows = await sql.unsafe(
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

  const rows = await sql.unsafe(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
  return rows;
}

/**
 * Create a new portfolio item under a specific category
 */
export async function createPortfolioItem(categorySlug: string, data: any) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  if (categorySlug === "web-dev") {
    await sql.unsafe(`UPDATE work_web SET sort_order = sort_order + 1`);
    await sql.unsafe(
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
    await sql.unsafe(`UPDATE work_graphics SET sort_order = sort_order + 1`);
    await sql.unsafe(
      `INSERT INTO work_graphics (image_path, sort_order)
       VALUES ($1, 1)`,
      [data.image_path]
    );
  } else if (categorySlug === "video-editing" || categorySlug === "videography") {
    await sql.unsafe(`UPDATE ${table} SET sort_order = sort_order + 1`);
    await sql.unsafe(
      `INSERT INTO ${table} (url, sort_order)
       VALUES ($1, 1)`,
      [data.url]
    );
  } else if (categorySlug === "photography") {
    // 1. Shift event sort orders
    await sql.unsafe(`UPDATE work_photography_events SET sort_order = sort_order + 1`);
    
    // 2. Insert event if it doesn't exist
    await sql.unsafe(
      `INSERT INTO work_photography_events (event_name, sort_order)
       VALUES ($1, 1)
       ON CONFLICT (event_name) DO NOTHING`,
      [data.event_name]
    );
    
    // Fetch event ID
    const eventRes = await sql.unsafe(
      `SELECT id FROM work_photography_events WHERE event_name = $1`,
      [data.event_name]
    );
    const eventId = eventRes[0].id;
    
    // 3. Shift photo sort orders for this event
    await sql.unsafe(
      `UPDATE work_photography_photos SET sort_order = sort_order + 1 WHERE event_id = $1`,
      [eventId]
    );
    
    // 4. Insert photo at the top
    await sql.unsafe(
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
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  if (categorySlug === "web-dev") {
    await sql.unsafe(
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
    await sql.unsafe(
      `UPDATE work_graphics
       SET image_path = $1
       WHERE id = $2`,
      [data.image_path, id]
    );
  } else if (categorySlug === "video-editing" || categorySlug === "videography") {
    await sql.unsafe(
      `UPDATE ${table}
       SET url = $1
       WHERE id = $2`,
      [data.url, id]
    );
  } else if (categorySlug === "photography") {
    await sql.unsafe(
      `INSERT INTO work_photography_events (event_name)
       VALUES ($1)
       ON CONFLICT (event_name) DO NOTHING`,
      [data.event_name]
    );
    const eventRes = await sql.unsafe(
      `SELECT id FROM work_photography_events WHERE event_name = $1`,
      [data.event_name]
    );
    const eventId = eventRes[0].id;
    await sql.unsafe(
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
  await requireAdminSession();

  if (categorySlug === "photography") {
    // 1. Fetch event_id and src first before deleting photo
    const photoRes = await sql.unsafe(`SELECT event_id, src FROM work_photography_photos WHERE id = $1`, [id]);
    if (photoRes.length === 0) return;

    const eventId = photoRes[0].event_id;
    const src = photoRes[0].src;

    // 2. Delete photo file from storage CDN if it's a remote URL
    if (src && src.startsWith("http")) {
      try {
        await deleteBlob(src);
        console.log(`Deleted photo from storage CDN: ${src}`);
      } catch (err: any) {
        console.error(`Failed to delete storage CDN file ${src}:`, err);
      }
    } else if (src) {
      // Local file fallback
      const relativePath = decodeURIComponent(src);
      const cleanedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\))+/, '');
      const absoluteFilePath = path.join(process.cwd(), "public", cleanedPath);
      try {
        await fs.unlink(absoluteFilePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to delete local file ${absoluteFilePath}:`, err);
        }
      }
    }

    // 3. Delete the photo row from database
    await sql.unsafe(`DELETE FROM work_photography_photos WHERE id = $1`, [id]);
    
    // 4. Check if the event now has 0 photos remaining, if so delete the event
    const countRes = await sql.unsafe(`SELECT COUNT(*) as count FROM work_photography_photos WHERE event_id = $1`, [eventId]);
    if (parseInt(countRes[0].count) === 0) {
      await sql.unsafe(`DELETE FROM work_photography_events WHERE id = $1`, [eventId]);
    }
    return;
  }

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  // Delete image from Vercel Blob CDN if item has image_path or src
  try {
    const rows = await sql.unsafe(`SELECT image_path, src FROM ${table} WHERE id = $1`, [id]);
    if (rows.length > 0) {
      const url = rows[0].image_path || rows[0].src;
      if (url && url.startsWith("http")) {
        await deleteBlob(url);
      }
    }
  } catch (err) {
    // Ignore if column doesn't exist
  }

  await sql.unsafe(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Swap sort_order between two adjacent portfolio items (for reordering)
 */
export async function reorderPortfolioItems(
  categorySlug: string,
  idA: number,
  idB: number
) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  // Fetch both current sort_orders
  const res = await sql.unsafe(
    `SELECT id, sort_order FROM ${table} WHERE id = ANY($1)`,
    [[idA, idB]]
  );
  if (res.length < 2) throw new Error("Could not find both items to reorder");

  const rowA = res.find((r: any) => r.id === idA);
  const rowB = res.find((r: any) => r.id === idB);

  // Swap their sort_order values
  await sql.unsafe(
    `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
    [rowB.sort_order, idA]
  );
  await sql.unsafe(
    `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
    [rowA.sort_order, idB]
  );
}

/**
 * Batch-assign sort_order 1,2,3... based on the provided id order in a single database query.
 * Used when saving a drag-and-drop reorder session.
 */
export async function reorderPortfolioItemsBatch(
  categorySlug: string,
  orderedIds: number[]
) {
  await requireAdminSession();

  if (!orderedIds || orderedIds.length === 0) return;

  const table = categorySlug === "photography" ? "work_photography_events" : TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid portfolio category: ${categorySlug}`);
  }

  const valuePairs: string[] = [];
  const params: any[] = [];

  orderedIds.forEach((id, index) => {
    const offset = index * 2;
    valuePairs.push(`($${offset + 1}::int, $${offset + 2}::int)`);
    params.push(id, index + 1);
  });

  const query = `
    UPDATE ${table} AS t
    SET sort_order = v.sort_order
    FROM (VALUES ${valuePairs.join(", ")}) AS v(id, sort_order)
    WHERE t.id = v.id
  `;

  await sql.unsafe(query, params);
}

/**
 * Batch-assign sort_order to photos inside a photography event in a single database query.
 */
export async function reorderEventPhotosBatch(orderedPhotoIds: number[]) {
  await requireAdminSession();

  if (!orderedPhotoIds || orderedPhotoIds.length === 0) return;

  const valuePairs: string[] = [];
  const params: any[] = [];

  orderedPhotoIds.forEach((id, index) => {
    const offset = index * 2;
    valuePairs.push(`($${offset + 1}::int, $${offset + 2}::int)`);
    params.push(id, index + 1);
  });

  const query = `
    UPDATE work_photography_photos AS p
    SET sort_order = v.sort_order
    FROM (VALUES ${valuePairs.join(", ")}) AS v(id, sort_order)
    WHERE p.id = v.id
  `;

  await sql.unsafe(query, params);
}

/**
 * Upload portfolio media files
 */
export async function uploadPortfolioMedia(formData: FormData, categorySlug?: string): Promise<string> {
  await requireAdminSession();

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const cleanFilename = file.name.replace(/\s+/g, "_");
  const filename = categorySlug === "web-dev" 
    ? `projects/web/${Date.now()}-${cleanFilename}`
    : `uploads/portfolio/${Date.now()}-${cleanFilename}`;

  const blob = await putBlob(filename, file, {
    access: "public",
  });

  return blob.url;
}

/**
 * Download portfolio media files from an external URL or internal route and save them to Vercel Blob
 */
export async function uploadPortfolioMediaFromUrl(url: string): Promise<string> {
  await requireAdminSession();

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

  const uploadedBlob = await putBlob(filename, blob, {
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
): Promise<{ url: string; width: number; height: number; hash: string; filename: string }> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const originalFilename = file.name;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeFilename = originalFilename.replace(/[^\w.-]/g, "_");

  let filename: string;
  if (eventName) {
    const safeEvent = eventName
      .trim()
      .replace(/[^a-zA-Z0-9 '_\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    filename = `projects/photography/${safeEvent}/${hash.slice(0, 12)}-${safeFilename}`;
  } else {
    filename = `uploads/portfolio/${hash.slice(0, 12)}-${safeFilename}`;
  }

  const blob = await putBlob(filename, buffer, {
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

  return { url: blob.url, width, height, hash, filename: originalFilename };
}

/**
 * Batch insert or update portfolio photos under a photography event.
 * Replaces duplicate photos (matched by same filename or binary content SHA-256 hash) instead of duplicating them.
 */
export async function createBatchPortfolioPhotos(
  eventName: string,
  photos: { src: string; width: number; height: number; hash?: string; filename?: string }[]
) {
  await requireAdminSession();

  if (!photos || photos.length === 0) return;
  const cleanEvent = eventName.trim();

  // 1. Shift event sort orders
  await sql.unsafe(`UPDATE work_photography_events SET sort_order = sort_order + 1`);
  
  // 2. Insert event if it doesn't exist
  await sql.unsafe(
    `INSERT INTO work_photography_events (event_name, sort_order)
     VALUES ($1, 1)
     ON CONFLICT (event_name) DO NOTHING`,
    [cleanEvent]
  );
  
  // Fetch event ID
  const eventRes = await sql.unsafe(
    `SELECT id FROM work_photography_events WHERE event_name = $1`,
    [cleanEvent]
  );
  if (!eventRes || eventRes.length === 0) {
    throw new Error(`Failed to find or create event: ${cleanEvent}`);
  }
  const eventId = eventRes[0].id;

  // Fetch all existing photos for this event
  const existingPhotos = await sql.unsafe(
    `SELECT id, src, original_filename, file_hash FROM work_photography_photos WHERE event_id = $1`,
    [eventId]
  );

  const newPhotos: { src: string; width: number; height: number; hash?: string; filename?: string }[] = [];

  for (const photo of photos) {
    // Look for matching existing photo by filename OR by content hash
    const match = existingPhotos.find((existing: any) => {
      // 1. Check exact original filename match
      if (photo.filename && existing.original_filename) {
        if (existing.original_filename.toLowerCase() === photo.filename.toLowerCase()) {
          return true;
        }
      }
      // 2. Check filename extracted from src URL path
      if (photo.filename && existing.src) {
        const decodedSrc = decodeURIComponent(existing.src);
        const urlBasename = decodedSrc.split('/').pop() || "";
        const cleanBasename = urlBasename.replace(/^[0-9a-fA-F]{12}-/, "").replace(/^\d+-/, "");
        if (cleanBasename.toLowerCase() === photo.filename.toLowerCase()) {
          return true;
        }
      }
      // 3. Check exact binary content hash match
      if (photo.hash && existing.file_hash) {
        if (existing.file_hash === photo.hash) {
          return true;
        }
      }
      return false;
    });

    if (match) {
      // Delete old CDN blob file if a new file URL was uploaded to replace it
      if (match.src && match.src !== photo.src && match.src.startsWith("http")) {
        try {
          await deleteBlob(match.src);
          console.log(`Deleted replaced photo from storage CDN: ${match.src}`);
        } catch (err) {
          console.error(`Failed to delete replaced file ${match.src}:`, err);
        }
      }

      // Duplicate filename or content found! Replace existing photo record with the new upload
      await sql.unsafe(
        `UPDATE work_photography_photos 
         SET src = $1, width = $2, height = $3, original_filename = $4, file_hash = $5 
         WHERE id = $6`,
        [
          photo.src,
          photo.width || 0,
          photo.height || 0,
          photo.filename || match.original_filename || null,
          photo.hash || match.file_hash || null,
          match.id
        ]
      );
    } else {
      newPhotos.push(photo);
    }
  }

  if (newPhotos.length === 0) return;

  // 3. Shift photo sort orders for this event by newPhotos.length
  await sql.unsafe(
    `UPDATE work_photography_photos SET sort_order = sort_order + $1 WHERE event_id = $2`,
    [newPhotos.length, eventId]
  );

  // 4. Batch insert new photos in one query
  const valueStrings: string[] = [];
  const queryParams: any[] = [];

  newPhotos.forEach((photo, idx) => {
    const offset = idx * 7;
    valueStrings.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
    queryParams.push(
      eventId,
      photo.src,
      photo.width || 0,
      photo.height || 0,
      idx + 1,
      photo.hash || null,
      photo.filename || null
    );
  });

  const insertQuery = `INSERT INTO work_photography_photos (event_id, src, width, height, sort_order, file_hash, original_filename) VALUES ${valueStrings.join(", ")}`;
  await sql.unsafe(insertQuery, queryParams);
}

/**
 * Deduplicate existing photos under a photography event.
 * Keeps 1 photo per unique filename/hash and deletes all duplicate files from Vercel Blob CDN and database.
 */
export async function cleanDuplicatesFromEvent(eventName: string): Promise<{ kept: number; deleted: number }> {
  if (!eventName) return { kept: 0, deleted: 0 };
  const cleanEvent = eventName.trim();

  // Find event ID
  const eventRes = await sql.unsafe(
    `SELECT id FROM work_photography_events WHERE LOWER(event_name) = LOWER($1) OR LOWER(event_name) LIKE LOWER($2)`,
    [cleanEvent, `%${cleanEvent}%`]
  );
  if (!eventRes || eventRes.length === 0) return { kept: 0, deleted: 0 };

  const eventId = eventRes[0].id;
  const photos = await sql.unsafe(
    `SELECT id, src, original_filename, file_hash, sort_order FROM work_photography_photos WHERE event_id = $1 ORDER BY id ASC`,
    [eventId]
  );

  if (!photos || photos.length === 0) return { kept: 0, deleted: 0 };

  const seenKeys = new Set<string>();
  const toKeep: any[] = [];
  const toDelete: any[] = [];

  for (const photo of photos) {
    let key = "";
    if (photo.file_hash) {
      key = `hash:${photo.file_hash}`;
    } else if (photo.original_filename) {
      key = `name:${photo.original_filename.toLowerCase()}`;
    } else if (photo.src) {
      const decoded = decodeURIComponent(photo.src);
      const basename = decoded.split('/').pop() || "";
      const cleanName = basename.replace(/^[0-9a-fA-F]{12}-/, "").replace(/^\d+-/, "");
      key = `name:${cleanName.toLowerCase()}`;
    } else {
      key = `id:${photo.id}`;
    }

    if (seenKeys.has(key)) {
      toDelete.push(photo);
    } else {
      seenKeys.add(key);
      toKeep.push(photo);
    }
  }

  let deletedCount = 0;
  for (const photo of toDelete) {
    if (photo.src && photo.src.startsWith("http")) {
      try {
        await deleteBlob(photo.src);
        console.log(`Deduplication: Deleted storage CDN file ${photo.src}`);
      } catch (err) {
        console.error(`Deduplication: Failed to delete file ${photo.src}:`, err);
      }
    }
    await sql.unsafe(`DELETE FROM work_photography_photos WHERE id = $1`, [photo.id]);
    deletedCount++;
  }

  return { kept: toKeep.length, deleted: deletedCount };
}

