import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sql from "@/lib/db";
import { getSriLankaHolidays, ensureWorkspaceSchema } from "@/app/(dashboard)/admin/actions/workspace";
import { getSessionUser } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isTokenValid(providedToken: string | null | undefined): boolean {
  if (!providedToken || typeof providedToken !== "string") return false;
  const cleanProvided = providedToken.trim();
  if (cleanProvided.length < 8) return false;

  const validTokens: string[] = [];
  if (process.env.CALENDAR_FEED_SECRET?.trim()) {
    validTokens.push(process.env.CALENDAR_FEED_SECRET.trim());
  }
  if (process.env.CRON_SECRET?.trim()) {
    validTokens.push(process.env.CRON_SECRET.trim());
  }
  const derivedToken = crypto
    .createHmac("sha256", process.env.CLERK_SECRET_KEY || "ft-calendar-feed-secret")
    .update("frametoque-calendar-feed-token")
    .digest("hex");
  validTokens.push(derivedToken);

  for (const expected of validTokens) {
    if (cleanProvided.length === expected.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(expected))) {
          return true;
        }
      } catch {
        // Continue checking
      }
    }
  }
  return false;
}

function escapeICS(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function formatDateOnly(d: any): string {
  if (!d) return "";
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }
  const dateStr = String(d).split("T")[0];
  return dateStr.replace(/-/g, "");
}

function getNextDayDateOnly(d: any): string {
  if (!d) return "";
  let dateStr = "";
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dateStr = `${y}-${m}-${day}`;
  } else {
    dateStr = String(d).split("T")[0];
  }
  const [y, m, day] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (day || 1) + 1));
  const resY = dt.getUTCFullYear();
  const resM = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const resDay = String(dt.getUTCDate()).padStart(2, "0");
  return `${resY}${resM}${resDay}`;
}

function formatTimeICS(dateStr: any, timeStr?: string | null): string {
  const cleanDate = formatDateOnly(dateStr);
  if (!timeStr) return cleanDate;
  const cleanTime = timeStr.replace(/:/g, "").substring(0, 4).padEnd(4, "0");
  return `${cleanDate}T${cleanTime}00`;
}

