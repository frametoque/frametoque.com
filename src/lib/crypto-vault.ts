import crypto from "node:crypto";

const CIPHER_ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

/**
 * Derives the 256-bit Master Key (KEK) from environment variables.
 */
function getMasterKey(): Buffer {
  const rawKey =
    process.env.APP_FIELD_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY;

  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: APP_FIELD_ENCRYPTION_KEY or CREDENTIALS_ENCRYPTION_KEY must be set in production"
      );
    }
    // Development fallback key
    return crypto.createHash("sha256").update("dev-frametoque-field-vault-master-key-2026").digest();
  }

  // Derive exactly 32 bytes using SHA-256
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Derives a blind index secret key for deterministic exact-match search hashes.
 */
function getBlindIndexKey(): Buffer {
  const master = getMasterKey();
  return crypto.createHmac("sha256", master).update("frametoque:blind-index:salt-v1").digest();
}

/**
 * Encrypts sensitive field data using AES-256-GCM with Additional Authenticated Data (AAD).
 *
 * @param plaintext The string data to encrypt.
 * @param aadContext Domain/record binding context (e.g. "users:phone:<id>") to prevent ciphertext transplant attacks.
 * @returns Serialized ciphertext in "v1:<iv_hex>:<tag_hex>:<ciphertext_hex>" format.
 */
export function encryptField(plaintext: string | null | undefined, aadContext: string): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null;
  }

  const masterKey = getMasterKey();
  // Derive unique per-context Data Encryption Key (DEK) via HKDF
  const dek = Buffer.from(
    crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
  );

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, dek, iv);

  // Bind AAD
  cipher.setAAD(Buffer.from(aadContext, "utf8"));

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts AES-256-GCM ciphertext, validating authentication tag and AAD.
 * If the input is not encrypted (e.g. unmigrated plaintext), returns it safely as fallback.
 *
 * @param encryptedValue Serialized ciphertext string.
 * @param aadContext Domain/record binding context (must match encryptField).
 */
export function decryptField(encryptedValue: string | null | undefined, aadContext: string): string | null {
  if (!encryptedValue) return null;

  // Check if value matches encrypted format
  if (!encryptedValue.startsWith("v1:")) {
    // Return unmigrated plaintext transparently
    return encryptedValue;
  }

  try {
    const parts = encryptedValue.split(":");
    if (parts.length !== 4) return encryptedValue;

    const [, ivHex, tagHex, dataHex] = parts;
    const masterKey = getMasterKey();
    const dek = Buffer.from(
      crypto.hkdfSync("sha256", masterKey, Buffer.from("frametoque-salt", "utf8"), Buffer.from(aadContext, "utf8"), 32)
    );

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");

    const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, dek, iv);
    decipher.setAAD(Buffer.from(aadContext, "utf8"));
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error(`[crypto-vault] Decryption failed for context "${aadContext}":`, err);
    return "[Encrypted Field]";
  }
}

/**
 * Computes a deterministic HMAC-SHA256 blind index for exact-match searches.
 *
 * @param value The plaintext value to index (e.g. email, phone number).
 * @param context Field type context (e.g. "email", "phone").
 */
export function generateBlindIndex(value: string | null | undefined, context: string): string | null {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const bidxKey = getBlindIndexKey();
  return crypto.createHmac("sha256", bidxKey).update(`${context}:${normalized}`).digest("hex");
}

