import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { getSriLankaHolidays } from "@/app/(dashboard)/admin/actions/bookings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  let str = "";
  if (d instanceof Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    str = `${y}-${m}-${day}`;
  } else {
    str = String(d).split("T")[0];
  }
  return str.replace(/-/g, "");
}

function getNextDayDateOnly(d: any): string {
  let dateObj: Date;
  if (d instanceof Date) {
    dateObj = new Date(d.getTime());
  } else {
    dateObj = new Date(String(d).split("T")[0] + "T00:00:00Z");
  }
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }
  dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatTimeICS(dateStr: string, timeStr?: string | null): string {
  const cleanDate = formatDateOnly(dateStr);
  if (!timeStr) return cleanDate;
  const cleanTime = timeStr.replace(/:/g, "").substring(0, 4).padEnd(4, "0");
  return `${cleanDate}T${cleanTime}00`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noHolidays = searchParams.get("noHolidays") === "true";

    // 1. Fetch Bookings & Task Reminders
    const bookings = await sql`
      SELECT id, title, description, booking_date, start_time, end_time, status, customer_name, customer_phone, location, event_type, created_at
      FROM admin_bookings
      WHERE status != 'cancelled'
    `;

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
      const isTask = b.event_type === 'task_reminder';
      const typeLabel = isTask ? 'Reminder' : 'Booking';
      const formattedTitle = `Ft. - ${b.title}`;
      const isAllDay = !b.start_time;

      const uid = `booking-${b.id}@frametoque.online`;
      const descriptionLines = [
        `Type: ${typeLabel}`,
        `Status: ${b.status}`,
        b.description ? `Note: ${b.description}` : "",
        !isTask && b.customer_name ? `Client: ${b.customer_name}` : "",
        b.customer_phone ? `Phone: ${b.customer_phone}` : ""
      ].filter(Boolean).join("\n");

      const eventLastMod = b.created_at ? new Date(b.created_at).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z" : nowStr;

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${eventLastMod}`);
      icsContent.push(`LAST-MODIFIED:${eventLastMod}`);
      icsContent.push("SEQUENCE:0");

      if (isAllDay) {
        const startDateOnly = formatDateOnly(b.booking_date);
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
          const hr = (parseInt(h) + 1).toString().padStart(2, "0");
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