function safeIsoDate(d: any, fallback: string): string {
  try {
    if (!d) return fallback;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let authorized = isTokenValid(token);

    if (!authorized) {
      // Allow authenticated admin users viewing directly from their browser
      const session = await getSessionUser().catch(() => null);
      if (session?.isAdmin) {
        authorized = true;
      }
    }

    if (!authorized) {
      return new NextResponse("Unauthorized: Calendar feed access requires a valid subscription token", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const noHolidays = searchParams.get("noHolidays") === "true";

    // 1. Fetch Bookings & Task Reminders
    let bookings: any[] = [];
    try {
      bookings = await sql`
        SELECT id, title, description, booking_date, start_time, end_time, status, customer_name, customer_phone, location, event_type, created_at
        FROM admin_bookings
        WHERE status != 'cancelled'
      `;
    } catch (e) {
      console.warn("Calendar Feed: admin_bookings query skipped:", e);
    }

    // 2. Fetch Domain Renewal / Expiry Reminders
    let domainOrders: any[] = [];
    try {
      domainOrders = await sql`
        SELECT domain_name, expiry_date
        FROM admin_domain_orders
        WHERE expiry_date IS NOT NULL AND status != 'cancelled'
      `;
    } catch (e) {
      console.warn("Calendar Feed: admin_domain_orders query skipped:", e);
    }

    // 3. Fetch Hosting Expiry Reminders
    let hostingOrders: any[] = [];
    try {
      hostingOrders = await sql`
        SELECT id, domain_name, hosting_provider, expiry_date
        FROM admin_hosting_orders
        WHERE expiry_date IS NOT NULL AND status != 'cancelled'
      `;
    } catch (e) {
      console.warn("Calendar Feed: admin_hosting_orders query skipped:", e);
    }

    // 4. Fetch Content Planner Events (Shooting Days, Uploads, Editing, Boosting)
    let plannerItems: any[] = [];
    try {
      await ensureWorkspaceSchema().catch(() => {});
      plannerItems = await sql`
        SELECT cp.*, p.name as project_name, p.client_name, p.client_company
        FROM workspace_content_planner cp
        LEFT JOIN workspace_projects p ON cp.project_id = p.id
        WHERE cp.status != 'cancelled' AND cp.start_date IS NOT NULL
      `;
    } catch (e) {
      console.warn("Calendar Feed: primary workspace_content_planner query failed, trying fallback:", e);
      try {
        plannerItems = await sql`
          SELECT cp.*, p.name as project_name
          FROM workspace_content_planner cp
          LEFT JOIN workspace_projects p ON cp.project_id = p.id
          WHERE cp.status != 'cancelled' AND cp.start_date IS NOT NULL
        `;
      } catch (e2) {
        console.warn("Calendar Feed: workspace_content_planner query skipped:", e2);
      }
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Frametoque//Calendar Feed//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Frametoque",
      "X-WR-CALDESC:Frametoque Bookings & Reminders Feed",
      "X-WR-TIMEZONE:Asia/Colombo",
      "X-APPLE-CALENDAR-COLOR:#169FE4",
      "X-WR-CALCOLOR:#169FE4",
      "X-PUBLISHED-TTL:PT15M",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Colombo",
      "X-LIC-LOCATION:Asia/Colombo",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0530",
      "TZOFFSETTO:+0530",
      "TZNAME:IST",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    // Add Bookings & Task Reminders
    bookings.forEach(b => {
      const startDateOnly = formatDateOnly(b.booking_date);
      if (!startDateOnly) return;

      const isTask = b.event_type === 'task_reminder';
      const typeLabel = isTask ? 'Reminder' : 'Booking';
      const formattedTitle = `Ft. - ${b.title}`;
      const isAllDay = !b.start_time;

      const uid = `booking-${b.id}@frametoque.com`;
      const descriptionLines = [
        `Type: ${typeLabel}`,
        `Status: ${b.status}`,
        b.description ? `Note: ${b.description}` : "",
        b.customer_phone ? `Phone: ${b.customer_phone}` : ""
      ].filter(Boolean).join("\n");

      const eventLastMod = safeIsoDate(b.created_at, nowStr);

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${eventLastMod}`);
      icsContent.push(`LAST-MODIFIED:${eventLastMod}`);
      icsContent.push("SEQUENCE:0");

      if (isAllDay) {
        const endDateOnly = getNextDayDateOnly(b.booking_date);
        icsContent.push(`DTSTART;VALUE=DATE:${startDateOnly}`);
        icsContent.push(`DTEND;VALUE=DATE:${endDateOnly}`);
      } else {
        const startICS = formatTimeICS(b.booking_date, b.start_time);
        let endICS = "";
        if (b.end_time) {
          endICS = formatTimeICS(b.booking_date, b.end_time);
        } else {
          const [h, m] = (b.start_time || "09:00").split(":");
          const hr = (parseInt(h, 10) + 1).toString().padStart(2, "0");
          endICS = formatTimeICS(b.booking_date, `${hr}:${m}`);
        }
        icsContent.push(`DTSTART;TZID=Asia/Colombo:${startICS}`);
        icsContent.push(`DTEND;TZID=Asia/Colombo:${endICS}`);
      }

      icsContent.push(`SUMMARY:${escapeICS(formattedTitle)}`);
      icsContent.push(`DESCRIPTION:${escapeICS(descriptionLines)}`);
      if (b.location) {
        icsContent.push(`LOCATION:${escapeICS(b.location)}`);
      }
      icsContent.push("END:VEVENT");
    });

    // Add Domain Expiry Reminders
    domainOrders.forEach((d, idx) => {
      if (!d.expiry_date) return;
      const startDateOnly = formatDateOnly(d.expiry_date);
      const endDateOnly = getNextDayDateOnly(d.expiry_date);
      const uid = `domain-expiry-${idx}-${d.domain_name}@ft.online`;

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${nowStr}`);
      icsContent.push(`DTSTART;VALUE=DATE:${startDateOnly}`);
      icsContent.push(`DTEND;VALUE=DATE:${endDateOnly}`);
      icsContent.push(`SUMMARY:${escapeICS(`Ft. - Domain Expiry: ${d.domain_name}`)}`);
      icsContent.push(`DESCRIPTION:${escapeICS(`Domain expiration reminder for ${d.domain_name}`)}`);
      icsContent.push("END:VEVENT");
    });

    // Add Hosting Expiry Reminders
    hostingOrders.forEach((h, idx) => {
      if (!h.expiry_date) return;
      const startDateOnly = formatDateOnly(h.expiry_date);
      const endDateOnly = getNextDayDateOnly(h.expiry_date);
      const nameLabel = h.domain_name ? h.domain_name : (h.hosting_provider || 'Hosting');
      const uid = `hosting-expiry-${idx}-${h.id || idx}@ft.online`;

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${nowStr}`);
      icsContent.push(`DTSTART;VALUE=DATE:${startDateOnly}`);
      icsContent.push(`DTEND;VALUE=DATE:${endDateOnly}`);
      icsContent.push(`SUMMARY:${escapeICS(`Ft. - Hosting Expiry: ${nameLabel}`)}`);
      icsContent.push(`DESCRIPTION:${escapeICS(`Hosting package expiration reminder for ${nameLabel}`)}`);
      icsContent.push("END:VEVENT");
    });

    // Add Content Planner Events (Shoots, Uploads, Editing, Boosting)
    plannerItems.forEach(cp => {
      const typeLabels: Record<string, string> = {
        shooting: "Shoot",
        upload: "Upload",
        editing: "Editing",
        boosting: "Boosting",
        work: "Work",
      };
      const label = typeLabels[cp.activity_type] || (cp.activity_type ? cp.activity_type.charAt(0).toUpperCase() + cp.activity_type.slice(1) : "Planner");
      
      const clientOrProject = (cp.project_name || cp.client_company || cp.client_name || "").trim();
      const formattedTitle = clientOrProject 
        ? `Ft. - ${clientOrProject} - ${cp.title} [${label}]`
        : `Ft. - ${cp.title} [${label}]`;

      const uid = `content-planner-${cp.id}@frametoque.com`;

      const descriptionLines = [
        `Activity: ${label}`,
        cp.project_name ? `Planner: ${cp.project_name}` : "",
        cp.client_name ? `Client: ${cp.client_name}${cp.client_company ? ` (${cp.client_company})` : ""}` : "",
        `Status: ${cp.status}`,
        cp.format ? `Format: ${cp.format}` : "",
        cp.platforms ? `Platforms: ${Array.isArray(cp.platforms) ? cp.platforms.join(", ") : cp.platforms}` : "",
        cp.boosting_budget ? `Ad Budget: Rs. ${Number(cp.boosting_budget).toLocaleString()}` : "",
        cp.deliverables_url ? `Deliverables URL: ${cp.deliverables_url}` : "",
        cp.caption ? `Caption / Copy: ${cp.caption}` : "",
        cp.notes ? `Notes: ${cp.notes}` : "",
      ].filter(Boolean).join("\n");

      const eventLastMod = safeIsoDate(cp.created_at, nowStr);

      const startDateOnly = formatDateOnly(cp.start_date);
      if (!startDateOnly) return;

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${eventLastMod}`);
      icsContent.push(`LAST-MODIFIED:${eventLastMod}`);
      icsContent.push("SEQUENCE:0");

      const isAllDay = !cp.start_time;
      if (isAllDay) {
        const endDateOnly = cp.end_date ? getNextDayDateOnly(cp.end_date) : getNextDayDateOnly(cp.start_date);
        icsContent.push(`DTSTART;VALUE=DATE:${startDateOnly}`);
        icsContent.push(`DTEND;VALUE=DATE:${endDateOnly}`);
      } else {
        const startICS = formatTimeICS(cp.start_date, cp.start_time);
        let endICS = "";
        if (cp.end_time) {
          endICS = formatTimeICS(cp.end_date || cp.start_date, cp.end_time);
        } else {
          const [h, m] = (cp.start_time || "09:00").split(":");
          const hr = (parseInt(h, 10) + 1).toString().padStart(2, "0");
          endICS = formatTimeICS(cp.start_date, `${hr}:${m}`);
        }
        icsContent.push(`DTSTART;TZID=Asia/Colombo:${startICS}`);
        icsContent.push(`DTEND;TZID=Asia/Colombo:${endICS}`);
      }

      icsContent.push(`SUMMARY:${escapeICS(formattedTitle)}`);
      icsContent.push(`DESCRIPTION:${escapeICS(descriptionLines)}`);
      if (cp.location) {
        icsContent.push(`LOCATION:${escapeICS(cp.location)}`);
      }
      icsContent.push("END:VEVENT");
    });

    // Add Public Holidays if requested
    if (!noHolidays) {
      try {
        const holidays = await getSriLankaHolidays();
        Object.entries(holidays).forEach(([dateStr, name]) => {
          const startDateOnly = formatDateOnly(dateStr);
          const endDateOnly = getNextDayDateOnly(dateStr);
          const uid = `holiday-${startDateOnly}@ft.online`;

          icsContent.push("BEGIN:VEVENT");
          icsContent.push(`UID:${uid}`);
          icsContent.push(`DTSTAMP:${nowStr}`);
          icsContent.push(`DTSTART;VALUE=DATE:${startDateOnly}`);
          icsContent.push(`DTEND;VALUE=DATE:${endDateOnly}`);
          icsContent.push(`SUMMARY:${escapeICS(`Ft. - Public Holiday: ${name}`)}`);
          icsContent.push(`DESCRIPTION:Public Holiday in Sri Lanka`);
          icsContent.push("END:VEVENT");
        });
      } catch (e) {
        console.error("Failed to load holidays for ICS feed:", e);
      }
    }

    icsContent.push("END:VCALENDAR");

    return new Response(icsContent.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="calendar.ics"',
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    console.error("Calendar feed error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
