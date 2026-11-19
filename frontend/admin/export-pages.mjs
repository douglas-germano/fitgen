import { cp, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { generateSW } from "workbox-build";

const files = [
    ["admin/dist/client/_shell.html", "_shell.html"],
    ["admin/dist/client/assets", "assets"],
    ["admin/pages/_headers", "_headers"],
    ["admin/pages/_redirects", "_redirects"],
    ["public/brand", "brand"],
    ["public/icons", "icons"],
    ["public/manifest.json", "manifest.json"],
    ["src/app/favicon.ico", "favicon.ico"],
    ["src/app/apple-icon.png", "apple-icon.png"],
];

const output = "out";
await rm(output, { recursive: true, force: true });
for (const [source, target] of files) {
    await cp(source, `${output}/${target}`, { recursive: true });
}

// Pages serves these extensionless URLs directly. A 200 rewrite to the shell
// would canonicalize to the shell URL and drop the route from the address bar.
const pages = [
    "admin", "admin/audit-logs", "admin/clubs", "admin/exercises", "admin/finance",
    "admin/notifications", "admin/users", "admin/users/detail", "admin/workouts",
    "login", "forgot-password", "reset-password", "404",
];
for (const page of pages) {
    const target = `${output}/${page}.html`;
    await mkdir(dirname(target), { recursive: true });
    await cp(`${output}/_shell.html`, target);
}

const { warnings } = await generateSW({
    globDirectory: output,
    globPatterns: ["_shell.html", "assets/**/*", "brand/**/*", "icons/**/*", "manifest.json", "*.ico", "apple-icon.png"],
    swDest: `${output}/sw.js`,
    navigateFallback: "/_shell.html",
    navigateFallbackAllowlist: [/^\/(?:admin(?:\/[^?]*)?|login\/?|forgot-password\/?|reset-password\/?)(?:\?|$)/],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
});

if (warnings.length) console.warn(warnings.join("\n"));
