import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const htmlPath = new URL('../dist/index.html', import.meta.url);
const html = (await readFile(htmlPath, 'utf8'))
  .replace('lang="en"', 'lang="pt-BR"')
  .replace('</head>', `<meta name="theme-color" content="#a1ec03">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/fitgen-192.png">
<style>
html, body, #root {
  height: 100%;
  height: 100dvh;
  height: var(--fitgen-viewport-height, 100dvh);
}
html, body { overflow: hidden; overscroll-behavior: none; }
#root { width: 100%; max-width: 520px; margin-inline: auto; }
body { margin: 0; background: #ededed; }
@media (prefers-color-scheme: dark) { body { background: #0b0d0e; } }
</style>
<script>
  const viewport = window.visualViewport;
  if (viewport) {
    const updateViewportHeight = () => {
      if (viewport.scale === 1 && viewport.height > 0) {
        document.documentElement.style.setProperty('--fitgen-viewport-height', viewport.height + 'px');
      }
    };
    viewport.addEventListener('resize', updateViewportHeight);
    window.addEventListener('pageshow', updateViewportHeight);
    updateViewportHeight();
  }
</script>
<script src="/register-sw.js" defer></script>
</head>`);
await writeFile(htmlPath, html);

const dist = new URL('../dist/', import.meta.url);
const assets = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => `/${entry.parentPath.slice(decodeURIComponent(dist.pathname).length)}/${entry.name}`.replaceAll(/\/{2,}/g, '/'))
  .filter((path) => path.startsWith('/_expo/') || path.startsWith('/assets/') || path.startsWith('/icons/'))
  .sort();
const version = createHash('sha256').update(html).update(JSON.stringify(assets)).digest('hex').slice(0, 16);
const worker = await readFile(new URL('./sw.js', import.meta.url), 'utf8');
await writeFile(new URL('sw.js', dist), `const CACHE = 'fitgen-${version}';\nconst ASSETS = ${JSON.stringify(['/', '/favicon.ico', '/register-sw.js', ...assets])};\n${worker}`);
