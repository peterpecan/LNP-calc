import { cp, rm } from 'node:fs/promises';
// dist/ is pure build output: src/ plus generated vendor bundle, icons and service worker.
await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
await cp(new URL('./src/', import.meta.url), new URL('./dist/', import.meta.url), {
  recursive: true,
});
await import('./build-vendor.mjs');
await import('./build-icons.mjs');
const { buildOffline } = await import('./build-offline.mjs');
console.log('Local offline cache', await buildOffline(new URL('./dist/', import.meta.url)));
await import('./build-portable.mjs');
await import('./build-pages.mjs');
