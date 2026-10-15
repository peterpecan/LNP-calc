await import('./build-vendor.mjs');
await import('./build-icons.mjs');
const {buildOffline}=await import('./build-offline.mjs');
console.log('Local offline cache',await buildOffline(new URL('./dist/',import.meta.url)));
await import('./build-portable.mjs');
await import('./build-pages.mjs');
