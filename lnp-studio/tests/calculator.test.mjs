import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, validateRecipeShape, toCSV } from '../src/calculator.js';
import { fixtureRecipe } from './fixture.mjs';
const clone = () => structuredClone(fixtureRecipe);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} differs from ${b}`);
test('computes every aliquot and the solvent balance', () => {
  const r = calculate(clone());
  assert.deepEqual(r.errors, []);
  [100, 100, 190, 39.8, 0.25].forEach((v, i) => close(r.rows[i].volume, v));
  close(r.ethanol, 569.95);
  close(r.totalNmol, 10000);
  close(r.stockVolume + r.ethanol, r.totalVolume);
  assert.equal(r.rows[4].massUg, null);
});
test('batch count and overage scale every amount without changing concentration', () => {
  const p = clone();
  p.batches = 3;
  p.excess = 10;
  const base = calculate(clone()),
    r = calculate(p);
  assert.deepEqual(r.errors, []);
  close(r.totalVolume, 3300);
  r.rows.forEach((row, i) => close(row.volume, base.rows[i].volume * 3.3));
  close(r.ethanol, base.ethanol * 3.3);
});
test('ratios are normalized; equivalent ratios give identical outputs', () => {
  const p = clone();
  p.lipids.forEach(l => (l.ratio *= 2.7));
  const r = calculate(p),
    base = calculate(clone());
  r.rows.forEach((row, i) => close(row.volume, base.rows[i].volume));
});
test('mg/mL stocks use verified MW and conversion is dimensionally correct', () => {
  const p = clone();
  Object.assign(p.lipids[1], { unit: 'mg/mL', stock: 4, mw: 790.145 });
  const r = calculate(p);
  assert.deepEqual(r.errors, []);
  close(r.rows[1].stockMM, 4000 / 790.145);
  close(r.rows[1].volume, 1000 / (4000 / 790.145));
  close(r.rows[1].massUg, 790.145);
  close(r.rows[1].volume * 4, r.rows[1].massUg);
});
test('requires MW only for included mass-based stocks', () => {
  const p = clone();
  p.lipids[4].unit = 'mg/mL';
  assert.ok(calculate(p).errors.some(e => e.includes('molecular weight')));
  p.lipids[4].ratio = 0;
  assert.deepEqual(calculate(p).errors, []);
});
test('invalid, blank, negative, fractional batch and nonfinite inputs block results', () => {
  for (const [k, v] of [
    ['volume', ''],
    ['volume', 0],
    ['concentration', -1],
    ['batches', 1.5],
    ['batches', ''],
    ['excess', -1],
    ['minimum', ''],
    ['volume', Infinity],
  ]) {
    const p = clone();
    p[k] = v;
    assert.ok(calculate(p).errors.length, `${k}=${v}`);
  }
  const p = clone();
  p.lipids[0].stock = '';
  assert.ok(calculate(p).errors.length);
  p.lipids[0].stock = 50;
  p.lipids.forEach(l => (l.ratio = 0));
  assert.ok(calculate(p).errors.length);
});
test('negative solvent is blocked and cannot be exported', () => {
  const p = clone();
  p.concentration = 100;
  const r = calculate(p);
  assert.ok(r.errors.some(e => e.includes('exceed')));
  assert.throws(() => toCSV(p, r));
});
test('zero-ratio component needs no stock or mass', () => {
  const p = clone();
  p.lipids.push({ name: 'Unused', ratio: 0, stock: '', unit: 'mM', mw: '' });
  const r = calculate(p);
  assert.deepEqual(r.errors, []);
  close(r.rows.at(-1).volume, 0);
  close(r.ethanol, calculate(clone()).ethanol);
});
test('pipetting warning is configurable and does not round away small amounts', () => {
  const p = clone();
  let r = calculate(p);
  assert.ok(r.warnings.some(w => w.includes('threshold')));
  p.minimum = 0.2;
  r = calculate(p);
  assert.ok(!r.warnings.some(w => w.includes('threshold')));
  const csv = toCSV(p, r);
  assert.ok(csv.includes(String(r.rows[3].volume)));
});
test('CSV quotes embedded text and neutralizes spreadsheet formulas', () => {
  const p = clone();
  p.name = '=HYPERLINK("bad")';
  p.notes = 'line one\nline two';
  const csv = toCSV(p, calculate(p));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"line one\nline two"'));
});
test('recipe import rejects unsupported or malformed structures', () => {
  assert.equal(validateRecipeShape(clone()), true);
  assert.equal(Boolean(validateRecipeShape(null)), false);
  const p = clone();
  p.lipids[0].unit = 'M';
  assert.equal(validateRecipeShape(p), false);
});
