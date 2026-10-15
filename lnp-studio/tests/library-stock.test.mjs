import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { writeFile, mkdir } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { lipidLibrary, searchLipids, selectLibraryLipid } from '../src/lipid-library.js';
import {
  stockFromMass,
  applyStockPreparation,
  changeStockUnit,
  updateStockInput,
} from '../src/stocks.js';
import { calculate, validateRecipeShape, toCSV } from '../src/calculator.js';
import { createSession, updateStock, isAdjusted } from '../src/session.js';
import {
  encodeSession,
  decodeSession,
  transferQRSegments,
  transferToken,
} from '../src/transfer.js';
import { buildWorkbook } from '../src/excel.js';
const lipid = id => lipidLibrary.find(l => l.id === id);
const baseRecipe = row => ({
  name: 'Mass stock test',
  volume: 1000,
  concentration: 1,
  batches: 1,
  excess: 0,
  minimum: 2,
  notes: '',
  lipids: [row],
});
const stockRow = id => applyStockPreparation(selectLibraryLipid({ ratio: 100 }, lipid(id)), 100, 4);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('catalogue has distinct product identities, positive weights, supplier URLs and PEG averages', () => {
  assert.equal(new Set(lipidLibrary.map(l => l.id)).size, lipidLibrary.length);
  assert.ok(lipidLibrary.length >= 16);
  lipidLibrary.forEach(l => {
    assert.ok(l.mw > 0);
    assert.equal(new URL(l.source).protocol, 'https:');
    if (l.category === 'PEG') assert.equal(l.average, true);
  });
  assert.equal(lipid('dspc').mw, 790.145);
  assert.equal(lipid('sm102').mw, 710.2);
  assert.equal(lipid('dotap-cl').mw, 698.542);
  assert.ok(lipid('dspe-mpeg2000-nh4').form.includes('Ammonium'));
});
test('lipid search recognizes common spellings, aliases and category filters', () => {
  assert.ok(searchLipids('mc-3').some(l => l.id === 'mc3'));
  assert.ok(searchLipids('sm102').some(l => l.id === 'sm102'));
  assert.ok(searchLipids('DSPE PEG MAL', 'PEG').some(l => l.id === 'dspe-peg2000-mal-nh4'));
  assert.ok(searchLipids('', 'Helper').every(l => l.category === 'Helper'));
  assert.equal(searchLipids('nonexistent-xyz').length, 0);
});
test('selecting a lipid fills its MW and source and clears the previous material stock', () => {
  const old = {
    name: 'Old material',
    ratio: 50,
    stock: 123,
    unit: 'mM',
    mw: 999,
    stockPrep: { massMg: 100, volumeMl: 4 },
  };
  const selected = selectLibraryLipid(old, lipid('sm102'));
  assert.equal(selected.mw, 710.2);
  assert.equal(selected.name, 'SM-102');
  assert.equal(selected.ratio, 50);
  assert.equal(selected.stock, '');
  assert.equal(selected.unit, 'mg/mL');
  assert.equal(selected.stockPrep, undefined);
  assert.equal(selected.reference.product, '33474');
  assert.equal(old.stock, 123);
});
test('100 mg in a final volume of 4 mL is 25 mg/mL with the correct lipid molarity', () => {
  const r = stockFromMass(100, 4, 710.2);
  near(r.mgMl, 25);
  near(r.stockMM, 25000 / 710.2);
  for (const [mass, volume] of [
    ['', 4],
    [0, 4],
    [100, 0],
    [100, ''],
    [-1, 4],
    [100, Infinity],
  ])
    assert.throws(() => stockFromMass(mass, volume, 710.2));
});
test('mass-based aliquots independently reconcile to target lipid mass for every library entry', () => {
  for (const l of lipidLibrary) {
    const row = stockRow(l.id),
      r = calculate(baseRecipe(row));
    assert.deepEqual(r.errors, [], l.name);
    near(r.rows[0].volume, l.mw / 25);
    near(r.rows[0].volume * 25, r.rows[0].massUg);
    near(r.rows[0].nmol, 1000);
    near(r.ethanol + r.rows[0].volume, 1000);
  }
});
test('equivalent mM and mg/mL stocks give identical output, preserving preparation details', () => {
  const mass = stockRow('mc3'),
    molar = changeStockUnit(mass, 'mM');
  near(molar.stock, 25000 / 642.1);
  assert.deepEqual(molar.stockPrep, mass.stockPrep);
  near(calculate(baseRecipe(mass)).rows[0].volume, calculate(baseRecipe(molar)).rows[0].volume);
  near(changeStockUnit(molar, 'mg/mL').stock, 25);
});
test('a lot MW override recalculates prepared stock molarity while retaining physical mass concentration', () => {
  const initial = changeStockUnit(stockRow('dspc'), 'mM'),
    adjusted = updateStockInput(initial, 'mw', 800);
  near(adjusted.stock, 31.25);
  const r = calculate(baseRecipe(adjusted));
  assert.deepEqual(r.errors, []);
  near(r.rows[0].volume, 32);
  assert.ok(r.warnings.some(w => w.includes('overridden')));
});
test('manual stock edits remove stale preparation metadata in the office and lab', () => {
  const row = stockRow('mc3'),
    direct = updateStockInput(row, 'stock', 30);
  assert.equal(direct.stockPrep, undefined);
  assert.deepEqual(calculate(baseRecipe(direct)).errors, []);
  const session = updateStock(createSession(baseRecipe(row)), 0, 'stock', 30);
  assert.equal(session.working.lipids[0].stockPrep, undefined);
  assert.equal(session.plan.lipids[0].stockPrep.massMg, 100);
});
test('inconsistent concentration/preparation values and malformed metadata are rejected', () => {
  const row = stockRow('mc3');
  row.stock = 30;
  assert.ok(calculate(baseRecipe(row)).errors.some(e => e.includes('disagrees')));
  assert.throws(() => toCSV(baseRecipe(row), calculate(baseRecipe(row))));
  row.stockPrep.massMg = '100';
  assert.equal(validateRecipeShape(baseRecipe(row)), false);
});
test('QR round trip retains supplier, overridden MW, and changed mass/volume details', async () => {
  const s = createSession(baseRecipe(stockRow('dspc')));
  s.working.lipids[0] = applyStockPreparation(s.working.lipids[0], 50, 2);
  assert.equal(isAdjusted(s), true);
  const roundtrip = await decodeSession(await encodeSession(s));
  assert.deepEqual(roundtrip.plan, s.plan);
  assert.deepEqual(roundtrip.working, s.working);
  assert.equal(roundtrip.working.lipids[0].stockPrep.massMg, 50);
  assert.equal(roundtrip.plan.lipids[0].stockPrep.massMg, 100);
});
const payloadOf = token => JSON.parse(inflateRawSync(Buffer.from(token.slice(3), 'base64url')));
const tokenOf = payload => 'j3.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
const multiRecipe = ids => ({
  ...baseRecipe(null),
  lipids: ids.map(id => ({ ...stockRow(id), ratio: 20 })),
});
test('library lipids travel as IDs with derivable values omitted, and round-trip exactly', async () => {
  const s = createSession(multiRecipe(['mc3', 'dspc', 'cholesterol', 'dmg-peg2000']));
  s.working.lipids[1] = applyStockPreparation(s.working.lipids[1], 50, 2);
  s.working.notes = 'Lab note';
  s.preparedAt = new Date().toISOString();
  const token = await encodeSession(s),
    p = payloadOf(token);
  assert.equal(p[0], 3);
  assert.deepEqual(p[10][0], ['mc3', 20, 1, [100, 4]]);
  assert.deepEqual(p[11], [[1, ['dspc', 20, 1, [50, 2]]]]);
  assert.match(p[1], /^!/);
  assert.equal(typeof p[2], 'number');
  const roundtrip = await decodeSession(token);
  assert.equal(roundtrip.id, s.id);
  assert.equal(roundtrip.plannedAt, s.plannedAt);
  assert.equal(roundtrip.preparedAt, s.preparedAt);
  assert.deepEqual(roundtrip.plan, s.plan);
  assert.deepEqual(roundtrip.working, s.working);
});
test('renamed, re-roled, MW-overridden, mM, edited and custom lipids round-trip exactly', async () => {
  const renamed = { ...stockRow('mc3'), name: 'MC3 lot 7', ratio: 30 };
  delete renamed.role;
  const overridden = changeStockUnit(updateStockInput(stockRow('dspc'), 'mw', 801.3), 'mM');
  const custom = applyStockPreparation(
    selectLibraryLipid(
      { ratio: 30 },
      { id: 'custom-1', name: 'House lipid', category: 'Helper', mw: 512.3 },
    ),
    10,
    1,
  );
  const edited = { ...stockRow('cholesterol'), ratio: 10 };
  edited.reference = { ...edited.reference, product: 'Lot-specific' };
  const typed = { name: 'Typed', ratio: 10, stock: 5.062361479, unit: 'mM', mw: '' };
  const s = createSession({
      ...baseRecipe(null),
      lipids: [renamed, { ...overridden, ratio: 20 }, custom, edited, typed],
    }),
    p = payloadOf(await encodeSession(s));
  assert.deepEqual(p[10][0][4], { n: 'MC3 lot 7', o: '' });
  assert.equal(p[10][1][4].m, 801.3);
  assert.equal(typeof p[10][2][6].f, 'object');
  assert.equal(p[10][3][6].f.product, 'Lot-specific');
  assert.deepEqual(p[10][4], ['Typed', 10, 0, 5.062361479, '', '']);
  const roundtrip = await decodeSession(await encodeSession(s));
  assert.deepEqual(roundtrip.plan, s.plan);
  assert.deepEqual(roundtrip.working, s.working);
});
test('QR alphanumeric token decodes to the same session as the link token', async () => {
  const s = createSession(multiRecipe(['sm102', 'dspc', 'cholesterol', 'dmg-peg2000']));
  const token = await encodeSession(s),
    [address, recipe] = transferQRSegments('https://example.github.io/lnp/', token);
  assert.equal(address.data, 'https://example.github.io/lnp/#t=');
  assert.match(recipe.data, /^Z3\.[0-9A-Z$*+\-./:]+$/);
  assert.equal(transferToken(new URL(address.data + recipe.data).hash.slice(1)), recipe.data);
  assert.deepEqual((await decodeSession(recipe.data)).working, s.working);
  for (const bad of ['Z3.A', 'Z3.:::', 'Z3.ab', 'Q3.ABC'])
    await assert.rejects(() => decodeSession(bad));
});
test('links from a different library version are refused with an explanation', async () => {
  const p = payloadOf(await encodeSession(createSession(baseRecipe(stockRow('mc3')))));
  const wrongSum = structuredClone(p);
  wrongSum[14] = 'abc';
  const unknownId = structuredClone(p);
  unknownId[10][0][0] = 'no-such-lipid';
  for (const payload of [wrongSum, unknownId])
    await assert.rejects(
      () => decodeSession(tokenOf(payload)),
      /different version of the lipid library/,
    );
});
test('version 2 links made before the compact format still open unchanged', async () => {
  // Token generated by the v2 encoder (commit e319279) for the session below.
  const s = await decodeSession(
    'z1.eJyV0EFLw0AQhuG_Ur7zbJnZJFX3Js1BoYGCngw9pOm2BjebmE0jGtLfLhVB6q0w1-99YEYMMJpQwcDZQ1F-qkGrYEOoGq-YWUDoYaBZL5SwkuRZ2PD55sz8AkILk2P1M54NGiTMTEJCTJqwdoWf-aa3oDxHuqq8ypaRSrN7UMKkExJaxHouhMfGV1_F1lnQiM7ubWd9aWFQl9FJ-tfQ-giE0Dfl27qzLcyIugghO8AIM2Fo3LG2mYOJp2lDOdKn9fKPubnjucQJ4cG61nb_lV1oy5MT_17eXqFsNoQPmDyXS-TqdnKR1uc0wcNgVWx_H4gdjD86N30DVVeBLg',
  );
  const expected = {
    version: 1,
    id: 'legacy-v2-session-0001',
    plannedAt: '2026-10-15T10:00:00.000Z',
    plan: {
      name: 'Legacy v2',
      volume: 1000,
      concentration: 1,
      batches: 1,
      excess: 0,
      minimum: 2,
      notes: 'Plan note',
      lipids: [
        {
          ratio: 50,
          name: 'DLin-MC3-DMA',
          role: 'Ionizable',
          mw: 642.1,
          stock: 25,
          unit: 'mg/mL',
          reference: {
            id: 'mc3',
            mw: 642.1,
            source: 'https://www.caymanchem.com/product/34364/dlin-mc3-dma',
            supplier: 'Cayman Chemical',
            product: '34364',
            form: 'Free base',
            average: false,
            checked: '2026-10-15',
          },
          stockPrep: { massMg: 100, volumeMl: 4 },
        },
        {
          ratio: 50,
          name: 'DSPC',
          role: 'Helper',
          mw: 790.145,
          stock: 25,
          unit: 'mg/mL',
          reference: {
            id: 'dspc',
            mw: 790.145,
            source: 'https://www.avantiresearch.com/en-gb/products/product/850365-180-pc-dspc',
            supplier: 'Avanti Research',
            product: '850365',
            form: '18:0/18:0 PC',
            average: false,
            checked: '2026-10-15',
          },
          stockPrep: { massMg: 100, volumeMl: 4 },
        },
      ],
    },
    working: {
      name: 'Legacy v2',
      volume: 1000,
      concentration: 1,
      batches: 1,
      excess: 0,
      minimum: 2,
      notes: 'Lab note',
      lipids: [
        {
          ratio: 50,
          name: 'DLin-MC3-DMA',
          role: 'Ionizable',
          mw: 642.1,
          stock: 25,
          unit: 'mg/mL',
          reference: {
            id: 'mc3',
            mw: 642.1,
            source: 'https://www.caymanchem.com/product/34364/dlin-mc3-dma',
            supplier: 'Cayman Chemical',
            product: '34364',
            form: 'Free base',
            average: false,
            checked: '2026-10-15',
          },
          stockPrep: { massMg: 100, volumeMl: 4 },
        },
        {
          ratio: 50,
          name: 'DSPC',
          role: 'Helper',
          mw: 790.145,
          stock: 25,
          unit: 'mg/mL',
          reference: {
            id: 'dspc',
            mw: 790.145,
            source: 'https://www.avantiresearch.com/en-gb/products/product/850365-180-pc-dspc',
            supplier: 'Avanti Research',
            product: '850365',
            form: '18:0/18:0 PC',
            average: false,
            checked: '2026-10-15',
          },
          stockPrep: { massMg: 50, volumeMl: 2 },
        },
      ],
    },
    preparedAt: null,
    checked: [],
  };
  assert.deepEqual(s.plan, expected.plan);
  assert.deepEqual(s.working, expected.working);
  assert.equal(s.id, expected.id);
  assert.equal(transferToken('transfer=z1.abc'), 'z1.abc');
});
test('legacy QR links with five-field lipid rows remain readable', async () => {
  const p = {
    v: 1,
    i: 'legacy-session-001',
    t: '2026-10-15T10:00:00.000Z',
    p: ['Legacy', 1000, 1, 1, 0, 2, '', [['Lipid A', 100, 20, 0, 650]]],
    w: [],
    n: '',
    d: null,
  };
  const s = await decodeSession('j1.' + Buffer.from(JSON.stringify(p)).toString('base64url'));
  assert.equal(s.plan.lipids[0].mw, 650);
  assert.deepEqual(calculate(s.working).errors, []);
});
test('Excel and CSV retain preparation inputs and live Excel formulas', async () => {
  const recipe = baseRecipe(stockRow('dspc')),
    workbook = buildWorkbook(ExcelJS, recipe),
    ws = workbook.worksheets[0];
  assert.ok(ws.getCell('C12').formula.includes('IF(ISNUMBER(D'));
  near(ws.getCell('C12').result, 25);
  let prepRow;
  ws.eachRow(row => {
    if (row.getCell(2).value === 100 && row.getCell(3).value === 4) prepRow = row.number;
  });
  assert.ok(prepRow);
  assert.equal(
    ws.getCell('D' + prepRow).formula,
    `IF(AND(ISNUMBER(B${prepRow}),B${prepRow}>0,ISNUMBER(C${prepRow}),C${prepRow}>0),B${prepRow}/C${prepRow},"Check stock preparation")`,
  );
  const bytes = await workbook.xlsx.writeBuffer(),
    read = new ExcelJS.Workbook();
  await read.xlsx.load(bytes);
  near(read.worksheets[0].getCell('J12').result, 790.145 / 25);
  const csv = toCSV(recipe, calculate(recipe));
  assert.ok(csv.includes('Final stock volume (mL)'));
  assert.ok(csv.includes('850365'));
  assert.ok(csv.includes('100'));
  await mkdir('tests/output', { recursive: true });
  await writeFile('tests/output/mass-stock-verification.xlsx', bytes);
});
