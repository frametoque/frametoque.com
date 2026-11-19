import postgres from "postgres";
import crypto from "node:crypto";

const CIPHER_ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

const rawKey =
  process.env.APP_FIELD_ENCRYPTION_KEY ||
  process.env.CREDENTIALS_ENCRYPTION_KEY ||
  "dev-frametoque-field-vault-master-key-2026";

const masterKey = crypto.createHash("sha256").update(rawKey).digest();
const blindIndexKey = crypto.createHmac("sha256", masterKey).update("frametoque:blind-index:salt-v1").digest();

function encryptField(plaintext, aadContext) {
  if (!plaintext) return null;
  const dek = Buffer.from(
    crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, dek, iv);
  cipher.setAAD(Buffer.from(aadContext, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CURRENT_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptField(encryptedValue, aadContext) {
  if (!encryptedValue || !encryptedValue.startsWith("v1:")) return encryptedValue;
  try {
    const parts = encryptedValue.split(":");
    if (parts.length !== 4) return encryptedValue;
    const [, ivHex, tagHex, dataHex] = parts;
    const dek = Buffer.from(
      crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
    );
    const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, dek, Buffer.from(ivHex, "hex"));
    decipher.setAAD(Buffer.from(aadContext, "utf8"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function generateBlindIndex(value, context) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHmac("sha256", blindIndexKey).update(`${context}:${normalized}`).digest("hex");
}

async function runBackfill() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  console.log("Starting additive field-level encryption backfill...");

  let updatedAccounts = 0;
  let updatedClients = 0;
  let updatedAgreements = 0;
  let updatedRentals = 0;

  try {
    // 1. Backfill admin_accounts
    try {
      const accounts = await sql`
        SELECT id, account_number, account_number_encrypted 
        FROM admin_accounts 
        WHERE account_number IS NOT NULL AND account_number != ''
      `;
      for (const acc of accounts) {
        if (!acc.account_number_encrypted) {
          const enc = encryptField(acc.account_number, "admin_accounts");
          const bidx = generateBlindIndex(acc.account_number, "bank_account");
          // Verification
          const dec = decryptField(enc, "admin_accounts");
          if (dec !== acc.account_number) throw new Error(`Decryption mismatch for account ${acc.id}`);
          await sql`
            UPDATE admin_accounts 
            SET account_number_encrypted = ${enc}, account_number_bidx = ${bidx} 
            WHERE id = ${acc.id}
          `;
          updatedAccounts++;
        }
      }
    } catch (e) {
      console.warn("Notice: admin_accounts backfill skipped or partial:", e.message);
    }

    // 2. Backfill admin_clients
    try {
      const clients = await sql`
        SELECT id, phone, phone_encrypted, address, address_encrypted 
        FROM admin_clients 
        WHERE (phone IS NOT NULL AND phone_encrypted IS NULL) 
           OR (address IS NOT NULL AND address_encrypted IS NULL)
      `;
      for (const cl of clients) {
        if (cl.phone && !cl.phone_encrypted) {
          const encPhone = encryptField(cl.phone, `client:phone:${cl.id}`);
          const bidxPhone = generateBlindIndex(cl.phone, "phone");
          if (decryptField(encPhone, `client:phone:${cl.id}`) !== cl.phone) {
            throw new Error(`Decryption mismatch for client phone ${cl.id}`);
          }
          await sql`
            UPDATE admin_clients 
            SET phone_encrypted = ${encPhone}, phone_bidx = ${bidxPhone} 
            WHERE id = ${cl.id}
          `;
          updatedClients++;
        }
        if (cl.address && !cl.address_encrypted) {
          const encAddr = encryptField(cl.address, `client:address:${cl.id}`);
          if (decryptField(encAddr, `client:address:${cl.id}`) !== cl.address) {
            throw new Error(`Decryption mismatch for client address ${cl.id}`);
          }
          await sql`
            UPDATE admin_clients 
            SET address_encrypted = ${encAddr} 
            WHERE id = ${cl.id}
          `;
        }
      }
    } catch (e) {
      console.warn("Notice: admin_clients backfill skipped or partial:", e.message);
    }

    // 3. Backfill admin_agreements
    try {
      const agreements = await sql`
        SELECT id, client_sig_image, client_sig_image_encrypted, client_phone, client_address 
        FROM admin_agreements 
        WHERE (client_sig_image IS NOT NULL AND client_sig_image_encrypted IS NULL)
      `;
      for (const ag of agreements) {
        if (ag.client_sig_image && !ag.client_sig_image_encrypted) {
          const encSig = encryptField(ag.client_sig_image, `agreement:sig:${ag.id}`);
          if (decryptField(encSig, `agreement:sig:${ag.id}`) !== ag.client_sig_image) {
            throw new Error(`Decryption mismatch for agreement sig ${ag.id}`);
          }
          await sql`
            UPDATE admin_agreements 
            SET client_sig_image_encrypted = ${encSig} 
            WHERE id = ${ag.id}
          `;
          updatedAgreements++;
        }
      }
    } catch (e) {
      console.warn("Notice: admin_agreements backfill skipped or partial:", e.message);
    }

    // 4. Backfill admin_rentals
    try {
      const rentals = await sql`
        SELECT id, customer_phone, customer_phone_encrypted, customer_address, customer_address_encrypted 
        FROM admin_rentals 
        WHERE (customer_phone IS NOT NULL AND customer_phone_encrypted IS NULL)
           OR (customer_address IS NOT NULL AND customer_address_encrypted IS NULL)
      `;
      for (const r of rentals) {
        if (r.customer_phone && !r.customer_phone_encrypted) {
          const encPhone = encryptField(r.customer_phone, `rental:phone:${r.id}`);
          const bidxPhone = generateBlindIndex(r.customer_phone, "phone");
          if (decryptField(encPhone, `rental:phone:${r.id}`) !== r.customer_phone) {
            throw new Error(`Decryption mismatch for rental phone ${r.id}`);
          }
          await sql`
            UPDATE admin_rentals 
            SET customer_phone_encrypted = ${encPhone}, customer_phone_bidx = ${bidxPhone} 
            WHERE id = ${r.id}
          `;
          updatedRentals++;
        }
        if (r.customer_address && !r.customer_address_encrypted) {
          const encAddr = encryptField(r.customer_address, `rental:address:${r.id}`);
          if (decryptField(encAddr, `rental:address:${r.id}`) !== r.customer_address) {
            throw new Error(`Decryption mismatch for rental address ${r.id}`);
          }
          await sql`
            UPDATE admin_rentals 
            SET customer_address_encrypted = ${encAddr} 
            WHERE id = ${r.id}
          `;
        }
      }
    } catch (e) {
      console.warn("Notice: admin_rentals backfill skipped or partial:", e.message);
    }

    console.log(`Backfill complete. Verified accounts: ${updatedAccounts}, clients: ${updatedClients}, agreements: ${updatedAgreements}, rentals: ${updatedRentals}`);
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("backfill-field-encryption.mjs")) {
  runBackfill().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
