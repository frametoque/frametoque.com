import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

// Load .env.local if present
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function run() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL or POSTGRES_URL is not set.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(dbUrl, { ssl: 'require', max: 2 });

  try {
    console.log('\n--- Checking current RLS status on public tables ---');
    const beforeTables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const targetTables = ['admin_site_credentials', 'workspace_content_planner', 'workspace_month_links'];
    
    for (const t of beforeTables) {
      const isTarget = targetTables.includes(t.tablename);
      console.log(`- ${t.tablename}: RLS ${t.rowsecurity ? 'ENABLED' : 'DISABLED'}${isTarget ? ' [TARGET]' : ''}`);
    }

    console.log('\n--- Enabling RLS on target tables ---');
    for (const table of targetTables) {
      const exists = beforeTables.some(t => t.tablename === table);
      if (exists) {
        console.log(`Enabling RLS on public.${table}...`);
        await sql.unsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`✓ public.${table} RLS enabled.`);
      } else {
        console.log(`Notice: public.${table} does not exist yet.`);
      }
    }

    console.log('\n--- Dropping overly permissive RLS policies ---');
    const permissiveTables = ['workspace_moodboards', 'workspace_projects', 'workspace_tasks', 'workspace_team'];
    for (const table of permissiveTables) {
      await sql.unsafe(`DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public."${table}";`);
      console.log(`✓ public.${table} dropped permissive policy.`);
    }

    console.log('\n--- Verification ---');
    const afterTables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = ANY(${targetTables})
      ORDER BY tablename;
    `;

    for (const t of afterTables) {
      console.log(`- ${t.tablename}: RLS ${t.rowsecurity ? 'ENABLED (Verified)' : 'DISABLED (Failed)'}`);
    }

    console.log('\nAll target tables have RLS enabled successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();

