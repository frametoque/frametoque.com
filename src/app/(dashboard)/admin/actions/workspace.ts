"use server";
import { revalidatePath } from "next/cache";
import { clerkClient, auth } from "@clerk/nextjs/server";
import { requireAdminSession, requireUserSession } from "@/lib/auth-guard";
import { logSystemAction } from "@/lib/logger";

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

let _workspaceSchemaPromise: Promise<void> | null = null;
export async function ensureWorkspaceSchema(): Promise<void> {
  if (_workspaceSchemaPromise) return _workspaceSchemaPromise;

  _workspaceSchemaPromise = (async () => {
    // 1. Ensure client assignment columns on workspace_projects individually
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS client_id INTEGER`;
    } catch (e) {
      console.warn("Could not alter workspace_projects client_id:", e);
    }
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS client_name TEXT`;
    } catch (e) {
      console.warn("Could not alter workspace_projects client_name:", e);
    }
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS client_email TEXT`;
    } catch (e) {
      console.warn("Could not alter workspace_projects client_email:", e);
    }
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS client_company TEXT`;
    } catch (e) {
      console.warn("Could not alter workspace_projects client_company:", e);
    }
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS has_planner BOOLEAN DEFAULT false`;
    } catch (e) {
      console.warn("Could not alter workspace_projects has_planner:", e);
    }
    try {
      await sql`ALTER TABLE workspace_projects ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`;
    } catch (e) {
      console.warn("Could not alter workspace_projects is_pinned:", e);
    }

    // 2. Ensure workspace_content_planner table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS workspace_content_planner (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          activity_type VARCHAR(50) NOT NULL DEFAULT 'upload',
          platforms JSONB DEFAULT '[]'::jsonb,
          format VARCHAR(50) DEFAULT 'Reel',
          start_date DATE NOT NULL,
          end_date DATE,
          start_time VARCHAR(20),
          status VARCHAR(50) DEFAULT 'planned',
          caption TEXT,
          deliverables_url TEXT,
          boosting_budget NUMERIC(12, 2),
          boosting_currency VARCHAR(10) DEFAULT 'USD',
          boosting_target TEXT,
          notes TEXT,
          assigned_to TEXT,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        )
      `;
      await sql`ALTER TABLE workspace_content_planner ENABLE ROW LEVEL SECURITY`;
    } catch (e) {
      console.warn("Could not create workspace_content_planner:", e);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_workspace_cp_project ON workspace_content_planner(project_id, start_date)`;
    } catch (e) {
      // index might already exist or ignore
    }

    // 3. Ensure workspace_month_links table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS workspace_month_links (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          year_month VARCHAR(7) NOT NULL,
          invoice_id VARCHAR(100),
          quotation_id VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now(),
          CONSTRAINT uq_workspace_month_project UNIQUE(project_id, year_month)
        )
      `;
      await sql`ALTER TABLE workspace_month_links ENABLE ROW LEVEL SECURITY`;
    } catch (e) {
      console.warn("Could not create workspace_month_links:", e);
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_workspace_month_links ON workspace_month_links(project_id, year_month)`;
    } catch (e) {
      // ignore
    }
  })();

  return _workspaceSchemaPromise;
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
  await requireAdminSession();

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
  await requireAdminSession();

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
    await logSystemAction(`Created booking for: ${data.customer_name}`);
    return result[0].id;
  } catch (error) {
    console.error("Failed to create booking:", error);
    throw new Error("Failed to create booking.");
  }
}

export async function updateBooking(id: number, data: BookingData): Promise<boolean> {
  await requireAdminSession();

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
    await logSystemAction(`Updated booking for: ${data.customer_name}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to update booking:", error);
    throw new Error("Failed to update booking.");
  }
}

