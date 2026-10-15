import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { buildOffline } from './build-offline.mjs';
const target = new URL('../github-pages/', import.meta.url);
const example = {
  name: 'Example formulation',
  volume: 1000,
  concentration: 10,
  batches: 1,
  excess: 0,
  minimum: 2,
  notes: 'Illustrative inputs only. Enter the materials and stock values for your experiment.',
  lipids: [
    { name: 'Example lipid A', role: 'Example', ratio: 70, stock: 50, unit: 'mM', mw: 650 },
    { name: 'Example lipid B', role: 'Example', ratio: 30, stock: 20, unit: 'mM', mw: 400 },
  ],
};
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
await transform('calculator.js', [
  [
    /\/\* LOCAL_WORKSHEET_START \*\/[\s\S]*?\/\* LOCAL_WORKSHEET_END \*\//,
    () => `export const sourceRecipe = ${JSON.stringify(example)};`,
  ],
  [/\/\* LOCAL_STOCK_NOTE_START \*\/[\s\S]*?\/\* LOCAL_STOCK_NOTE_END \*\//, ''],
]);
await transform('index.html', [
  [/<a href="#review"[\s\S]*?<\/a>/, ''],
  [/<main id="review-page"[\s\S]*?<\/main>/, ''],
  ['Load worksheet recipe', 'Load example recipe'],
  [
    "This is the worksheet's volume-additivity model.",
    'Stock volumes use an additive-volume model.',
  ],
]);
const version = await buildOffline(target);
console.log(
  'Prepared github-pages/ with generic inputs only. Offline version ' +
    version +
    '. Nothing uploaded.',
);
