import sql from "@/lib/db";
import { resolveMediaUrl } from "@/lib/storage";

const TABLE_MAP: Record<string, string> = {
  "web-dev":        "services_webdev",
  "graphic-design": "services_graphic",
  "video-editing":  "services_videoedit",
  "photo-video":    "services_photovideo",
  "event-productions": "services_eventproductions",
  "saas-products":  "services_saas",
};

const CATEGORY_MAP: Record<string, string> = {
  "web-dev":        "Web Development",
  "graphic-design": "Graphic Design",
  "video-editing":  "Video Editing",
  "photo-video":    "Photography & Videography",
  "event-productions": "Event Productions",
  "saas-products":  "SaaS Products",
};

export type ServiceRow = {
  id: number;
  service_id: string;
  title: string;
  description: string;
  overview: string;
  hero_image: string;
  features: Feature[];
  packages: Package[];
  process: ProcessStep[];
  technologies: string[];
  category: string;
  arm?: string;
  monthly_price?: string;
  yearly_price?: string;
  demo_url?: string;
};

export type Feature = {
  icon: string;
  title: string;
  description: string;
};

export type Package = {
  tier: string;
  description: string;
  price: string;
  price_yearly?: string;
  popular: boolean;
  duration: string;
  cta: string;
  features: string[];
};

export type ProcessStep = {
  step: number;
  title: string;
  description: string;
};

export type ServiceCard = {
  key: string;
  title: string;
  desc: string;
  price: string;
  img: string;
  link: string;
};

export function safeParseArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Get all services for a category as cards (for listing page) */
export async function getServiceCards(categorySlug: string, arm?: string): Promise<ServiceCard[]> {
  const table = TABLE_MAP[categorySlug];
  if (!table) return [];

  let rows: (ServiceRow & { arm?: string })[] = [];

  try {
    if (arm) {
      const normalizedArm = arm === "productions" ? "production" : arm;
      rows = (await sql.unsafe(
        `SELECT service_id, title, overview, packages, hero_image, arm 
         FROM ${table} 
         WHERE arm IS NULL OR arm = 'both' OR arm = $1 OR arm = $2
         ORDER BY sort_order ASC, id ASC`,
        [normalizedArm, arm]
      )) as (ServiceRow & { arm?: string })[];
    } else {
      rows = (await sql.unsafe(
        `SELECT service_id, title, overview, packages, hero_image, arm 
         FROM ${table} 
         ORDER BY sort_order ASC, id ASC`
      )) as (ServiceRow & { arm?: string })[];
    }
  } catch {
    // Graceful fallback if arm column does not exist yet
    rows = (await sql.unsafe(
      `SELECT service_id, title, overview, packages, hero_image 
       FROM ${table} 
       ORDER BY sort_order ASC, id ASC`
    )) as ServiceRow[];
  }

  const armPrefix = arm === "digital" ? "/digital/services" : arm === "productions" ? "/productions/services" : "/services";

  return rows.map((row) => {
    const pkgs = safeParseArray<Package>(row.packages);
    const firstPkg = pkgs[0];
    const price = firstPkg?.price ?? "0";
    return {
      key:   row.service_id,
      title: row.title,
      desc:  row.overview,
      price,
      img:   resolveMediaUrl(row.hero_image) || "/services/eventpulse.png",
      link:  `${armPrefix}/${categorySlug}/${row.service_id}`,
    };
  });
}

/** Get a single service by slug from all tables */
export async function getServiceBySlug(serviceId: string): Promise<(ServiceRow & { categorySlug: string }) | null> {
  for (const [slug, table] of Object.entries(TABLE_MAP)) {
    const rows = await sql.unsafe(
      `SELECT * FROM ${table} WHERE service_id = $1 LIMIT 1`,
      [serviceId]
    ) as ServiceRow[];

    if (rows.length > 0) {
      return {
        ...rows[0],
        features: safeParseArray(rows[0].features),
        packages: safeParseArray(rows[0].packages),
        process: safeParseArray(rows[0].process),
        technologies: safeParseArray(rows[0].technologies),
        category: CATEGORY_MAP[slug],
        categorySlug: slug,
      };
    }
  }
  return null;
}

/** Get a single service by slug from a specific category table */
export async function getServiceBySlugAndCategory(
  serviceId: string,
  categorySlug: string
): Promise<ServiceRow | null> {
  const table = TABLE_MAP[categorySlug];
  if (!table) return null;

  const rows = await sql.unsafe(
    `SELECT * FROM ${table} WHERE service_id = $1 LIMIT 1`,
    [serviceId]
  ) as ServiceRow[];

  if (!rows[0]) return null;

  return {
    ...rows[0],
    features: safeParseArray(rows[0].features),
    packages: safeParseArray(rows[0].packages),
    process: safeParseArray(rows[0].process),
    technologies: safeParseArray(rows[0].technologies),
    category: CATEGORY_MAP[categorySlug],
  };
}

/** Get metadata for a service detail page */
export async function getServiceMeta(serviceId: string) {
  const service = await getServiceBySlug(serviceId);
  if (!service) return null;
  return {
    title:        service.title,
    description:  service.description,
    heroImage:    service.hero_image,
    categorySlug: service.categorySlug,
  };
}

export { TABLE_MAP, CATEGORY_MAP };