export async function deleteBooking(id: number): Promise<boolean> {
  await requireAdminSession();

  try {
    await sql`
      DELETE FROM admin_bookings WHERE id = ${id}
    `;
    await logSystemAction(`Deleted booking ID: ${id}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to delete booking:", error);
    throw new Error("Failed to delete booking.");
  }
}

export type CalendarEvent = {
  id: string;
  title: string;
  type: 'booking' | 'project' | 'agreement' | 'invoice' | 'domain' | 'hosting' | 'expiration' | 'shooting' | 'upload' | 'editing' | 'boosting' | 'work';
  date: string;
  time?: string | null;
  status?: string;
  color: string;
  details?: string;
  location?: string | null;
  end_time?: string | null;
  event_type?: string;
  project_id?: number;
};

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  await requireAdminSession();

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
    })(),

    // 5. Fetch Workspace Projects
    (async () => {
      try {
        const projects = await sql`SELECT id, name, deadline, status FROM workspace_projects WHERE deadline IS NOT NULL AND status != 'Done'`;
        projects.forEach(p => {
          if (p.deadline) {
            events.push({
              id: `project-${p.id}`,
              title: `Project Deadline: ${p.name}`,
              type: 'project',
              date: formatDateOnly(p.deadline),
              color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
              details: `Project deadline for ${p.name}. Status: ${p.status}`,
              project_id: p.id
            });
          }
        });
      } catch (e) {
        console.error("Error fetching projects for calendar:", e);
      }
    })(),

    // 6. Fetch Workspace Tasks
    (async () => {
      try {
        const tasks = await sql`SELECT id, name, due_date, status FROM workspace_tasks WHERE due_date IS NOT NULL AND status != 'Done' AND status != 'Completed'`;
        tasks.forEach(t => {
          if (t.due_date) {
            events.push({
              id: `task-${t.id}`,
              title: `Task Due: ${t.name}`,
              type: 'project',
              date: formatDateOnly(t.due_date),
              color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
              details: `Task due date for ${t.name}. Status: ${t.status}`
            });
          }
        });
      } catch (e) {
        console.error("Error fetching tasks for calendar:", e);
      }
    })(),

    // 7. Fetch Content Planner Events (Shooting, Uploads, Editing, Boosting)
    (async () => {
      try {
        const plannerItems = await sql`
          SELECT cp.*, p.name as project_name
          FROM workspace_content_planner cp
          LEFT JOIN workspace_projects p ON cp.project_id = p.id
          WHERE cp.status != 'cancelled'
        `;
        plannerItems.forEach((cp: any) => {
          const formattedDate = formatDateOnly(cp.start_date);
          if (!formattedDate) return;

          let color = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
          let prefix = 'Upload';
          if (cp.activity_type === 'shooting') {
            color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            prefix = 'Shoot';
          } else if (cp.activity_type === 'editing') {
            color = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            prefix = 'Editing';
          } else if (cp.activity_type === 'boosting') {
            color = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            prefix = 'Boosting';
          } else if (cp.activity_type === 'work') {
            color = 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
            prefix = 'Work';
          }

          const plannerName = cp.project_name ? `${cp.project_name}: ` : '';

          events.push({
            id: `cp-${cp.id}`,
            title: `${plannerName}[${prefix}] ${cp.title}`,
            type: cp.activity_type || 'upload',
            date: formattedDate,
            time: cp.start_time || null,
            color,
            details: `Planner: ${cp.project_name || 'N/A'}. Status: ${cp.status}. Format: ${cp.format || 'Post'}`,
            event_type: cp.activity_type || 'upload',
            project_id: cp.project_id
          });
        });
      } catch (e) {
        // Table may not exist yet, safely ignore
      }
    })(),
  ]);

  return events;
}

// Built-in Sri Lanka holidays (Mercantile, Public & Bank Holidays + Poya days)
const SRI_LANKA_BASE_HOLIDAYS: Record<string, string> = {
  // 2025
  "2025-01-13": "Duruthu Full Moon Poya Day",
  "2025-01-14": "Tamil Thai Pongal Day",
  "2025-02-04": "National Day (Independence Day)",
  "2025-02-12": "Navam Full Moon Poya Day",
  "2025-02-26": "Maha Shivratri Day",
  "2025-03-13": "Medin Full Moon Poya Day",
  "2025-03-31": "Id-Ul-Fitr (Ramazan Festival Day)",
  "2025-04-12": "Bak Full Moon Poya Day",
  "2025-04-13": "Sinhala & Tamil New Year Eve",
  "2025-04-14": "Sinhala & Tamil New Year Day",
  "2025-04-18": "Good Friday",
  "2025-05-01": "May Day (Worker's Day)",
  "2025-05-12": "Vesak Full Moon Poya Day",
  "2025-05-13": "Day following Vesak Full Moon Poya Day",
  "2025-06-07": "Id-Ul-Alha (Hadji Festival Day)",
  "2025-06-10": "Poson Full Moon Poya Day",
  "2025-07-10": "Esala Full Moon Poya Day",
  "2025-08-08": "Nikini Full Moon Poya Day",
  "2025-09-05": "Milad-un-Nabi (Holy Prophet's Birthday)",
  "2025-09-07": "Binara Full Moon Poya Day",
  "2025-10-06": "Vap Full Moon Poya Day",
  "2025-10-20": "Deepavali Festival Day",
  "2025-11-05": "Il Full Moon Poya Day",
  "2025-12-04": "Unduvap Full Moon Poya Day",
  "2025-12-25": "Christmas Day",

  // 2026
  "2026-01-03": "Duruthu Full Moon Poya Day",
  "2026-01-15": "Tamil Thai Pongal Day",
  "2026-02-01": "Navam Full Moon Poya Day",
  "2026-02-04": "National Day (Independence Day)",
  "2026-02-15": "Maha Shivratri Day",
  "2026-03-03": "Medin Full Moon Poya Day",
  "2026-03-20": "Id-Ul-Fitr (Ramazan Festival Day)",
  "2026-04-02": "Bak Full Moon Poya Day",
  "2026-04-03": "Good Friday",
  "2026-04-13": "Sinhala & Tamil New Year Eve",
  "2026-04-14": "Sinhala & Tamil New Year Day",
  "2026-05-01": "May Day (Worker's Day)",
  "2026-05-02": "Vesak Full Moon Poya Day",
  "2026-05-03": "Day following Vesak Poya Day",
  "2026-05-27": "Id-Ul-Alha (Hadji Festival Day)",
  "2026-05-30": "Poson Full Moon Poya Day",
  "2026-06-29": "Esala Full Moon Poya Day",
  "2026-07-28": "Nikini Full Moon Poya Day",
  "2026-08-25": "Milad-un-Nabi (Holy Prophet's Birthday)",
  "2026-08-27": "Binara Full Moon Poya Day",
  "2026-09-25": "Vap Full Moon Poya Day",
  "2026-10-25": "Il Full Moon Poya Day",
  "2026-11-08": "Deepavali Festival Day",
  "2026-11-23": "Unduvap Full Moon Poya Day",
  "2026-12-25": "Christmas Day",

  // 2027
  "2027-01-15": "Tamil Thai Pongal Day",
  "2027-01-22": "Duruthu Full Moon Poya Day",
  "2027-02-04": "National Day (Independence Day)",
  "2027-02-20": "Navam Full Moon Poya Day",
  "2027-03-06": "Maha Shivratri Day",
  "2027-03-10": "Id-Ul-Fitr (Ramazan Festival Day)",
  "2027-03-22": "Medin Full Moon Poya Day",
  "2027-03-26": "Good Friday",
  "2027-04-13": "Sinhala & Tamil New Year Eve",
  "2027-04-14": "Sinhala & Tamil New Year Day",
  "2027-04-20": "Bak Full Moon Poya Day",
  "2027-05-01": "May Day (Worker's Day)",
  "2027-05-20": "Vesak Full Moon Poya Day",
  "2027-05-21": "Day following Vesak Poya Day",
  "2027-06-18": "Poson Full Moon Poya Day",
  "2027-07-18": "Esala Full Moon Poya Day",
  "2027-08-16": "Nikini Full Moon Poya Day",
  "2027-09-15": "Binara Full Moon Poya Day",
  "2027-10-15": "Vap Full Moon Poya Day",
  "2027-10-29": "Deepavali Festival Day",
  "2027-11-13": "Il Full Moon Poya Day",
  "2027-12-13": "Unduvap Full Moon Poya Day",
  "2027-12-25": "Christmas Day",
};

export async function getSriLankaHolidays(): Promise<Record<string, string>> {
  const holidays: Record<string, string> = { ...SRI_LANKA_BASE_HOLIDAYS };

  try {
    const res = await fetch("https://www.officeholidays.com/ics-clean/sri-lanka", {
      next: { revalidate: 86400 } // cache for 24 hours
    });
    if (res.ok) {
      const icsText = await res.text();
      const events = icsText.split("BEGIN:VEVENT");
      
      for (let i = 1; i < events.length; i++) {
        const event = events[i];
        const dtstartMatch = event.match(/DTSTART(?:;[^:]*)?:(\d{8})/i);
        const summaryMatch = event.match(/SUMMARY(?:;[^:]*)?:(.*)/i);
        
        if (dtstartMatch && summaryMatch) {
          const rawDate = dtstartMatch[1]; // YYYYMMDD
          const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
          const summary = summaryMatch[1].trim();
          holidays[formattedDate] = summary;
        }
      }
    }
  } catch (error) {
    // Non-fatal, base holidays already populated
    console.warn("Could not fetch remote Sri Lanka holidays feed, using built-in calendar:", error);
  }

  return holidays;
}

// --- WORKSPACE: TEAM ---
export type WorkspaceTeam = {
  id: string;
  name: string;
  full_name?: string;
  first_name?: string;
  email: string;
  role: string;
  image: string;
};

export async function getTeamMembers(): Promise<WorkspaceTeam[]> {
  await requireAdminSession();

  try {
    const clerk = await clerkClient();
    const usersResponse = await clerk.users.getUserList({ limit: 100 });
    const users = usersResponse.data || usersResponse; 
    
    const teamMembers = (Array.isArray(users) ? users : []).filter((user) => {
      if (!user.publicMetadata) return false;
      
      // Case insensitive match and handle possible trailing spaces
      let role = user.publicMetadata?.role;
      if (!role) {
        // Check for capitalized "Role"
        const keys = Object.keys(user.publicMetadata || {});
        const roleKey = keys.find(k => k.toLowerCase() === 'role');
        if (roleKey) role = user.publicMetadata[roleKey];
      }
      
      if (typeof role === 'string') {
        return role.toLowerCase().trim() === "team";
      }
      
      // Just in case publicMetadata is a string somehow?
      if (typeof user.publicMetadata === 'string') {
        try {
          const parsed = JSON.parse(user.publicMetadata);
          return parsed.role && parsed.role.toLowerCase().trim() === "team";
        } catch(e) {}
      }
      
      return false;
    })
      .map((user) => {
        const firstName = user.firstName?.trim() || "";
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || user.emailAddresses?.[0]?.emailAddress || "Unknown";
        const primaryFirstName = firstName || fullName.split(" ")[0] || fullName;
        return {
          id: user.emailAddresses?.[0]?.emailAddress || user.id,
          name: primaryFirstName,
          full_name: fullName,
          first_name: primaryFirstName,
          email: user.emailAddresses?.[0]?.emailAddress || "",
          role: "team",
          image: user.imageUrl || "",
        };
      });
      
    // If still empty, let's just return all users so the user can AT LEAST see something and debug their metadata?
    // Wait, it's better to just log or rely on the robust check.
    // If robust check doesn't work, maybe the metadata key is "Role" instead of "role"?
    
    return teamMembers;
  } catch (error) {
    console.error("Failed to get team members from Clerk:", error);
    return [];
  }
}

// --- WORKSPACE: PROJECTS ---
export type WorkspaceProject = {
  id?: number;
  name: string;
  status: string;
  categories?: string[];
  owner_ids?: string[];
  start_date?: string | null;
  deadline?: string | null;
  priority?: string | null;
  completion_percentage?: number;
  blocked_by?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  client_email?: string | null;
  client_company?: string | null;
  has_planner?: boolean;
  is_pinned?: boolean;
};

export async function getProjects(): Promise<WorkspaceProject[]> {
  await requireAdminSession();

  try {
    ensureWorkspaceSchema().catch((e) => console.warn("Schema init error in background:", e));

    // Direct SELECT * ensures ALL existing projects are ALWAYS returned safely
    const rows = await sql`SELECT * FROM workspace_projects ORDER BY is_pinned DESC NULLS LAST, created_at DESC`;
    return rows.map((r: any) => ({
      ...r,
      client_id: r.client_id ? Number(r.client_id) : null,
      client_name: r.client_name || null,
      client_email: r.client_email || null,
      client_company: r.client_company || null,
      has_planner: Boolean(r.has_planner || (Array.isArray(r.categories) ? r.categories.includes("Content Planner") : (typeof r.categories === 'string' && r.categories.includes("Content Planner")))),
      is_pinned: Boolean(r.is_pinned),
      start_date: formatDateOnly(r.start_date),
      deadline: formatDateOnly(r.deadline),
    })) as WorkspaceProject[];
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
}

export async function createProject(data: WorkspaceProject): Promise<number> {
  await requireAdminSession();

  try {
    const result = await sql`
      INSERT INTO workspace_projects (
        name, status, categories, owner_ids, start_date, deadline, priority, completion_percentage, blocked_by,
        client_id, client_name, client_email, client_company, has_planner, is_pinned
      ) VALUES (
        ${data.name}, ${data.status || 'Not Started'}, ${data.categories ? JSON.stringify(data.categories) : '[]'}, ${data.owner_ids ? JSON.stringify(data.owner_ids) : '[]'},
        ${data.start_date || null}, ${data.deadline || null}, ${data.priority || null},
        ${data.completion_percentage || 0}, ${data.blocked_by || null},
        ${data.client_id || null}, ${data.client_name || null}, ${data.client_email || null}, ${data.client_company || null},
        ${Boolean(data.has_planner)},
        ${Boolean(data.is_pinned)}
      )
      RETURNING id
    `;
    await logSystemAction(`Created workspace project: ${data.name}`);
    return result[0].id;
  } catch (error) {
    // Graceful fallback if columns do not exist yet in database
    try {
      const fallbackResult = await sql`
        INSERT INTO workspace_projects (
          name, status, categories, owner_ids, start_date, deadline, priority, completion_percentage, blocked_by
        ) VALUES (
          ${data.name}, ${data.status || 'Not Started'}, ${data.categories ? JSON.stringify(data.categories) : '[]'}, ${data.owner_ids ? JSON.stringify(data.owner_ids) : '[]'},
          ${data.start_date || null}, ${data.deadline || null}, ${data.priority || null},
          ${data.completion_percentage || 0}, ${data.blocked_by || null}
        )
        RETURNING id
      `;
      await logSystemAction(`Created workspace project: ${data.name}`);
      return fallbackResult[0].id;
    } catch (fallbackError) {
      console.error("Failed to create project:", fallbackError);
      throw new Error("Failed to create project.");
    }
  }
}

export async function updateProject(id: number, data: WorkspaceProject): Promise<boolean> {
  await requireAdminSession();

  try {
    await sql`
      UPDATE workspace_projects
      SET
        name = ${data.name}, status = ${data.status}, categories = ${data.categories ? JSON.stringify(data.categories) : '[]'}, owner_ids = ${data.owner_ids ? JSON.stringify(data.owner_ids) : '[]'},
        start_date = ${data.start_date || null}, deadline = ${data.deadline || null},
        priority = ${data.priority || null}, completion_percentage = ${data.completion_percentage || 0},
        blocked_by = ${data.blocked_by || null},
        client_id = ${data.client_id || null},
        client_name = ${data.client_name || null},
        client_email = ${data.client_email || null},
        client_company = ${data.client_company || null},
        has_planner = ${Boolean(data.has_planner)},
        is_pinned = ${Boolean(data.is_pinned)},
        updated_at = now()
      WHERE id = ${id}
    `;
    await logSystemAction(`Updated workspace project: ${data.name}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    // Graceful fallback if client/planner columns do not exist yet in database
    try {
      await sql`
        UPDATE workspace_projects
        SET
          name = ${data.name}, status = ${data.status}, categories = ${data.categories ? JSON.stringify(data.categories) : '[]'}, owner_ids = ${data.owner_ids ? JSON.stringify(data.owner_ids) : '[]'},
          start_date = ${data.start_date || null}, deadline = ${data.deadline || null},
          priority = ${data.priority || null}, completion_percentage = ${data.completion_percentage || 0},
          blocked_by = ${data.blocked_by || null},
          updated_at = now()
        WHERE id = ${id}
      `;
      await logSystemAction(`Updated workspace project: ${data.name}`);
      revalidatePath("/admin", "layout");
      return true;
    } catch (fallbackError) {
      console.error("Failed to update project:", fallbackError);
      throw new Error("Failed to update project.");
    }
  }
}

export async function deleteProject(id: number): Promise<boolean> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    await sql`DELETE FROM workspace_projects WHERE id = ${id}`;
    await logSystemAction(`Deleted workspace project ID: ${id}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw new Error("Failed to delete project.");
  }
}

export async function toggleProjectPin(id: number, is_pinned: boolean): Promise<boolean> {
  await requireAdminSession();

  await ensureWorkspaceSchema();
  try {
    await sql`
      UPDATE workspace_projects
      SET is_pinned = ${is_pinned}, updated_at = now()
      WHERE id = ${id}
    `;
    await logSystemAction(`${is_pinned ? "Pinned" : "Unpinned"} workspace project ID: ${id}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to toggle project pin:", error);
    throw new Error("Failed to toggle project pin.");
  }
}

