import { cp, rm } from 'node:fs/promises';
import { buildOffline } from './build-offline.mjs';
const target = new URL('../github-pages/', import.meta.url);
await rm(target, { recursive: true, force: true });
await cp(new URL('./dist/', import.meta.url), target, { recursive: true });
const version = await buildOffline(target);
console.log('Prepared github-pages/. Offline version ' + version + '.');
