-- ============================================================================
-- Phase 3: Additive Database Migration for Sensitive Field Encryption
-- Strictly Additive: No columns are dropped or modified.
-- ============================================================================

-- 1. admin_accounts: Encrypted account number & deterministic blind index
ALTER TABLE admin_accounts 
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_number_bidx TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_accounts_acc_num_bidx 
  ON admin_accounts(account_number_bidx);

-- 2. users: Encrypted personal identification, phone, and address
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS nic_passport_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS phone_bidx TEXT;

CREATE INDEX IF NOT EXISTS idx_users_phone_bidx 
  ON users(phone_bidx);

-- 3. admin_clients: Encrypted phone and address
ALTER TABLE admin_clients 
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS phone_bidx TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_clients_phone_bidx 
  ON admin_clients(phone_bidx);

-- 4. admin_agreements: Encrypted client signature vector data
ALTER TABLE admin_agreements 
  ADD COLUMN IF NOT EXISTS client_sig_image_encrypted TEXT;
