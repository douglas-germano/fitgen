#!/usr/bin/env node
/**
 * Trims the static export (`out/`) down to one of the two public sites and writes its
 * Cloudflare Pages `_headers` / `_redirects`.
 *
 *   node scripts/prune-export.mjs admin   -> admin.fitgen.pro (painel + login)
 *   node scripts/prune-export.mjs lp      -> lp.fitgen.pro    (página de vendas + páginas legais)
 *
 * Both sites come from the same Next.js build (NEXT_PUBLIC_SITE selects metadata / PWA).
 */
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const site = process.argv[2];
const OUT = process.argv[3] ?? "out";

// Top-level names (ignoring extension) that belong to each site. Everything else is deleted.
const COMMON = ["_next", "404", "_not-found", "apple-icon", "favicon", "brand", "file", "globe", "next", "vercel", "window", "scrollbar-hide"];
const KEEP = {
  admin: [...COMMON, "admin", "login", "forgot-password", "reset-password", "icons", "manifest", "sw", "workbox-*"],
  lp: [...COMMON, "index", "landing", "privacidade", "excluir-conta", "assinar"],
};
const HEADERS = {
  admin: `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Robots-Tag: noindex, nofollow

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/workbox-*.js
  Cache-Control: no-cache
`,
  lp: `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
`,
};
const REDIRECTS = {
  admin: `/ /admin 302\n/register /login 302\n`,
  lp: `/admin / 302\n/admin/* / 302\n/login / 302\n/register / 302\n`,
};

if (!KEEP[site]) {
  console.error("usage: prune-export.mjs <admin|lp> [outDir]");
  process.exit(1);
}
if (!existsSync(OUT)) {
  console.error(`${OUT}/ not found: run the static build first`);
  process.exit(1);
}

const stem = (name) => name.replace(/\.(html|txt|js|json|ico|png|svg|map)$/, "");
// `__next*.txt` are small per-route RSC payload files; keeping them all is harmless.
const matches = (name) =>
  name.startsWith("__next") ||
  KEEP[site].some((k) => (k.endsWith("*") ? stem(name).startsWith(k.slice(0, -1)) : stem(name) === k));

const removed = [];
for (const entry of readdirSync(OUT)) {
  if (entry === "_headers" || entry === "_redirects") continue;
  if (!matches(entry)) {
    rmSync(join(OUT, entry), { recursive: true, force: true });
    removed.push(entry);
  }
}
// The landing has no PWA; the admin root is a redirect, not a page.
if (site === "admin") for (const f of ["index.html", "index.txt"]) rmSync(join(OUT, f), { force: true });

writeFileSync(join(OUT, "_headers"), HEADERS[site]);
writeFileSync(join(OUT, "_redirects"), REDIRECTS[site]);
console.log(`[prune-export] ${site}: removed ${removed.length} entries -> ${readdirSync(OUT).join(", ")}`);
