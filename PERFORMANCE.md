# Performance & Resource Monitoring Guide

This document defines performance budgets, diagnostic workflows, and alert configurations to ensure resource usage on Vercel and shared hosting remains within optimal bounds.

---

## 1. Performance Budgets

| Metric | Budget / Ceiling | Target | Where to Check |
|:---|:---:|:---:|:---|
| **First-Load JS (Landing Page)** | `< 500 KB` uncompressed | `< 350 KB` | `pnpm build:standalone` output |
| **First-Load JS (Dashboard/Invoices)** | `< 700 KB` uncompressed | `< 500 KB` | `pnpm build:standalone` output |
| **Single Function Traced Size** | `< 15 MB` | `< 8 MB` | `.next/server/app/**/*.nft.json` |
| **Cumulative Traced Functions (Per Deploy)** | `< 350 MB` | `< 250 MB` | Trace analysis script |
| **Node.js Process Memory (Shared Host)** | `< 384 MB` RSS | `< 200 MB` | `ps aux` / cPanel Resource Monitor |
| **Server TTFB (Dynamic Routes)** | `< 400 ms` | `< 200 ms` | Network DevTools / Umami / Web Vitals |
| **Largest Contentful Paint (LCP)** | `< 2.5 s` | `< 1.8 s` | Chrome DevTools / Lighthouse |
| **Cumulative Layout Shift (CLS)** | `< 0.1` | `0` | Lighthouse |

---

## 2. Before Adding Any New Dependency

Before installing any npm package, run the following verification checklist:
1. **Is it pure JavaScript or does it include native C++ binaries?**
   - Native modules (e.g. `canvas`, `sharp`, `bcrypt`) may fail to compile or execute on shared hosting. Prefer pure JS alternatives (e.g. `bcryptjs`, `pdf-lib`).
2. **Does it include headless browsers or Chromium?**
   - **Never install headless browsers** (Puppeteer, Playwright) for runtime user requests. Use external APIs or client-side generation.
3. **Check bundle impact with Bundlephobia**:
   - Visit [bundlephobia.com](https://bundlephobia.com) and verify the minified + gzipped size is `< 50 KB`.
4. **Use modular subpath imports**:
   - Never write `import { ... } from "lodash"` or `import { google } from "googleapis"`. Use targeted imports or dynamic `import()`.

---

## 3. How to Run Diagnostics Locally

### A. Run Clean Production Build with Standalone Checks
```bash
pnpm run build:standalone
```

### B. Inspect Top Serverless Function Sizes
Run this Node command to audit traced sizes of all functions:
```bash
node -e '
const fs = require("fs");
const path = require("path");
function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res = res.concat(walk(full));
    else if (f.endsWith(".nft.json")) res.push(full);
  }
  return res;
}
const nfts = walk(".next/server/app");
const list = nfts.map(nft => {
  const parsed = JSON.parse(fs.readFileSync(nft, "utf8"));
  const dir = path.dirname(nft);
  let size = 0;
  for (const f of parsed.files) {
    try { size += fs.statSync(path.resolve(dir, f)).size; } catch(e) {}
  }
  return { route: path.relative(".next/server/app", nft).replace(".nft.json", ""), mb: (size/(1024*1024)).toFixed(2) };
}).sort((a,b) => b.mb - a.mb);
console.table(list.slice(0, 10));
'
```

### C. Test Standalone Node Server Locally
```bash
PORT=3001 node server.js
```
Then run the zero-overhead health check:
```bash
curl http://localhost:3001/api/health
```

---

## 4. Recommended Alerts Configuration

### Vercel Dashboard Alerts
Go to **Vercel Dashboard → Your Team / Account Settings → Usage & Billing**:
1. **Active CPU Alerts**:
   - Alert at **50% (2h)**
   - Alert at **75% (3h)**
   - Alert at **90% (3.6h)**
2. **Functions Storage Alerts**:
   - Alert at **70% (7 GB)**
   - Alert at **85% (8.5 GB)**
3. **Spend Limits**: Enable spend limits with auto-pause if on a Pro plan to prevent unexpected charges.

### Shared Hosting Resource Alerts
In cPanel / CloudLinux:
1. Enable **Resource Usage Notifications** for memory usage > 80%.
2. Configure external free uptime monitoring (e.g. UptimeRobot or Better Uptime) targeting `https://frametoque.com/api/health` with a 5-minute interval.