// --- WORKSPACE: MONTHLY CONTENT PLANNER ---
export type ContentPlannerItem = {
  id?: number;
  project_id: number;
  project_name?: string;
  client_id?: number | null;
  client_name?: string | null;
  title: string;
  activity_type: 'shooting' | 'editing' | 'upload' | 'boosting' | 'work';
  platforms?: string[];
  format?: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  start_time?: string | null; // e.g. "10:00 AM"
  status: 'planned' | 'in_progress' | 'in_editing' | 'review' | 'approved' | 'scheduled' | 'published' | 'boosting_active' | 'completed' | 'cancelled';
  caption?: string | null;
  deliverables_url?: string | null;
  boosting_budget?: number | null;
  boosting_currency?: string | null;
  boosting_target?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
};

export interface WorkspaceMonthLink {
  id: number;
  project_id: number;
  year_month: string; // YYYY-MM
  invoice_id?: string | null;
  quotation_id?: string | null;
  notes?: string | null;
  invoice?: {
    invoice_id: string;
    total: number;
    currency: string;
    payment_status: string;
    date: string;
    project_name?: string | null;
  } | null;
  quotation?: {
    id: number;
    amount: number;
    status: string;
    client_name?: string | null;
    date: string;
  } | null;
}

export async function getContentPlannerItems(projectId: number): Promise<ContentPlannerItem[]> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    const rows = await sql`
      SELECT cp.*, p.name as project_name
      FROM workspace_content_planner cp
      LEFT JOIN workspace_projects p ON cp.project_id = p.id
      WHERE cp.project_id = ${projectId}
      ORDER BY cp.start_date ASC, cp.start_time ASC NULLS LAST, cp.id ASC
    `;
    return rows.map((r: any) => ({
      ...r,
      platforms: Array.isArray(r.platforms) ? r.platforms : (typeof r.platforms === 'string' && r.platforms.startsWith('[') ? JSON.parse(r.platforms) : []),
      start_date: formatDateOnly(r.start_date),
      end_date: formatDateOnly(r.end_date) || null,
      boosting_budget: r.boosting_budget ? parseFloat(r.boosting_budget) : null,
    })) as ContentPlannerItem[];
  } catch (error) {
    console.error("Failed to get content planner items:", error);
    return [];
  }
}

