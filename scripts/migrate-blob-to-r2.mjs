import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
  console.log('--- Frametoque: Vercel Blob -> Cloudflare R2 Migration Tool ---');
  console.log('Checking environment variables...');

  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasR2 = Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );

  console.log(`- Vercel Blob token: ${hasBlob ? 'Found' : 'MISSING'}`);
  console.log(`- Cloudflare R2 config: ${hasR2 ? 'Found' : 'MISSING'}`);

  if (!hasR2) {
    console.error('ERROR: Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .env.local');
    process.exit(1);
  }

  if (!hasBlob) {
    console.error('ERROR: BLOB_READ_WRITE_TOKEN is missing in .env.local.');
    process.exit(1);
  }

  // Dynamic import of the migration module
  const { migrateVercelBlobToR2 } = await import('../src/lib/migrate-blob-to-r2.js').catch(async () => {
    // If not compiled yet, run via tsx or dynamic
    return await import('../src/lib/migrate-blob-to-r2.ts');
  });

  const updateDb = process.argv.includes('--update-db');
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Options: dryRun=${dryRun}, updateDb=${updateDb}`);
  const result = await migrateVercelBlobToR2({
    updateDatabaseUrls: updateDb,
    dryRun,
  });

  console.log('--- Migration Finished ---');
  console.log(`Total items found:    ${result.totalFound}`);
  console.log(`Successfully moved:   ${result.migratedCount}`);
  console.log(`Failed:               ${result.failedCount}`);
  if (result.errors.length > 0) {
    console.log('Errors:', result.errors);
  }
  if (result.dbUpdatedTables) {
    console.log('Database rows updated:', result.dbUpdatedTables);
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
