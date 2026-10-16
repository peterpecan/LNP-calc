import { PNG } from 'pngjs';
import { readFile, writeFile } from 'node:fs/promises';
const css = await readFile('dist/workspace.css', 'utf8');
const token = name => css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})'))[1];
const ink = token('ink'),
  paper = token('paper'),
  ground = token('ground');
const rgb = hex =>
  hex
    .slice(1)
    .match(/../g)
    .map(c => parseInt(c, 16));
// Lipid shell of 16 beads around an mRNA strand, in the 42-unit header-logo space.
const beads = [...Array(16)].map((_, i) =>
  [21 + 15 * Math.cos((i * Math.PI) / 8), 21 + 15 * Math.sin((i * Math.PI) / 8)].map(
    v => +v.toFixed(2),
  ),
);
const strand = [];
for (let seg = 0; seg < 4; seg++)
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    strand.push([13 + seg * 4 + 4 * t, 21 + (seg % 2 ? 8 : -8) * t * (1 - t)]);
  }
await writeFile(
  'dist/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><style>:root{--ink:${ink};--paper:${paper}}</style><rect width="512" height="512" rx="60" fill="var(--paper)"/><g transform="translate(256 256) scale(9) translate(-21 -21)" fill="var(--ink)">${beads.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}<path d="M13 21q2-4 4 0t4 0 4 0 4 0" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/></g></svg>`,
);
const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
manifest.background_color = ground;
manifest.theme_color = ground;
await writeFile('dist/manifest.webmanifest', JSON.stringify(manifest) + '\n');
const html = await readFile('dist/index.html', 'utf8');
await writeFile(
  'dist/index.html',
  html.replace(/(<meta name="theme-color" content=")[^"]+/, '$1' + ground),
);
for (const size of [192, 512]) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const lx = 21 + ((x + 0.5) * 512) / size / 9 - 256 / 9,
        ly = 21 + ((y + 0.5) * 512) / size / 9 - 256 / 9;
      const bead = beads.some(([bx, by]) => Math.hypot(lx - bx, ly - by) < 2);
      const rna = strand.some(([sx, sy]) => Math.hypot(lx - sx, ly - sy) < 1);
      const c = bead || rna ? rgb(ink) : rgb(paper),
        i = (y * size + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = 255;
    }
  await writeFile(`dist/icon-${size}.png`, PNG.sync.write(png));
}
console.log('Generated installable app icons.');