export async function getAllContentPlannerItems(): Promise<ContentPlannerItem[]> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    const rows = await sql`
      SELECT cp.*, p.name as project_name
      FROM workspace_content_planner cp
      LEFT JOIN workspace_projects p ON cp.project_id = p.id
      ORDER BY cp.start_date ASC, cp.start_time ASC NULLS LAST, cp.id ASC
    `;
    return rows.map((r: any) => ({
      ...r,
      platforms: Array.isArray(r.platforms) ? r.platforms : (typeof r.platforms === 'string' && r.platforms.startsWith('[') ? JSON.parse(r.platforms) : []),
      start_date: formatDateOnly(r.start_date),
      end_date: formatDateOnly(r.end_date) || null,
      boosting_budget: r.boosting_budget ? parseFloat(r.boosting_budget) : null,
    })) as ContentPlannerItem[];
  } catch (error) {
    console.error("Failed to get all content planner items:", error);
    return [];
  }
}

export async function createContentPlannerItem(data: ContentPlannerItem): Promise<number> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    const result = await sql`
      INSERT INTO workspace_content_planner (
        project_id, title, activity_type, platforms, format,
        start_date, end_date, start_time, status, caption,
        deliverables_url, boosting_budget, boosting_currency, boosting_target,
        notes, assigned_to
      ) VALUES (
        ${data.project_id},
        ${data.title},
        ${data.activity_type || 'upload'},
        ${data.platforms ? JSON.stringify(data.platforms) : '[]'},
        ${data.format || 'Reel'},
        ${data.start_date},
        ${data.end_date || null},
        ${data.start_time || null},
        ${data.status || 'planned'},
        ${data.caption || null},
        ${data.deliverables_url || null},
        ${data.boosting_budget || null},
        ${data.boosting_currency || 'USD'},
        ${data.boosting_target || null},
        ${data.notes || null},
        ${data.assigned_to || null}
      )
      RETURNING id
    `;
    await logSystemAction(`Created content planner item: ${data.title} (${data.activity_type})`);
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return result[0].id;
  } catch (error) {
    console.error("Failed to create content planner item:", error);
    throw new Error("Failed to create content planner item.");
  }
}

