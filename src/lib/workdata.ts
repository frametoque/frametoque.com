import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export default sql;

export interface PhotographyImage {
  src: string;
  width: number;
  height: number;
}

export interface PhotographyEvent {
  name: string;
  images: PhotographyImage[];
}

export interface VideoProject {
  url: string;
}

export interface WebDevImage {
  image: string;
  domain: string;
}

export interface SiteDetails {
  domain: string;
  title: string;
  description: string;
  techs: string[];
  url: string;
}

export async function getPhotography(): Promise<PhotographyEvent[]> {
  const rows = await sql`
    SELECT event_name, src, width, height 
    FROM work_photography 
    ORDER BY id
  `;

  const eventMap = new Map<string, PhotographyImage[]>();
  for (const row of rows) {
    if (!eventMap.has(row.event_name)) eventMap.set(row.event_name, []);
    eventMap.get(row.event_name)!.push({
      src: row.src as string,
      width: row.width as number,
      height: row.height as number,
    });
  }

  return Array.from(eventMap.entries()).map(([name, images]) => ({ name, images }));
}

export async function getGraphics(): Promise<string[]> {
  const rows = await sql`SELECT image_path FROM work_graphics ORDER BY id`;
  return rows.map((r) => r.image_path as string);
}

export async function getVideography(): Promise<VideoProject[]> {
  const rows = await sql`SELECT url FROM work_videography ORDER BY id`;
  return rows.map((r) => ({ url: r.url as string }));
}

export async function getVideoEditing(): Promise<VideoProject[]> {
  const rows = await sql`SELECT url FROM work_videoediting ORDER BY id`;
  return rows.map((r) => ({ url: r.url as string }));
}

export async function getWebProjects(): Promise<{
  projects: WebDevImage[];
  detailsMap: Record<string, SiteDetails>;
}> {
  const rows = await sql`SELECT * FROM work_web ORDER BY id`;

  const projects: WebDevImage[] = rows.map((r) => ({
    image: r.image_path as string,
    domain: r.domain as string,
  }));

  const detailsMap: Record<string, SiteDetails> = Object.fromEntries(
    rows.map((r) => [
      r.domain,
      {
        domain: r.domain as string,
        title: r.title as string,
        description: r.description as string,
        techs: r.techs as string[],
        url: r.url as string,
      },
    ])
  );

  return { projects, detailsMap };
}