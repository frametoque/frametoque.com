"use server";

import sql from "@/lib/db";

function formatDateOnly(d: any): string {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type BookingData = {
  id?: number;
  client_id?: string | null;
  title: string;
  description?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  booking_date: string; // YYYY-MM-DD
  start_time?: string | null; // HH:MM
  end_time?: string | null; // HH:MM
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'todo' | 'in_progress';
  price: number;
  location?: string | null;
  event_type?: 'booking' | 'task_reminder';
  created_at?: string;
  updated_at?: string;
};

export async function getBookings(): Promise<BookingData[]> {
  try {
    const rows = await sql`
      SELECT * FROM admin_bookings
      ORDER BY booking_date DESC, start_time ASC, id DESC
    `;
    return rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price || 0),
      booking_date: formatDateOnly(r.booking_date),
      start_time: r.start_time ? r.start_time.substring(0, 5) : null,
      end_time: r.end_time ? r.end_time.substring(0, 5) : null,
      location: r.location || null,
      event_type: r.event_type || 'booking',
    })) as BookingData[];
  } catch (error) {
    console.error("Failed to get bookings:", error);
    throw new Error("Failed to retrieve bookings.");
  }
}

export async function createBooking(data: BookingData): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO admin_bookings (
        client_id, title, description, customer_name, customer_email, customer_phone,
        booking_date, start_time, end_time, status, price, location, event_type, updated_at
      ) VALUES (
        ${data.client_id || null},
        ${data.title},
        ${data.description || null},
        ${data.customer_name},
        ${data.customer_email || null},
        ${data.customer_phone || null},
        ${data.booking_date},
        ${data.start_time || null},
        ${data.end_time || null},
        ${data.status || 'confirmed'},
        ${data.price || 0},
        ${data.location || null},
        ${data.event_type || 'booking'},
        now()
      )
      RETURNING id
    `;
    return result[0].id;
  } catch (error) {
    console.error("Failed to create booking:", error);
    throw new Error("Failed to create booking.");
  }
}

export async function updateBooking(id: number, data: BookingData): Promise<boolean> {
  try {
    await sql`
      UPDATE admin_bookings
      SET
        client_id = ${data.client_id || null},
        title = ${data.title},
        description = ${data.description || null},
        customer_name = ${data.customer_name},
        customer_email = ${data.customer_email || null},
        customer_phone = ${data.customer_phone || null},
        booking_date = ${data.booking_date},
        start_time = ${data.start_time || null},
        end_time = ${data.end_time || null},
        status = ${data.status},
        price = ${data.price},
        location = ${data.location || null},
        event_type = ${data.event_type || 'booking'},
        updated_at = now()
      WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error("Failed to update booking:", error);
    throw new Error("Failed to update booking.");
  }
}

