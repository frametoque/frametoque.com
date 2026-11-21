import assert from "node:assert";
import { encryptField, decryptField, generateBlindIndex } from "../src/lib/crypto-vault.ts";
import { sanitizeKey } from "../src/lib/storage.ts";

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

console.log("=================================================");
console.log("Running Security Hardening Regression Test Suite");
console.log("=================================================\n");

// 1. Crypto Vault: Round-trip encryption and decryption
runTest("CryptoVault: Valid AES-256-GCM round-trip with AAD", () => {
  const secret = "450123456789";
  const aad = "admin_accounts:acc_num:42";
  const encrypted = encryptField(secret, aad);
  assert(encrypted.startsWith("v1:"), "Encrypted string must have v1 prefix");
  
  const decrypted = decryptField(encrypted, aad);
  assert.strictEqual(decrypted, secret, "Decrypted text must match original plaintext");
});

// 2. Crypto Vault: Tamper detection on ciphertext
runTest("CryptoVault: Tamper detection on ciphertext bytes", () => {
  const secret = "SuperSecretValue";
  const aad = "context:tamper:1";
  const encrypted = encryptField(secret, aad);
  const parts = encrypted.split(":");
  
  // Flip the first character of the ciphertext payload
  const tamperedData = (parts[3][0] === "a" ? "b" : "a") + parts[3].slice(1);
  const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedData}`;

  const decrypted = decryptField(tamperedCiphertext, aad);
  assert.notStrictEqual(decrypted, secret, "Tampered ciphertext must not decrypt to original plaintext");
  assert.strictEqual(decrypted, "[Encrypted Field]", "Tampered ciphertext must return safe error fallback");
});

// 3. Crypto Vault: Tamper detection on authentication tag
runTest("CryptoVault: Tamper detection on authentication tag", () => {
  const secret = "SuperSecretValue";
  const aad = "context:tag:1";
  const encrypted = encryptField(secret, aad);
  const parts = encrypted.split(":");
  
  // Flip the first character of the auth tag
  const tamperedTag = (parts[2][0] === "0" ? "1" : "0") + parts[2].slice(1);
  const tamperedCiphertext = `${parts[0]}:${parts[1]}:${tamperedTag}:${parts[3]}`;

  const decrypted = decryptField(tamperedCiphertext, aad);
  assert.strictEqual(decrypted, "[Encrypted Field]", "Corrupted auth tag must fail authentication");
});

// 4. Crypto Vault: AAD Context Binding Protection (Prevents ciphertext transplant)
runTest("CryptoVault: Reject decryption if AAD context does not match", () => {
  const secret = "SensitiveData";
  const encrypted = encryptField(secret, "table_a:record:1");

  // Attempting to decrypt the same ciphertext under a different table or record ID
  const decrypted = decryptField(encrypted, "table_b:record:2");
  assert.strictEqual(decrypted, "[Encrypted Field]", "Decryption with mismatched AAD must be rejected");
});

// 5. Crypto Vault: Blind Index Uniqueness & Normalization
runTest("CryptoVault: Blind index determinism and normalization", () => {
  const email1 = "Client@Example.COM ";
  const email2 = "client@example.com";
  const email3 = "other@example.com";

  const idx1 = generateBlindIndex(email1, "email");
  const idx2 = generateBlindIndex(email2, "email");
  const idx3 = generateBlindIndex(email3, "email");

  assert.strictEqual(idx1, idx2, "Blind indexes for equivalent emails must match identically");
  assert.notStrictEqual(idx1, idx3, "Blind indexes for different emails must not collide");
});

// 6. Storage: Path Traversal Prevention
runTest("Storage: Path traversal sequences must be stripped from storage keys", () => {
  const maliciousKey = "../../etc/shadow";
  const sanitized = sanitizeKey(maliciousKey);
  assert(!sanitized.includes(".."), "Sanitized key must not contain directory traversal");
  assert.strictEqual(sanitized, "etc/shadow");
});

// 7. Storage: Block Dangerous Executable Upload Extensions
runTest("Storage: Block dangerous executable file extensions", () => {
  const dangerousNames = ["malware.exe", "webshell.php", "page.html", "script.sh", "code.js"];
  for (const name of dangerousNames) {
    let blocked = false;
    try {
      sanitizeKey(`uploads/${name}`);
    } catch {
      blocked = true;
    }
    assert(blocked, `Dangerous extension for ${name} must be blocked with an exception`);
  }

  const safeNames = ["invoice.pdf", "receipt.jpg", "banner.png", "logo.webp"];
  for (const name of safeNames) {
    let allowed = false;
    try {
      const result = sanitizeKey(`uploads/${name}`);
      allowed = Boolean(result);
    } catch {
      allowed = false;
    }
    assert(allowed, `Safe file ${name} must be accepted`);
  }
});

// 8. SSRF Host Blocker Logic
runTest("SSRF: Internal and Cloud Metadata Addresses Blocked", () => {
  function isBlockedHost(host) {
    const h = host.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "::1" || h === "169.254.169.254" || h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".lan")) {
      return true;
    }
    const match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (match) {
      const [, a, b] = match.map(Number);
      if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0) return true;
    }
    return false;
  }

  assert(isBlockedHost("169.254.169.254"), "AWS IMDS must be blocked");
  assert(isBlockedHost("127.0.0.1"), "Loopback must be blocked");
  assert(isBlockedHost("localhost"), "Localhost must be blocked");
  assert(isBlockedHost("10.0.1.5"), "Private subnet 10.x must be blocked");
  assert(isBlockedHost("192.168.1.1"), "Private subnet 192.168.x must be blocked");
  assert(!isBlockedHost("frametoque.com"), "Public domain must be allowed");
  assert(!isBlockedHost("api.google.com"), "Public external domain must be allowed");
});

// 9. Crypto Vault: Multi-entity Context Isolation (Rentals vs Clients vs Agreements)
runTest("CryptoVault: Multi-entity Context Isolation rejects cross-domain decryption", () => {
  const secretPhone = "+94771234567";
  const rentalContext = "rentals:phone:RNT-00042";
  const clientContext = "client:phone:C-1002";

  const encryptedForRental = encryptField(secretPhone, rentalContext);
  assert(encryptedForRental.startsWith("v1:"));

  // Attempt to decrypt rental ciphertext under client context
  const crossDecrypted = decryptField(encryptedForRental, clientContext);
  assert.strictEqual(crossDecrypted, "[Encrypted Field]", "Cross-domain decryption must fail safely");

  // Decrypt with correct rental context
  const validDecrypted = decryptField(encryptedForRental, rentalContext);
  assert.strictEqual(validDecrypted, secretPhone, "Decryption under correct context must succeed");
});

// 10. Crypto Vault: Unmigrated Plaintext Transparent Fallback
runTest("CryptoVault: Gracefully preserves unmigrated plaintext on read", () => {
  const plaintextAddress = "123 Galle Road, Colombo 03";
  const result = decryptField(plaintextAddress, "client:address:legacy");
  assert.strictEqual(result, plaintextAddress, "Unmigrated plaintext must be passed through unchanged");
});

// 11. Blind Index Determinism and Separation
runTest("CryptoVault: Blind index context separation prevents cross-field collisions", () => {
  const value = "0771234567";
  const phoneIdx = generateBlindIndex(value, "phone");
  const bankIdx = generateBlindIndex(value, "bank_account");

  assert.notStrictEqual(phoneIdx, bankIdx, "Identical digits in different contexts must yield distinct blind indexes");
});

// 12. Media Route: Sensitive Document Classification
runTest("Storage: Sensitive path patterns identify receipts, payment slips, and agreements", () => {
  const SENSITIVE_PATTERNS = [
    /receipts?\//i,
    /payment[_-]slips?\//i,
    /agreements?\//i,
    /kyc\//i,
    /id[_-]cards?\//i,
    /utility[_-]bills?\//i,
    /credentials?\//i,
    /passwords?\//i,
  ];
  function isSensitive(key) {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  }

  assert(isSensitive("admin/receipts/income/123-file.png"), "Receipts must be classified as sensitive");
  assert(isSensitive("invoices/payment-slips/slip-42.jpg"), "Payment slips must be classified as sensitive");
  assert(isSensitive("agreements/client-signed.pdf"), "Agreements must be classified as sensitive");
  assert(!isSensitive("images/clients/logo/ds.png"), "Public client logos must not be sensitive");
  assert(!isSensitive("portfolio/photo-1.webp"), "Public portfolio photos must not be sensitive");
});

console.log("\n-------------------------------------------------");
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log("-------------------------------------------------");

if (passedTests !== totalTests) {
  process.exit(1);
}
