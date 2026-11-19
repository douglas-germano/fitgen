#!/usr/bin/env node
/** Keep the landing routes and assets in the Next.js export for Cloudflare Pages. */
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const site = process.argv[2];
const output = process.argv[3] ?? "out";
const keep = new Set([
  "_next", "404", "_not-found", "apple-icon", "favicon", "brand", "index", "landing",
  "privacidade", "excluir-conta", "assinar", "assinatura-confirmada",
]);

if (site !== "lp" || !existsSync(output)) {
  console.error("usage: node scripts/prune-export.mjs lp [outDir] (run the static build first)");
  process.exit(1);
}

const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`;
const redirects = "/admin / 302\n/admin/* / 302\n/login / 302\n/register / 302\n";

const removed = [];
for (const entry of readdirSync(output)) {
  if (entry === "_headers" || entry === "_redirects" || entry.startsWith("__next")) continue;
  const stem = entry.replace(/\.(html|txt|js|json|ico|png|svg|map)$/, "");
  if (!keep.has(stem)) {
    rmSync(join(output, entry), { recursive: true, force: true });
    removed.push(entry);
  }
}

writeFileSync(join(output, "_headers"), headers);
writeFileSync(join(output, "_redirects"), redirects);
console.log(`[prune-export] lp: removed ${removed.length} entries -> ${readdirSync(output).join(", ")}`);
