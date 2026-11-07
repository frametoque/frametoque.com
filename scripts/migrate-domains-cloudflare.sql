-- Migration: Cloudflare Domains Reselling Extension
-- Adds required columns and tables for full domain management

-- 1. Extend admin_domain_orders
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

-- 2. Create domain_audit_log table
CREATE TABLE IF NOT EXISTS domain_audit_log (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_audit_domain ON domain_audit_log(domain_name);
CREATE INDEX IF NOT EXISTS idx_domain_audit_user ON domain_audit_log(user_email);

-- 3. Create tld_pricing table for admin markup & retail management
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

-- Seed initial popular TLDs if empty
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

