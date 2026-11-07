/**
 * Domain & DNS Input Validation and Rate Limiting Utilities
 */

const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory sliding rate limiter
 * @param key Identifier (e.g. `ip:search` or `userId:write`)
 * @param limit Max allowed requests
 * @param windowMs Window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const entry = RATE_LIMIT_STORE.get(key);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInSec: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Validate domain name format
 */
export function validateDomainName(domain: string): { valid: boolean; error?: string; cleanDomain: string } {
  if (!domain || typeof domain !== "string") {
    return { valid: false, error: "Domain name is required.", cleanDomain: "" };
  }

  const clean = domain.trim().toLowerCase();

  // Reject URLs, paths, protocols or whitespace
  if (clean.includes("/") || clean.includes(":") || clean.includes(" ") || clean.includes("@")) {
    return {
      valid: false,
      error: "Domain name cannot contain protocols, paths, or slashes. Example: mydomain.com",
      cleanDomain: clean,
    };
  }

  // Basic RFC regex for domain: labels separated by dots, 1-63 chars each, max total 253 chars
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!domainRegex.test(clean)) {
    return {
      valid: false,
      error: "Invalid domain format. Example: mydomain.com",
      cleanDomain: clean,
    };
  }

  return { valid: true, cleanDomain: clean };
}

/**
 * Validate DNS record inputs
 */
export function validateDnsRecordInput(record: {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
}): { valid: boolean; error?: string } {
  const allowedTypes = ["A", "AAAA", "CNAME", "TXT", "MX", "SRV", "NS"];
  const type = record.type ? record.type.toUpperCase() : "";

  if (!allowedTypes.includes(type)) {
    return { valid: false, error: `Unsupported record type: ${record.type}. Supported: ${allowedTypes.join(", ")}` };
  }

  if (!record.name || typeof record.name !== "string" || !record.name.trim()) {
    return { valid: false, error: "Record name/host is required (e.g. '@' or 'subdomain')." };
  }

  if (!record.content || typeof record.content !== "string" || !record.content.trim()) {
    return { valid: false, error: "Record content/value is required." };
  }

  const content = record.content.trim();

  // Validate TTL: 1 = Auto, or 60 to 86400
  if (record.ttl !== undefined && record.ttl !== 1 && (record.ttl < 60 || record.ttl > 86400)) {
    return { valid: false, error: "TTL must be 1 (Auto) or between 60 and 86400 seconds." };
  }

  // Type-specific validations
  if (type === "A") {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(content)) {
      return { valid: false, error: "Content for an 'A' record must be a valid IPv4 address (e.g. 192.0.2.1)." };
    }
  } else if (type === "AAAA") {
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
    if (!ipv6Regex.test(content) && !content.includes(":")) {
      return { valid: false, error: "Content for an 'AAAA' record must be a valid IPv6 address." };
    }
  } else if (type === "MX") {
    if (record.priority === undefined || record.priority < 0 || record.priority > 65535) {
      return { valid: false, error: "MX records require an integer priority between 0 and 65535." };
    }
  }

  return { valid: true };
}