export async function updateContentPlannerItem(id: number, data: ContentPlannerItem): Promise<boolean> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    await sql`
      UPDATE workspace_content_planner
      SET
        title = ${data.title},
        activity_type = ${data.activity_type || 'upload'},
        platforms = ${data.platforms ? JSON.stringify(data.platforms) : '[]'},
        format = ${data.format || 'Reel'},
        start_date = ${data.start_date},
        end_date = ${data.end_date || null},
        start_time = ${data.start_time || null},
        status = ${data.status || 'planned'},
        caption = ${data.caption || null},
        deliverables_url = ${data.deliverables_url || null},
        boosting_budget = ${data.boosting_budget || null},
        boosting_currency = ${data.boosting_currency || 'USD'},
        boosting_target = ${data.boosting_target || null},
        notes = ${data.notes || null},
        assigned_to = ${data.assigned_to || null},
        updated_at = now()
      WHERE id = ${id}
    `;
    await logSystemAction(`Updated content planner item ID: ${id}`);
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return true;
  } catch (error) {
    console.error("Failed to update content planner item:", error);
    throw new Error("Failed to update content planner item.");
  }
}

export async function deleteContentPlannerItem(id: number): Promise<boolean> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();
    await sql`DELETE FROM workspace_content_planner WHERE id = ${id}`;
    await logSystemAction(`Deleted content planner item ID: ${id}`);
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return true;
  } catch (error) {
    console.error("Failed to delete content planner item:", error);
    throw new Error("Failed to delete content planner item.");
  }
}

// Month Billing Links Actions
export async function getMonthBillingLinks(projectId?: number, yearMonth?: string): Promise<WorkspaceMonthLink[]> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();

    let rows: any[] = [];
    if (projectId && yearMonth) {
      rows = await sql`
        SELECT 
          l.id, l.project_id, l.year_month, l.invoice_id, l.quotation_id, l.notes,
          i.invoice_id as inv_id, i.total as inv_total, i.currency as inv_currency, i.payment_status as inv_status, i.date as inv_date, 
          COALESCE(NULLIF(i.project_name, ''), NULLIF(ic.full_name, ''), i.user_email) as inv_project,
          q.id as q_id, q.amount as q_amount, q.status as q_status, 
          COALESCE(NULLIF(qc.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as q_client, 
          q.date as q_date
        FROM workspace_month_links l
        LEFT JOIN invoices i ON l.invoice_id = i.invoice_id
        LEFT JOIN admin_clients ic ON LOWER(i.user_email) = LOWER(ic.email)
        LEFT JOIN admin_quotations q ON l.quotation_id = q.id::text
        LEFT JOIN admin_clients qc ON q.client_id = qc.id
        WHERE l.project_id = ${projectId} AND l.year_month = ${yearMonth}
      `;
    } else if (projectId) {
      rows = await sql`
        SELECT 
          l.id, l.project_id, l.year_month, l.invoice_id, l.quotation_id, l.notes,
          i.invoice_id as inv_id, i.total as inv_total, i.currency as inv_currency, i.payment_status as inv_status, i.date as inv_date, 
          COALESCE(NULLIF(i.project_name, ''), NULLIF(ic.full_name, ''), i.user_email) as inv_project,
          q.id as q_id, q.amount as q_amount, q.status as q_status, 
          COALESCE(NULLIF(qc.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as q_client, 
          q.date as q_date
        FROM workspace_month_links l
        LEFT JOIN invoices i ON l.invoice_id = i.invoice_id
        LEFT JOIN admin_clients ic ON LOWER(i.user_email) = LOWER(ic.email)
        LEFT JOIN admin_quotations q ON l.quotation_id = q.id::text
        LEFT JOIN admin_clients qc ON q.client_id = qc.id
        WHERE l.project_id = ${projectId}
      `;
    } else {
      rows = await sql`
        SELECT 
          l.id, l.project_id, l.year_month, l.invoice_id, l.quotation_id, l.notes,
          i.invoice_id as inv_id, i.total as inv_total, i.currency as inv_currency, i.payment_status as inv_status, i.date as inv_date, 
          COALESCE(NULLIF(i.project_name, ''), NULLIF(ic.full_name, ''), i.user_email) as inv_project,
          q.id as q_id, q.amount as q_amount, q.status as q_status, 
          COALESCE(NULLIF(qc.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as q_client, 
          q.date as q_date
        FROM workspace_month_links l
        LEFT JOIN invoices i ON l.invoice_id = i.invoice_id
        LEFT JOIN admin_clients ic ON LOWER(i.user_email) = LOWER(ic.email)
        LEFT JOIN admin_quotations q ON l.quotation_id = q.id::text
        LEFT JOIN admin_clients qc ON q.client_id = qc.id
      `;
    }

    return rows.map((r: any) => ({
      id: r.id,
      project_id: r.project_id,
      year_month: r.year_month,
      invoice_id: r.invoice_id || null,
      quotation_id: r.quotation_id || null,
      notes: r.notes || null,
      invoice: r.inv_id ? {
        invoice_id: r.inv_id,
        total: parseFloat(r.inv_total || 0),
        currency: r.inv_currency || 'USD',
        payment_status: r.inv_status || 'unpaid',
        date: formatDateOnly(r.inv_date),
        project_name: r.inv_project || null,
      } : null,
      quotation: r.q_id ? {
        id: r.q_id,
        amount: parseFloat(r.q_amount || 0),
        status: r.q_status || 'draft',
        client_name: r.q_client || null,
        date: formatDateOnly(r.q_date),
      } : null,
    }));
  } catch (error) {
    console.error("Failed to get month billing links:", error);
    return [];
  }
}

