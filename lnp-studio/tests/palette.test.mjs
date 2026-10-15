import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const files = ['workspace.css', 'workflow.css', 'library.css'];
const sheets = await Promise.all(
  files.map(f => readFile(new URL('../src/' + f, import.meta.url), 'utf8')),
);
const definitions = new Map(
  [...sheets.join('\n').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(m => [m[1], m[2].trim()]),
);
test('theme colours are centralized in root tokens and every referenced token exists', () => {
  sheets.forEach((sheet, i) => {
    const body = sheet.replace(/:root\s*\{[^}]*\}/g, '');
    assert.ok(
      !/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(body),
      files[i] + ' has a colour outside :root',
    );
    assert.ok(
      !/\b(?:box-shadow|text-shadow|backdrop-filter|linear-gradient|radial-gradient)\s*[:(]/.test(
        body,
      ),
    );
  });
  for (const match of sheets.join('\n').matchAll(/var\((--[\w-]+)/g))
    assert.ok(definitions.has(match[1]), 'undefined ' + match[1]);
});
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map(v => parseInt(v, 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
test('notebook text, selections, actions, and status tokens meet WCAG AA contrast', () => {
  const pairs = [
    ['ink', 'ground'],
    ['ink', 'paper'],
    ['muted', 'ground'],
    ['muted', 'paper'],
    ['accent', 'paper'],
    ['accent', 'ground'],
    ['on-accent', 'accent'],
    ['on-accent', 'accent-hover'],
    ['ink', 'select-bg'],
    ['muted', 'select-bg'],
    ['ink', 'select-bg-quiet'],
    ['muted', 'select-bg-quiet'],
    ['danger', 'danger-bg'],
    ['notice-ink', 'notice-bg'],
    ['ok', 'ok-bg'],
    ['paper', 'ink'],
  ];
  for (const [fg, bg] of pairs) {
    const a = luminance(definitions.get('--' + fg)),
      b = luminance(definitions.get('--' + bg));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(ratio >= 4.5, `${fg}/${bg}: ${ratio.toFixed(2)}`);
  }
});
