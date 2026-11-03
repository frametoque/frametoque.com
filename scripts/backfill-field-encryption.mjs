import crypto from "node:crypto";
import postgres from "postgres";

/**
 * Self-contained cryptographic encryption & blind-indexing helpers.
 */
const CIPHER_ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

function getMasterKey() {
  const rawKey =
    process.env.APP_FIELD_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY;

  if (!rawKey) {
    throw new Error("Missing encryption key. Set APP_FIELD_ENCRYPTION_KEY or CREDENTIALS_ENCRYPTION_KEY.");
  }
  return crypto.createHash("sha256").update(rawKey).digest();
}

function getBlindIndexKey() {
  const master = getMasterKey();
  return crypto.createHmac("sha256", master).update("frametoque:blind-index:salt-v1").digest();
}

function encryptField(plaintext, aadContext) {
  if (!plaintext) return null;
  const masterKey = getMasterKey();
  const dek = Buffer.from(
    crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, dek, iv);
  cipher.setAAD(Buffer.from(aadContext, "utf8"));
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CURRENT_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptField(ciphertext, aadContext) {
  if (!ciphertext || !ciphertext.startsWith("v1:")) return ciphertext;
  const parts = ciphertext.split(":");
  if (parts.length !== 4) return ciphertext;
  const [, ivHex, tagHex, dataHex] = parts;
  const masterKey = getMasterKey();
  const dek = Buffer.from(
    crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
  );
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, dek, Buffer.from(ivHex, "hex"));
  decipher.setAAD(Buffer.from(aadContext, "utf8"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

function generateBlindIndex(value, context) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  const bidxKey = getBlindIndexKey();
  return crypto.createHmac("sha256", bidxKey).update(`${context}:${normalized}`).digest("hex");
}

async function runBackfill() {
  const isDryRun = process.argv.includes("--dry-run");
  const isRollback = process.argv.includes("--rollback");

  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Error: Database connection URL (DATABASE_URL) is not set.");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: "require", max: 5 });

  console.log(`Starting Phase 3 Backfill (DryRun: ${isDryRun}, Rollback: ${isRollback})...`);

  try {
    if (isRollback) {
      console.log("Executing Rollback: Clearing encrypted columns while keeping plaintext untouched...");
      await sql`UPDATE admin_accounts SET account_number_encrypted = NULL, account_number_bidx = NULL`;
      await sql`UPDATE users SET phone_encrypted = NULL, nic_passport_encrypted = NULL, address_encrypted = NULL, phone_bidx = NULL`;
      await sql`UPDATE admin_clients SET phone_encrypted = NULL, address_encrypted = NULL, phone_bidx = NULL`;
      console.log("Rollback completed successfully.");
      await sql.end();
      return;
    }

    // 1. Backfill admin_accounts
    console.log("1. Backfilling admin_accounts...");
    const accounts = await sql`
      SELECT id, account_number 
      FROM admin_accounts 
      WHERE account_number IS NOT NULL AND account_number != '' AND account_number_encrypted IS NULL
    `;
    console.log(`Found ${accounts.length} admin_accounts rows needing encryption.`);

    for (const acc of accounts) {
      const encrypted = encryptField(acc.account_number, `admin_accounts:${acc.id}`);
      const bidx = generateBlindIndex(acc.account_number, "bank_account");
      
      // Verification check before write
      const decrypted = decryptField(encrypted, `admin_accounts:${acc.id}`);
      if (decrypted !== acc.account_number) {
        throw new Error(`Self-check failed for account id ${acc.id}! Decrypted does not match plaintext.`);
      }

      if (!isDryRun) {
        await sql`
          UPDATE admin_accounts 
          SET account_number_encrypted = ${encrypted}, account_number_bidx = ${bidx}
          WHERE id = ${acc.id}
        `;
      }
    }

    // 2. Backfill admin_clients
    console.log("2. Backfilling admin_clients...");
    const clients = await sql`
      SELECT id, phone, address 
      FROM admin_clients 
      WHERE (phone IS NOT NULL OR address IS NOT NULL) AND phone_encrypted IS NULL
    `;
    console.log(`Found ${clients.length} admin_clients rows needing encryption.`);

    for (const client of clients) {
      const encPhone = client.phone ? encryptField(client.phone, `admin_clients:phone:${client.id}`) : null;
      const encAddress = client.address ? encryptField(client.address, `admin_clients:address:${client.id}`) : null;
      const phoneBidx = client.phone ? generateBlindIndex(client.phone, "phone") : null;

      if (!isDryRun) {
        await sql`
          UPDATE admin_clients 
          SET phone_encrypted = ${encPhone}, address_encrypted = ${encAddress}, phone_bidx = ${phoneBidx}
          WHERE id = ${client.id}
        `;
      }
    }

    console.log("Phase 3 field encryption backfill and verification completed successfully.");
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runBackfill();