export async function saveMonthBillingLinks(data: {
  project_id: number;
  year_month: string;
  invoice_id?: string | null;
  quotation_id?: string | null;
  notes?: string | null;
}): Promise<boolean> {
  await requireAdminSession();

  try {
    await ensureWorkspaceSchema();

    const cleanInvoiceId = data.invoice_id?.trim() || null;
    const cleanQuotationId = data.quotation_id?.trim() || null;
    const cleanNotes = data.notes?.trim() || null;

    if (!cleanInvoiceId && !cleanQuotationId && !cleanNotes) {
      await sql`
        DELETE FROM workspace_month_links
        WHERE project_id = ${data.project_id} AND year_month = ${data.year_month}
      `;
    } else {
      await sql`
        INSERT INTO workspace_month_links (
          project_id, year_month, invoice_id, quotation_id, notes, updated_at
        ) VALUES (
          ${data.project_id}, ${data.year_month}, ${cleanInvoiceId}, ${cleanQuotationId}, ${cleanNotes}, now()
        )
        ON CONFLICT (project_id, year_month)
        DO UPDATE SET
          invoice_id = EXCLUDED.invoice_id,
          quotation_id = EXCLUDED.quotation_id,
          notes = EXCLUDED.notes,
          updated_at = now()
      `;
    }

    await logSystemAction(`Updated billing links for project ${data.project_id} month ${data.year_month}`);
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return true;
  } catch (error) {
    console.error("Failed to save month billing links:", error);
    throw new Error("Failed to save month billing links.");
  }
}

export async function getBillingOptionsForMonth(projectId?: number): Promise<{
  invoices: Array<{ invoice_id: string; project_name?: string; total: number; currency: string; payment_status: string; date: string }>;
  quotations: Array<{ id: number; client_name?: string; amount: number; status: string; date: string }>;
}> {
  await requireAdminSession();

  try {
    let clientId: number | null = null;
    let clientEmail: string | null = null;
    let clientName: string | null = null;
    let clientCompany: string | null = null;
    let projectName: string | null = null;

    if (projectId) {
      const pRows = await sql`
        SELECT id, name, client_id, client_email, client_name, client_company 
        FROM workspace_projects 
        WHERE id = ${projectId}
      `;
      if (pRows.length > 0) {
        const p = pRows[0];
        clientId = p.client_id ? Number(p.client_id) : null;
        clientEmail = p.client_email ? p.client_email.trim().toLowerCase() : null;
        clientName = p.client_name ? p.client_name.trim().toLowerCase() : null;
        clientCompany = p.client_company ? p.client_company.trim().toLowerCase() : null;
        projectName = p.name ? p.name.trim().toLowerCase() : null;
      }
    }

    if (clientId) {
      const cRows = await sql`SELECT id, email, full_name, company_name FROM admin_clients WHERE id = ${clientId}`;
      if (cRows.length > 0) {
        if (!clientEmail && cRows[0].email) clientEmail = cRows[0].email.trim().toLowerCase();
        if (!clientName && cRows[0].full_name) clientName = cRows[0].full_name.trim().toLowerCase();
        if (!clientCompany && cRows[0].company_name) clientCompany = cRows[0].company_name.trim().toLowerCase();
      }
    } else if (clientEmail) {
      const cRows = await sql`SELECT id, email, full_name, company_name FROM admin_clients WHERE LOWER(email) = ${clientEmail}`;
      if (cRows.length > 0) {
        clientId = Number(cRows[0].id);
        if (!clientName && cRows[0].full_name) clientName = cRows[0].full_name.trim().toLowerCase();
        if (!clientCompany && cRows[0].company_name) clientCompany = cRows[0].company_name.trim().toLowerCase();
      }
    }

    // If client is still not directly mapped, check company name / client name / project name against admin_clients
    if (!clientId) {
      const searchTerms = [clientCompany, clientName, projectName].filter(Boolean) as string[];
      for (const term of searchTerms) {
        const cRows = await sql`
          SELECT id, email, full_name, company_name 
          FROM admin_clients 
          WHERE LOWER(company_name) = ${term} 
             OR LOWER(full_name) = ${term}
             OR (${term.length >= 3} AND (
               LOWER(company_name) ILIKE ${`%${term}%`} 
               OR LOWER(full_name) ILIKE ${`%${term}%`}
             ))
          LIMIT 1
        `;
        if (cRows.length > 0) {
          clientId = Number(cRows[0].id);
          if (!clientEmail && cRows[0].email) clientEmail = cRows[0].email.trim().toLowerCase();
          if (!clientName && cRows[0].full_name) clientName = cRows[0].full_name.trim().toLowerCase();
          if (!clientCompany && cRows[0].company_name) clientCompany = cRows[0].company_name.trim().toLowerCase();
          break;
        }
      }
    }

    let invRows: any[] = [];
    let qRows: any[] = [];

    const hasClientFilter = Boolean(clientId || clientEmail || clientCompany || clientName);

    if (hasClientFilter) {
      invRows = await sql`
        SELECT 
          i.invoice_id, 
          COALESCE(NULLIF(i.project_name, ''), NULLIF(c.full_name, ''), i.user_email) as project_name, 
          i.total, 
          i.currency, 
          i.payment_status, 
          i.date
        FROM invoices i
        LEFT JOIN admin_clients c ON LOWER(i.user_email) = LOWER(c.email)
        WHERE 
          (${clientId || null}::integer IS NOT NULL AND c.id = ${clientId || null})
          OR (${clientEmail || null}::text IS NOT NULL AND LOWER(i.user_email) = ${clientEmail || null})
          OR (${clientCompany || null}::text IS NOT NULL AND (LOWER(i.legal_name) = ${clientCompany || null} OR LOWER(c.company_name) = ${clientCompany || null}))
          OR (${clientName || null}::text IS NOT NULL AND (LOWER(c.full_name) = ${clientName || null} OR LOWER(i.project_name) = ${clientName || null}))
        ORDER BY i.date DESC, i.invoice_id DESC
        LIMIT 150
      `;

      qRows = await sql`
        SELECT 
          q.id, 
          COALESCE(NULLIF(c.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as client_name,
          q.description,
          q.amount, 
          q.status, 
          q.date
        FROM admin_quotations q
        LEFT JOIN admin_clients c ON q.client_id = c.id
        WHERE 
          (${clientId || null}::integer IS NOT NULL AND (q.client_id = ${clientId || null} OR c.id = ${clientId || null}))
          OR (${clientEmail || null}::text IS NOT NULL AND (LOWER(q.client_email) = ${clientEmail || null} OR LOWER(c.email) = ${clientEmail || null}))
          OR (${clientCompany || null}::text IS NOT NULL AND (LOWER(q.legal_name) = ${clientCompany || null} OR LOWER(c.company_name) = ${clientCompany || null}))
          OR (${clientName || null}::text IS NOT NULL AND (LOWER(q.client_name) = ${clientName || null} OR LOWER(c.full_name) = ${clientName || null}))
        ORDER BY q.date DESC, q.id DESC
        LIMIT 150
      `;
    }

    // Also include any invoice or quotation currently linked to this project
    if (projectId) {
      try {
        const existingLinks = await sql`
          SELECT invoice_id, quotation_id 
          FROM workspace_month_links 
          WHERE project_id = ${projectId} AND (invoice_id IS NOT NULL OR quotation_id IS NOT NULL)
        `;
        for (const link of existingLinks) {
          if (link.invoice_id && !invRows.some((inv: any) => inv.invoice_id === link.invoice_id)) {
            const extraInv = await sql`
              SELECT 
                i.invoice_id, 
                COALESCE(NULLIF(i.project_name, ''), NULLIF(c.full_name, ''), i.user_email) as project_name, 
                i.total, 
                i.currency, 
                i.payment_status, 
                i.date
              FROM invoices i
              LEFT JOIN admin_clients c ON LOWER(i.user_email) = LOWER(c.email)
              WHERE i.invoice_id = ${link.invoice_id}
            `;
            if (extraInv.length > 0) invRows.unshift(extraInv[0]);
          }
          if (link.quotation_id && !qRows.some((q: any) => String(q.id) === String(link.quotation_id))) {
            const extraQ = await sql`
              SELECT 
                q.id, 
                COALESCE(NULLIF(c.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as client_name,
                q.description,
                q.amount, 
                q.status, 
                q.date
              FROM admin_quotations q
              LEFT JOIN admin_clients c ON q.client_id = c.id
              WHERE q.id = ${parseInt(link.quotation_id)}
            `;
            if (extraQ.length > 0) qRows.unshift(extraQ[0]);
          }
        }
      } catch {}
    }

    return {
      invoices: invRows.map((r: any) => ({
        invoice_id: r.invoice_id,
        project_name: r.project_name || "",
        total: parseFloat(r.total || 0),
        currency: r.currency || "USD",
        payment_status: r.payment_status || "unpaid",
        date: formatDateOnly(r.date),
      })),
      quotations: qRows.map((r: any) => ({
        id: r.id,
        client_name: r.client_name || r.description || "Quotation",
        amount: parseFloat(r.amount || 0),
        status: r.status || "draft",
        date: formatDateOnly(r.date),
      })),
    };
  } catch (error) {
    console.error("Failed to get billing options:", error);
    return { invoices: [], quotations: [] };
  }
}

