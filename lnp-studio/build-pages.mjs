import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { buildOffline } from './build-offline.mjs';
const target = new URL('../github-pages/', import.meta.url);
// Fail the build instead of silently shipping local-only content when a marker or phrase changes.
function replaceOrThrow(text, pattern, replacement, file) {
  const result = text.replace(pattern, replacement);
  if (result === text) throw new Error(`build-pages: ${pattern} not found in ${file}`);
  return result;
}
async function transform(name, edits) {
  const file = new URL(name, target);
  let text = await readFile(file, 'utf8');
  for (const [pattern, replacement] of edits)
    text = replaceOrThrow(text, pattern, replacement, name);
  await writeFile(file, text);
}
await rm(target, { recursive: true, force: true });
await cp(new URL('./dist/', import.meta.url), target, { recursive: true });
await transform('index.html', [
  [/<a href="#review"[\s\S]*?<\/a>/, ''],
  [/<main id="review-page"[\s\S]*?<\/main>/, ''],
  [
    "This is the worksheet's volume-additivity model.",
    'Stock volumes use an additive-volume model.',
  ],
]);
const version = await buildOffline(target);
console.log('Prepared github-pages/ with generic inputs only. Offline version ' + version + '.');
