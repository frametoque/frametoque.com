"use server";
import { revalidatePath } from "next/cache";
import { clerkClient, auth } from "@clerk/nextjs/server";
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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
              details: `Project deadline for ${p.name}. Status: ${p.status}`
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
        const tasks = await sql`SELECT id, name, due_date, status FROM workspace_tasks WHERE due_date IS NOT NULL AND status != 'Done'`;
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

// --- WORKSPACE: TEAM ---
export type WorkspaceTeam = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string;
};

export async function getTeamMembers(): Promise<WorkspaceTeam[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
      .map((user) => ({
        id: user.emailAddresses?.[0]?.emailAddress || user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || user.emailAddresses?.[0]?.emailAddress || "Unknown",
        email: user.emailAddresses?.[0]?.emailAddress || "",
        role: "team",
        image: user.imageUrl || "",
      }));
      
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
};

export async function getProjects(): Promise<WorkspaceProject[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const rows = await sql`SELECT * FROM workspace_projects ORDER BY created_at DESC`;
    return rows.map((r: any) => ({
      ...r,
      start_date: formatDateOnly(r.start_date),
      deadline: formatDateOnly(r.deadline),
    })) as WorkspaceProject[];
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
}

export async function createProject(data: WorkspaceProject): Promise<number> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const result = await sql`
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
    return result[0].id;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw new Error("Failed to create project.");
  }
}

export async function updateProject(id: number, data: WorkspaceProject): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await sql`
      UPDATE workspace_projects
      SET
        name = ${data.name}, status = ${data.status}, categories = ${data.categories ? JSON.stringify(data.categories) : '[]'}, owner_ids = ${data.owner_ids ? JSON.stringify(data.owner_ids) : '[]'},
        start_date = ${data.start_date || null}, deadline = ${data.deadline || null},
        priority = ${data.priority || null}, completion_percentage = ${data.completion_percentage || 0},
        blocked_by = ${data.blocked_by || null}, updated_at = now()
      WHERE id = ${id}
    `;
    await logSystemAction(`Updated workspace project: ${data.name}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to update project:", error);
    throw new Error("Failed to update project.");
  }
}

export async function deleteProject(id: number): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await sql`DELETE FROM workspace_projects WHERE id = ${id}`;
    await logSystemAction(`Deleted workspace project ID: ${id}`);
    revalidatePath("/admin", "layout");
    return true;
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw new Error("Failed to delete project.");
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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const rows = await sql`SELECT * FROM workspace_moodboards ORDER BY created_at DESC`;
    return rows as unknown as WorkspaceMoodboard[];
  } catch (error) {
    console.error("Failed to get moodboards:", error);
    return [];
  }
}

export async function saveMoodboard(data: WorkspaceMoodboard): Promise<number> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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