export async function deleteBooking(id: number): Promise<boolean> {
  try {
    await sql`
      DELETE FROM admin_bookings WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error("Failed to delete booking:", error);
    throw new Error("Failed to delete booking.");
  }
}

export type CalendarEvent = {
  id: string;
  title: string;
  type: 'booking' | 'project' | 'agreement' | 'invoice' | 'domain' | 'hosting' | 'expiration';
  date: string;
  time?: string | null;
  status?: string;
  color: string;
  details?: string;
  location?: string | null;
  end_time?: string | null;
  event_type?: 'booking' | 'task_reminder' | 'domain_expiration' | 'hosting_expiration' | 'expiration';
};

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  await Promise.all([
    // 1. Fetch Bookings
    (async () => {
      try {
        const bookings = await sql`SELECT id, title, booking_date, start_time, end_time, status, customer_name, location, event_type FROM admin_bookings`;
        bookings.forEach(b => {
          const isTask = b.event_type === 'task_reminder';
          events.push({
            id: `booking-${b.id}`,
            title: `${b.title}`,
            type: 'booking',
            date: formatDateOnly(b.booking_date),
            time: b.start_time ? b.start_time.substring(0, 5) : null,
            end_time: b.end_time ? b.end_time.substring(0, 5) : null,
            status: b.status,
            color: isTask
              ? (b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400/50 border-emerald-500/20 line-through' :
                 b.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400/50 border-rose-500/20 line-through' : 
                 'bg-blue-600/20 text-blue-400 border-blue-500/30')
              : (b.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-brand-500/20 text-brand-400 border-brand-500/30'),
            details: `Client: ${b.customer_name}. Status: ${b.status}`,
            location: b.location || null,
            event_type: b.event_type || 'booking'
          });
        });
      } catch (e) {
        console.error("Error fetching bookings for calendar:", e);
      }
    })(),

    // 2. Fetch Agreements
    (async () => {
      try {
        const agreements = await sql`SELECT id, title, start_date, delivery_date, deadline, status, client_name FROM admin_agreements`;
        agreements.forEach(a => {
          if (a.start_date) {
            events.push({
              id: `agreement-start-${a.id}`,
              title: `${a.title} (Start)`,
              type: 'agreement',
              date: formatDateOnly(a.start_date),
              color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              details: `Client: ${a.client_name}. Status: ${a.status}`
            });
          }
          if (a.delivery_date) {
            events.push({
              id: `agreement-del-${a.id}`,
              title: `${a.title} (Delivery)`,
              type: 'agreement',
              date: formatDateOnly(a.delivery_date),
              color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
              details: `Client: ${a.client_name}. Delivery Date`
            });
          }
        });
      } catch (e) {
        console.error("Error fetching agreements for calendar:", e);
      }
    })(),

    // 3. Fetch Domain Expirations (admin_domain_orders)
    (async () => {
      try {
        const domainOrders = await sql`
          SELECT domain_name, expiry_date, status, client_email 
          FROM admin_domain_orders 
          WHERE expiry_date IS NOT NULL AND status != 'cancelled'
        `;
        domainOrders.forEach((d: any, idx: number) => {
          if (d.expiry_date) {
            const formattedDate = formatDateOnly(d.expiry_date);
            if (formattedDate) {
              events.push({
                id: `domain-${idx}-${d.domain_name}`,
                title: `Domain Expiry: ${d.domain_name}`,
                type: 'expiration',
                date: formattedDate,
                color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                details: `Domain expiration for ${d.domain_name}. Status: ${d.status || 'Active'}`,
                event_type: 'expiration'
              });
            }
          }
        });
      } catch (e) {
        console.error("Error fetching admin_domain_orders for calendar:", e);
      }
    })(),

    // 4. Fetch Hosting Expirations (admin_hosting_orders)
    (async () => {
      try {
        const hostingOrders = await sql`
          SELECT id, domain_name, hosting_provider, expiry_date, status, client_email 
          FROM admin_hosting_orders 
          WHERE expiry_date IS NOT NULL AND status != 'cancelled'
        `;
        hostingOrders.forEach((h: any, idx: number) => {
          if (h.expiry_date) {
            const formattedDate = formatDateOnly(h.expiry_date);
            if (formattedDate) {
              const nameLabel = h.domain_name ? h.domain_name : (h.hosting_provider || 'Hosting');
              events.push({
                id: `hosting-${idx}-${h.id}`,
                title: `Hosting Expiry: ${nameLabel}`,
                type: 'expiration',
                date: formattedDate,
                color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                details: `Hosting package expiration for ${nameLabel}. Status: ${h.status || 'Active'}`,
                event_type: 'expiration'
              });
            }
          }
        });
      } catch (e) {
        console.error("Error fetching admin_hosting_orders for calendar:", e);
      }
    })()
  ]);

  return events;
}

export async function getSriLankaHolidays(): Promise<Record<string, string>> {
  try {
    const res = await fetch("https://www.officeholidays.com/ics-clean/sri-lanka", {
      next: { revalidate: 86400 } // cache for 24 hours
    });
    if (!res.ok) throw new Error("Failed to fetch holidays");
    const icsText = await res.text();
    
    const holidays: Record<string, string> = {};
    const events = icsText.split("BEGIN:VEVENT");
    
    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      // Match DTSTART with optional parameters like VALUE=DATE
      const dtstartMatch = event.match(/DTSTART(?:;[^:]*)?:(\d{8})/i);
      const summaryMatch = event.match(/SUMMARY(?:;[^:]*)?:(.*)/i);
      
      if (dtstartMatch && summaryMatch) {
        const rawDate = dtstartMatch[1]; // YYYYMMDD
        const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        const summary = summaryMatch[1].trim();
        holidays[formattedDate] = summary;
      }
    }
    return holidays;
  } catch (error) {
    console.error("Failed to fetch Sri Lanka holidays:", error);
    return {};
  }
}