// Client Dashboard fetcher: view only client content planner
export async function getClientContentPlanner(clientEmail?: string): Promise<{
  projects: WorkspaceProject[];
  items: ContentPlannerItem[];
  monthLinks: WorkspaceMonthLink[];
}> {
  const session = await requireUserSession();
  const effectiveEmail = (!session.isAdmin && session.email) ? session.email : clientEmail;
  const userId = session.userId;

  try {
    await ensureWorkspaceSchema().catch(() => {});

    // First fetch all projects safely
    const allProjects = await sql`SELECT * FROM workspace_projects ORDER BY created_at DESC`;

    // Find matching client IDs from admin_clients
    let clientIds: number[] = [];
    try {
      if (effectiveEmail && effectiveEmail.trim()) {
        const clientRows = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${effectiveEmail}) OR clerk_id = ${userId}`;
        clientIds = clientRows.map((r: any) => Number(r.id));
      } else {
        const clientRows = await sql`SELECT id FROM admin_clients WHERE clerk_id = ${userId}`;
        clientIds = clientRows.map((r: any) => Number(r.id));
      }
    } catch (e) {
      // Ignore admin_clients lookup if table issue
    }

    const projects = allProjects.filter((p: any) => {
      if (p.client_id && clientIds.includes(Number(p.client_id))) return true;
      if (effectiveEmail && p.client_email && p.client_email.toLowerCase() === effectiveEmail.toLowerCase()) return true;
      return false;
    }).map((r: any) => ({
      ...r,
      client_id: r.client_id ? Number(r.client_id) : null,
      start_date: formatDateOnly(r.start_date),
      deadline: formatDateOnly(r.deadline),
    })) as WorkspaceProject[];

    if (projects.length === 0) {
      return { projects: [], items: [], monthLinks: [] };
    }

    const projectIds = projects.map(p => p.id).filter(Boolean) as number[];
    let itemsRows: any[] = [];
    try {
      itemsRows = await sql`
        SELECT *
        FROM workspace_content_planner
        WHERE project_id IN ${sql(projectIds)} AND status != 'cancelled'
        ORDER BY start_date ASC, start_time ASC NULLS LAST, id ASC
      `;
    } catch (e) {
      // planner table might be empty or in creation
    }

    const items = itemsRows.map((r: any) => ({
      ...r,
      platforms: Array.isArray(r.platforms) ? r.platforms : (typeof r.platforms === 'string' && r.platforms.startsWith('[') ? JSON.parse(r.platforms) : []),
      start_date: formatDateOnly(r.start_date),
      end_date: formatDateOnly(r.end_date) || null,
      boosting_budget: r.boosting_budget ? parseFloat(r.boosting_budget) : null,
    })) as ContentPlannerItem[];

    // Fetch monthLinks for these projects
    let monthLinks: WorkspaceMonthLink[] = [];
    try {
      const linkRows = await sql`
        SELECT 
          l.id, l.project_id, l.year_month, l.invoice_id, l.quotation_id, l.notes,
          i.invoice_id as inv_id, i.total as inv_total, i.currency as inv_currency, i.payment_status as inv_status, i.date as inv_date, 
          COALESCE(NULLIF(i.project_name, ''), NULLIF(ic.full_name, ''), i.user_email) as inv_project,
          q.id as q_id, q.amount as q_amount, q.status as q_status, 
          COALESCE(NULLIF(qc.full_name, ''), NULLIF(q.legal_name, ''), NULLIF(q.client_name, ''), NULLIF(q.description, ''), q.client_email) as q_client, 
          q.date as q_date
        FROM workspace_month_links l
        LEFT JOIN invoices i ON l.invoice_id = i.invoice_id
        LEFT JOIN admin_clients ic ON LOWER(i.user_email) = LOWER(ic.email)
        LEFT JOIN admin_quotations q ON l.quotation_id = q.id::text
        LEFT JOIN admin_clients qc ON q.client_id = qc.id
        WHERE l.project_id IN ${sql(projectIds)}
      `;
      monthLinks = linkRows.map((r: any) => ({
        id: r.id,
        project_id: r.project_id,
        year_month: r.year_month,
        invoice_id: r.invoice_id || null,
        quotation_id: r.quotation_id || null,
        notes: r.notes || null,
        invoice: r.inv_id ? {
          invoice_id: r.inv_id,
          total: parseFloat(r.inv_total || 0),
          currency: r.inv_currency || 'USD',
          payment_status: r.inv_status || 'unpaid',
          date: formatDateOnly(r.inv_date),
          project_name: r.inv_project || null,
        } : null,
        quotation: r.q_id ? {
          id: r.q_id,
          amount: parseFloat(r.q_amount || 0),
          status: r.q_status || 'draft',
          client_name: r.q_client || null,
          date: formatDateOnly(r.q_date),
        } : null,
      }));
    } catch (e) {
      console.warn("Could not fetch month links for client:", e);
    }

    return { projects, items, monthLinks };
  } catch (error) {
    console.error("Failed to get client content planner:", error);
    return { projects: [], items: [], monthLinks: [] };
  }
}

export async function hasClientAssignedProjects(clientEmail?: string): Promise<boolean> {
  const session = await requireUserSession();
  const effectiveEmail = (!session.isAdmin && session.email) ? session.email : clientEmail;
  const userId = session.userId;

  try {
    let email = effectiveEmail?.trim().toLowerCase();
    if (!email && userId) {
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        email = clerkUser?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase();
      } catch (e) {}
    }

    if (!email) return false;

    const rows = await sql`SELECT * FROM workspace_projects`;

    let clientIds: number[] = [];
    try {
      const clientRows = await sql`
        SELECT id FROM admin_clients 
        WHERE LOWER(email) = ${email} OR clerk_id = ${userId}
      `;
      clientIds = clientRows.map((r: any) => Number(r.id));
    } catch {}

    const hasProject = rows.some((p: any) => {
      if (p.client_id && clientIds.includes(Number(p.client_id))) return true;
      if (p.client_email && p.client_email.trim().toLowerCase() === email) return true;
      return false;
    });

    return hasProject;
  } catch (error) {
    console.error("hasClientAssignedProjects error:", error);
    return false;
  }
}

// --- WORKSPACE: TASKS ---
export type WorkspaceTask = {
  id?: number;
  project_id?: number | null;
  name: string;
  status: string;
  assignee_id?: string | null;
  due_date?: string | null;
  priority?: string | null;
  category?: string | null;
  tags?: any;
  order_index?: number;
};

export async function getTasks(): Promise<WorkspaceTask[]> {
  await requireAdminSession();

  try {
    const rows = await sql`SELECT * FROM workspace_tasks ORDER BY order_index ASC, created_at DESC`;
    return rows.map((r: any) => ({
      ...r,
      due_date: formatDateOnly(r.due_date),
    })) as WorkspaceTask[];
  } catch (error) {
    console.error("Failed to get tasks:", error);
    return [];
  }
}

export async function createTask(data: WorkspaceTask): Promise<number> {
  await requireAdminSession();

  try {
    const result = await sql`
      INSERT INTO workspace_tasks (
        project_id, name, status, assignee_id, due_date, priority, tags, order_index, category
      ) VALUES (
        ${data.project_id || null}, ${data.name}, ${data.status || 'Not Started'},
        ${data.assignee_id || null}, ${data.due_date || null}, ${data.priority || null},
        ${data.tags ? JSON.stringify(data.tags) : null}, ${data.order_index || 0}, ${data.category || null}
      )
      RETURNING id
    `;
    await logSystemAction(`Created workspace task: ${data.name}`);
    return result[0].id;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Failed to create task.");
  }
}

export async function updateTask(id: number, data: WorkspaceTask): Promise<boolean> {
  await requireAdminSession();

  try {
    await sql`
      UPDATE workspace_tasks
      SET
        project_id = ${data.project_id || null}, name = ${data.name}, status = ${data.status},
        assignee_id = ${data.assignee_id || null}, due_date = ${data.due_date || null},
        priority = ${data.priority || null}, tags = ${data.tags ? JSON.stringify(data.tags) : null}, order_index = ${data.order_index || 0}, category = ${data.category || null},
        updated_at = now()
      WHERE id = ${id}
    `;
    await logSystemAction(`Updated workspace task: ${data.name}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to update task:", error);
    throw new Error("Failed to update task.");
  }
}

export async function deleteTask(id: number): Promise<boolean> {
  await requireAdminSession();

  try {
    await sql`DELETE FROM workspace_tasks WHERE id = ${id}`;
    await logSystemAction(`Deleted workspace task ID: ${id}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw new Error("Failed to delete task.");
  }
}

// --- WORKSPACE: MOODBOARDS ---
export type WorkspaceMoodboard = {
  id?: number;
  task_id?: number | null;
  project_id?: number | null;
  title: string;
  images?: any;
};

export async function getMoodboards(): Promise<WorkspaceMoodboard[]> {
  await requireAdminSession();

  try {
    const rows = await sql`SELECT * FROM workspace_moodboards ORDER BY created_at DESC`;
    return rows as unknown as WorkspaceMoodboard[];
  } catch (error) {
    console.error("Failed to get moodboards:", error);
    return [];
  }
}

export async function saveMoodboard(data: WorkspaceMoodboard): Promise<number> {
  await requireAdminSession();

  try {
    if (data.id) {
      await sql`
        UPDATE workspace_moodboards
        SET title = ${data.title}, images = ${data.images ? JSON.stringify(data.images) : null},
            task_id = ${data.task_id || null}, project_id = ${data.project_id || null}
        WHERE id = ${data.id}
      `;
      await logSystemAction(`Updated moodboard: ${data.title}`);
      return data.id;
    } else {
      const result = await sql`
        INSERT INTO workspace_moodboards (task_id, project_id, title, images)
        VALUES (${data.task_id || null}, ${data.project_id || null}, ${data.title}, ${data.images ? JSON.stringify(data.images) : null})
        RETURNING id
      `;
      await logSystemAction(`Created moodboard: ${data.title}`);
      return result[0].id;
    }
  } catch (error) {
    console.error("Failed to save moodboard:", error);
    throw new Error("Failed to save moodboard.");
  }
}
