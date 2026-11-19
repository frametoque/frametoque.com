-- ============================================================================
-- Phase 3: Additive Database Migration for Sensitive Field Encryption (v2)
-- Strictly Additive: No columns or tables are dropped or overwritten.
-- ============================================================================

-- 1. admin_agreements: Encrypted client phone & address + blind index
ALTER TABLE IF EXISTS public.admin_agreements 
  ADD COLUMN IF NOT EXISTS client_phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS client_phone_bidx TEXT,
  ADD COLUMN IF NOT EXISTS client_address_encrypted TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_agreements_phone_bidx 
  ON public.admin_agreements(client_phone_bidx);

-- 2. admin_rentals: Encrypted client phone + blind index
ALTER TABLE IF EXISTS public.admin_rentals 
  ADD COLUMN IF NOT EXISTS client_phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS client_phone_bidx TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_rentals_phone_bidx 
  ON public.admin_rentals(client_phone_bidx);

-- 3. admin_domain_orders: Encrypted registrant contacts
ALTER TABLE IF EXISTS public.admin_domain_orders
  ADD COLUMN IF NOT EXISTS registrant_contacts_encrypted TEXT;
