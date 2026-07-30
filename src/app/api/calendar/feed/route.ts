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

function formatDateToICS(dateStr: string, timeStr?: string | null): string {
  const cleanDate = dateStr.replace(/-/g, "");
  if (!timeStr) {
    return cleanDate;
  }
  const cleanTime = timeStr.replace(/:/g, "").substring(0, 4);
  return `${cleanDate}T${cleanTime}00`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noHolidays = searchParams.get("noHolidays") === "true";

    const bookings = await sql`
      SELECT id, title, booking_date, start_time, end_time, status, customer_name, customer_phone, location, event_type
      FROM admin_bookings
      WHERE status != 'cancelled'
    `;

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ft Online//Calendar Feed//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Ft. Calendar",
      "X-WR-TIMEZONE:Asia/Colombo",
      "X-PUBLISHED-TTL:PT15M",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M"
    ];

    const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    bookings.forEach(b => {
      const isTask = b.event_type === 'task_reminder';
      const typeLabel = isTask ? 'Reminder' : 'Booking';
      const formattedTitle = `Ft. - ${b.title}`;
      
      let dateVal = "";
      if (b.booking_date instanceof Date) {
        const y = b.booking_date.getFullYear();
        const m = String(b.booking_date.getMonth() + 1).padStart(2, "0");
        const d = String(b.booking_date.getDate()).padStart(2, "0");
        dateVal = `${y}-${m}-${d}`;
      } else {
        dateVal = String(b.booking_date).split("T")[0];
      }
      const startICS = formatDateToICS(dateVal, b.start_time);
      
      let endICS = "";
      if (b.end_time) {
        endICS = formatDateToICS(dateVal, b.end_time);
      } else if (b.start_time) {
        const [h, m] = b.start_time.split(":");
        const hr = (parseInt(h) + 1).toString().padStart(2, "0");
        endICS = formatDateToICS(dateVal, `${hr}:${m}`);
      } else {
        endICS = formatDateToICS(dateVal);
      }

      const isAllDay = !b.start_time;
      const uid = `booking-${b.id}@ft.online`;
      const description = `Type: ${typeLabel}\\nStatus: ${b.status}${isTask ? "" : `\\nClient: ${b.customer_name}`}${b.customer_phone ? `\\nPhone: ${b.customer_phone}` : ""}`;

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:${uid}`);
      icsContent.push(`DTSTAMP:${nowStr}`);
      if (isAllDay) {
        icsContent.push(`DTSTART;VALUE=DATE:${startICS}`);
        icsContent.push(`DTEND;VALUE=DATE:${endICS}`);
      } else {
        icsContent.push(`DTSTART:${startICS}`);
        icsContent.push(`DTEND:${endICS}`);
      }
      icsContent.push(`SUMMARY:${escapeICS(formattedTitle)}`);
      icsContent.push(`DESCRIPTION:${escapeICS(description)}`);
      if (b.location) {
        icsContent.push(`LOCATION:${escapeICS(b.location)}`);
      }
      icsContent.push("END:VEVENT");
    });

    if (!noHolidays) {
      try {
        const holidays = await getSriLankaHolidays();
        Object.entries(holidays).forEach(([dateStr, name]) => {
          const cleanDate = dateStr.replace(/-/g, "");
          const uid = `holiday-${cleanDate}@ft.online`;
          icsContent.push("BEGIN:VEVENT");
          icsContent.push(`UID:${uid}`);
          icsContent.push(`DTSTAMP:${nowStr}`);
          icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
          
          const d = new Date(dateStr);
          d.setDate(d.getDate() + 1);
          const nextDayStr = d.toISOString().split("T")[0].replace(/-/g, "");
          icsContent.push(`DTEND;VALUE=DATE:${nextDayStr}`);
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
        "Content-Disposition": 'attachment; filename="calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    console.error("Calendar feed error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
