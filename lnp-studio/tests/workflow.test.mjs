import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { sourceRecipe, calculate } from '../src/calculator.js';
import {
  createSession,
  updateStock,
  preparedRecord,
  validateSession,
  sameTargets,
} from '../src/session.js';
import { encodeSession, decodeSession, transferURL, isLoopback } from '../src/transfer.js';
import { buildWorkbook } from '../src/excel.js';
const fixture = () => structuredClone(sourceRecipe);
test('lab stock edits keep composition, amount and phase targets and preserve original inputs', () => {
  const s = createSession(fixture());
  s.checked = [0, 1];
  s.preparedAt = '2026-10-15T10:00:00.000Z';
  const edited = updateStock(s, 0, 'stock', 70),
    plan = calculate(s.plan),
    actual = calculate(edited.working);
  assert.equal(edited.plan.lipids[0].stock, 77.87);
  assert.equal(edited.working.lipids[0].stock, 70);
  assert.equal(s.working.lipids[0].stock, 77.87);
  assert.equal(actual.totalNmol, plan.totalNmol);
  assert.equal(actual.totalVolume, plan.totalVolume);
  assert.ok(Math.abs(actual.rows[0].volume - 15625 / 70) < 1e-10);
  assert.deepEqual(edited.checked, []);
  assert.equal(edited.preparedAt, null);
  assert.equal(sameTargets(edited.plan, edited.working), true);
});
test('saved preparations are independent immutable snapshots of both versions', () => {
  const s = updateStock(createSession(fixture()), 0, 'stock', 70),
    record = preparedRecord(s);
  s.working.lipids[0].stock = 60;
  s.plan.lipids[0].stock = 99;
  assert.equal(record.recipe.lipids[0].stock, 70);
  assert.equal(record.session.plan.lipids[0].stock, 77.87);
  assert.ok(record.session.preparedAt);
  assert.equal(validateSession(record.session), true);
});
test('session validation rejects changed targets, malformed identifiers, and invalid source plans', () => {
  const s = createSession(fixture());
  s.working.volume = 999;
  assert.equal(validateSession(s), false);
  s.working.volume = s.plan.volume;
  s.id = 12345678;
  assert.equal(validateSession(s), false);
  assert.throws(() => createSession({ ...fixture(), concentration: 0 }));
});
test('transfer round trip preserves Unicode, full precision, original and adjusted stocks', async () => {
  const r = fixture();
  r.name = 'Poskus α / µL';
  r.notes = 'Lot A\nBuffer: pH 7.4';
  const s = updateStock(createSession(r), 1, 'stock', 5.062361479);
  s.working.notes = 'Lot B – actual stock';
  const decoded = await decodeSession(await encodeSession(s));
  assert.equal(decoded.id, s.id);
  assert.equal(decoded.plannedAt, s.plannedAt);
  assert.deepEqual(decoded.plan, r);
  assert.equal(decoded.working.notes, s.working.notes);
  assert.equal(decoded.working.lipids[1].stock, 5.062361479);
  assert.equal(decoded.working.lipids[1].unit, 'mM');
});
test('transfer decoder rejects corruption and oversized or unsupported links', async () => {
  for (const token of [
    'x1.bad',
    'z1.',
    'z1.not-valid',
    'j1.' + btoa('{}'),
    'j1.' + 'a'.repeat(45000),
  ])
    await assert.rejects(() => decodeSession(token));
  const s = createSession(fixture());
  s.working.lipids[0].stock = 0;
  await assert.rejects(() => encodeSession(s));
  assert.throws(() => transferURL('javascript:alert(1)', 'j1.fake'));
  assert.throws(() => transferURL('https://user:pass@example.com', 'j1.fake'));
});
test('URLs preserve GitHub repository path and place recipe only in fragment', () => {
  const u = new URL(transferURL('https://example.github.io/lnp/?old=1#lab', 'z1.ABCD'));
  assert.equal(u.pathname, '/lnp/');
  assert.equal(u.search, '');
  assert.equal(u.hash, '#transfer=z1.ABCD');
  assert.equal(isLoopback('http://127.0.0.1:4173'), true);
  assert.equal(isLoopback(u.href), false);
});
test('generated QR PNG independently decodes to the exact transferable recipe', async () => {
  const s = createSession(fixture()),
    url = transferURL('https://example.github.io/lnp/', await encodeSession(s));
  assert.ok(url.length < 2200);
  const bytes = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', width: 640, margin: 4 });
  const png = PNG.sync.read(bytes),
    decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded);
  assert.equal(decoded.data, url);
  assert.equal((await decodeSession(new URL(decoded.data).hash.slice(10))).id, s.id);
});
test('Excel file contains full-precision results, formulas, original plan and embedded QR', async () => {
  const s = updateStock(createSession(fixture()), 0, 'stock', 70),
    url = transferURL('https://example.github.io/lnp/', await encodeSession(s));
  const png = await QRCode.toDataURL(url, { width: 640, margin: 4 });
  const workbook = buildWorkbook(ExcelJS, s.working, s, { url, png });
  const bytes = await workbook.xlsx.writeBuffer(),
    read = new ExcelJS.Workbook();
  await read.xlsx.load(bytes);
  assert.deepEqual(
    read.worksheets.map(s => s.name),
    ['Lab preparation', 'Original plan', 'Phone transfer'],
  );
  assert.equal(read.getWorksheet('Lab preparation').getCell('C12').value, 70);
  assert.equal(read.getWorksheet('Original plan').getCell('C12').value, 77.87);
  assert.equal(
    read.getWorksheet('Lab preparation').getCell('J12').formula,
    'IF(B12=0,0,IF(AND(ISNUMBER(G12),G12>0),H12/G12,"Check stock"))',
  );
  assert.ok(
    Math.abs(read.getWorksheet('Lab preparation').getCell('J12').result - 15625 / 70) < 1e-10,
  );
  assert.equal(read.getWorksheet('Phone transfer').getImages().length, 1);
  assert.equal(read.getWorksheet('Phone transfer').getCell('B21').value.hyperlink, url);
  await mkdir('tests/output', { recursive: true });
  await writeFile('tests/output/verified-preparation.xlsx', bytes);
});
test('Excel export rejects infeasible stock volumes', () => {
  const r = fixture();
  r.concentration = 100;
  assert.throws(() => buildWorkbook(ExcelJS, r));
});
test('Pages artifact uses generic inputs, relative app paths and its own offline assets', async () => {
  const code = await readFile('../github-pages/calculator.js', 'utf8'),
    html = await readFile('../github-pages/index.html', 'utf8'),
    sw = await readFile('../github-pages/sw.js', 'utf8');
  for (const marker of ['77.87', '240925', 'DSPE-PEG-MAL', '1.95'])
    assert.ok(
      !code.includes(marker) && !html.includes(marker),
      marker + ' must not ship in generic package',
    );
  assert.ok(code.includes('Example lipid A'));
  assert.ok(!html.includes('id="review-page"'));
  assert.ok(html.includes('href="manifest.webmanifest"'));
  assert.ok(!sw.includes('README.md'));
  assert.ok(!sw.includes('.github/'));
});
