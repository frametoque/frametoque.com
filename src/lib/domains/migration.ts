import sql from "@/lib/db";

const globalForDomainMigration = globalThis as unknown as {
  isDomainMigrated?: boolean;
  domainMigrationPromise?: Promise<void>;
};

/**
 * Ensures domain management tables and column extensions exist.
 * Cached globally so it only runs once per Node.js process.
 */
export async function ensureDomainTables(): Promise<void> {
  if (globalForDomainMigration.isDomainMigrated) return;

  if (globalForDomainMigration.domainMigrationPromise) {
    return globalForDomainMigration.domainMigrationPromise;
  }

  const migrationPromise = (async () => {
    try {
      // Fast check: if zone_id column already exists, tables are already migrated
      const check = await sql`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_domain_orders' AND column_name = 'zone_id' 
        LIMIT 1
      `;
      if (check.length > 0) {
        globalForDomainMigration.isDomainMigrated = true;
        return;
      }

      // 1. Extend admin_domain_orders with domain control columns
      await sql`
        ALTER TABLE admin_domain_orders 
          ADD COLUMN IF NOT EXISTS zone_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS privacy_enabled BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS nameservers JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS registrant_contacts JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(50) DEFAULT 'none',
          ADD COLUMN IF NOT EXISTS dnssec_status VARCHAR(50) DEFAULT 'disabled',
          ADD COLUMN IF NOT EXISTS cloudflare_sync_at TIMESTAMPTZ;
      `;

      // 2. Create domain_audit_log table
      await sql`
        CREATE TABLE IF NOT EXISTS domain_audit_log (
          id SERIAL PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          domain_name VARCHAR(255) NOT NULL,
          action VARCHAR(100) NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          ip_address VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_domain_audit_domain ON domain_audit_log(domain_name);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_domain_audit_user ON domain_audit_log(user_email);
      `;

      // 2b. Create domain_custom_dns_records table
      await sql`
        CREATE TABLE IF NOT EXISTS domain_custom_dns_records (
          id VARCHAR(255) PRIMARY KEY,
          domain_id INTEGER NOT NULL REFERENCES admin_domain_orders(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          ttl INTEGER DEFAULT 1,
          proxied BOOLEAN DEFAULT FALSE,
          priority INTEGER,
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      await sql`
        ALTER TABLE domain_custom_dns_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_domain_dns_domain_id ON domain_custom_dns_records(domain_id);
      `;

      // 3. Create tld_pricing table for admin markup & retail management
      await sql`
        CREATE TABLE IF NOT EXISTS tld_pricing (
          id SERIAL PRIMARY KEY,
          tld VARCHAR(50) UNIQUE NOT NULL,
          cost_price NUMERIC(10, 2) NOT NULL,
          markup NUMERIC(10, 2) NOT NULL DEFAULT 5.50,
          selling_price NUMERIC(10, 2) NOT NULL,
          renewal_cost NUMERIC(10, 2) NOT NULL,
          renewal_price NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          provider VARCHAR(50) DEFAULT 'Cloudflare',
          is_active BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      // Seed default pricing if empty
      await sql`
        INSERT INTO tld_pricing (tld, cost_price, markup, selling_price, renewal_cost, renewal_price, provider)
        VALUES
          ('com', 10.46, 5.50, 15.96, 10.46, 15.96, 'Cloudflare'),
          ('net', 11.86, 5.50, 17.36, 11.86, 17.36, 'Cloudflare'),
          ('org', 8.50, 5.50, 14.00, 11.20, 16.70, 'Cloudflare'),
          ('io', 35.00, 5.50, 40.50, 35.00, 40.50, 'Cloudflare'),
          ('xyz', 2.99, 5.50, 8.49, 12.99, 18.49, 'Cloudflare'),
          ('ca', 9.19, 5.50, 14.69, 9.19, 14.69, 'Cloudflare'),
          ('uk', 5.30, 5.50, 10.80, 5.30, 10.80, 'Cloudflare'),
          ('engineering', 50.20, 5.50, 55.70, 50.20, 55.70, 'Cloudflare'),
          ('lk', 18.00, 7.00, 25.00, 18.00, 25.00, 'LK Domain Registry')
        ON CONFLICT (tld) DO NOTHING;
      `;

      // 4. Admin Real Provider Update
      await sql`
        UPDATE tld_pricing
        SET provider = CASE 
          WHEN LOWER(tld) = 'lk' THEN 'LK Domain Registry'
          ELSE 'Cloudflare'
        END;
      `;

      globalForDomainMigration.isDomainMigrated = true;
    } catch (err) {
      console.warn("[Domains Migration] Migration notice:", err);
    } finally {
      globalForDomainMigration.domainMigrationPromise = undefined;
    }
  })();

  globalForDomainMigration.domainMigrationPromise = migrationPromise;
  return migrationPromise;
}

