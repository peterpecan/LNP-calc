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
await writeFile(
  'dist/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><style>:root{--ink:${ink};--paper:${paper}}</style><rect width="512" height="512" rx="60" fill="var(--paper)"/><g fill="none" stroke="var(--ink)" stroke-width="16"><circle cx="256" cy="256" r="133"/><circle cx="256" cy="256" r="82"/></g><g fill="var(--paper)" stroke="var(--ink)" stroke-width="10"><circle cx="256" cy="123" r="26"/><circle cx="371" cy="323" r="26"/><circle cx="141" cy="323" r="26"/></g></svg>`,
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
      const nx = (x * 512) / size,
        ny = (y * 512) / size,
        d = Math.hypot(nx - 256, ny - 256);
      const bead = [
        [256, 123],
        [371, 323],
        [141, 323],
      ].some(([bx, by]) => Math.hypot(nx - bx, ny - by) < 26);
      const ring = Math.abs(d - 133) < 8 || Math.abs(d - 82) < 8;
      const c = bead || ring ? rgb(ink) : rgb(paper),
        i = (y * size + x) * 4;
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = 255;
    }
  await writeFile(`dist/icon-${size}.png`, PNG.sync.write(png));
}
console.log('Generated installable app icons.');
