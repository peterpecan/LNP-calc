import { validStockMetadata, stockProvenanceWarning } from './stocks.js';
/* LOCAL_WORKSHEET_START */
export const sourceRecipe = {
  name: 'MC3 · PEG-MAL',
  volume: 2500,
  concentration: 12.5,
  batches: 1,
  excess: 0,
  minimum: 2,
  notes: '',
  lipids: [
    { name: 'MC3', role: 'Ionizable', ratio: 50, stock: 77.87, unit: 'mM', mw: 642.11 },
    { name: 'DSPC', role: 'Phospholipid', ratio: 10, stock: 5.45, unit: 'mM', mw: 790.145 },
    { name: 'Cholesterol', role: 'Sterol', ratio: 38, stock: 10.35, unit: 'mM', mw: 386.65 },
    { name: 'DMG-PEG 2000', role: 'PEG lipid', ratio: 1.95, stock: 19.93, unit: 'mM', mw: 2509.2 },
    { name: 'DSPE-PEG-MAL', role: 'Functional lipid', ratio: 0.05, stock: 8.5, unit: 'mM', mw: '' },
  ],
};
/* LOCAL_WORKSHEET_END */
const number = v =>
  v === '' || v === null || v === undefined || typeof v === 'boolean' ? NaN : Number(v);
export function calculate(recipe) {
  const errors = [],
    warnings = [];
  const volume = number(recipe.volume),
    concentration = number(recipe.concentration),
    batches = number(recipe.batches),
    excess = number(recipe.excess),
    minimum = number(recipe.minimum);
  if (!(volume > 0 && Number.isFinite(volume)))
    errors.push('Enter a lipid phase volume greater than 0.');
  if (!(concentration > 0 && Number.isFinite(concentration)))
    errors.push('Enter a total lipid concentration greater than 0.');
  if (!(batches >= 1 && Number.isSafeInteger(batches)))
    errors.push('Batch count must be a positive whole number.');
  if (!(excess >= 0 && Number.isFinite(excess))) errors.push('Overage must be 0% or greater.');
  if (!(minimum >= 0 && Number.isFinite(minimum)))
    errors.push('Pipetting threshold must be 0 µL or greater.');
  if (!Array.isArray(recipe.lipids) || !recipe.lipids.length)
    return { errors: [...errors, 'Add at least one lipid.'], warnings, rows: [] };
  const sum = recipe.lipids.reduce((s, l) => s + number(l.ratio), 0);
  if (!(sum > 0 && Number.isFinite(sum))) errors.push('Molar parts must have a positive total.');
  const scale = batches * (1 + excess / 100),
    totalVolume = volume * scale,
    totalNmol = totalVolume * concentration;
  const rows = recipe.lipids.map((l, i) => {
    const label = String(l.name || '').trim() || `Lipid ${i + 1}`;
    const ratio = number(l.ratio),
      stock = number(l.stock),
      mw = number(l.mw);
    if (!String(l.name || '').trim()) errors.push(`Name lipid ${i + 1}.`);
    if (!(ratio >= 0 && Number.isFinite(ratio)))
      errors.push(`${label}: molar parts must be 0 or greater.`);
    if (!['mM', 'mg/mL'].includes(l.unit))
      errors.push(`${label}: choose mM or mg/mL for the stock.`);
    if (ratio > 0 && !(stock > 0 && Number.isFinite(stock)))
      errors.push(`${label}: stock concentration must be greater than 0.`);
    if (l.mw !== '' && !(mw > 0 && Number.isFinite(mw)))
      errors.push(`${label}: molecular weight must be greater than 0, or left blank.`);
    if (ratio > 0 && l.unit === 'mg/mL' && !(mw > 0 && Number.isFinite(mw)))
      errors.push(`${label}: enter a molecular weight to convert mg/mL to mM.`);
    if (!validStockMetadata(l))
      errors.push(`${label}: invalid stock preparation or molecular-weight reference.`);
    if (ratio > 0) {
      const mismatch = stockProvenanceWarning(l);
      if (mismatch) errors.push(`${label}: ${mismatch}`);
    }
    if (l.reference && mw > 0 && Math.abs(mw - l.reference.mw) > 1e-8)
      warnings.push(
        `${label}: molecular weight overridden to ${mw} g/mol (library reference ${l.reference.mw} g/mol).`,
      );
    const stockMM = l.unit === 'mg/mL' ? (stock * 1000) / mw : stock;
    const fraction = ratio / sum,
      nmol = totalNmol * fraction,
      stockVolume = ratio === 0 ? 0 : nmol / stockMM;
    const massUg = ratio === 0 ? 0 : mw > 0 ? (nmol * mw) / 1000 : null;
    if (ratio > 0 && stockVolume > 0 && stockVolume < minimum)
      warnings.push(
        `${label}: ${stockVolume.toFixed(3)} µL is below your ${minimum} µL pipetting threshold.`,
      );
    return { ...l, name: label, fraction, stockMM, nmol, volume: stockVolume, massUg };
  });
  const stockVolume = rows.reduce((s, r) => s + r.volume, 0),
    ethanol = totalVolume - stockVolume;
  if (Number.isFinite(ethanol) && ethanol < -Math.max(1e-9, totalVolume * 1e-12))
    errors.push(
      'Stock volumes exceed the lipid phase volume. Increase the phase volume relative to lipid amount by lowering total lipid concentration, or use more concentrated stocks.',
    );
  if ([scale, totalVolume, totalNmol, stockVolume].some(v => !Number.isFinite(v))) {
    if (!errors.length) errors.push('These inputs exceed the supported numeric range.');
  }
  const missingMass = rows.filter(r => r.massUg === null && number(r.ratio) > 0).map(r => r.name);
  if (missingMass.length)
    warnings.push(
      `Mass unavailable for ${missingMass.join(', ')}. Enter the product-specific molecular weight to include it.`,
    );
  /* LOCAL_STOCK_NOTE_START */
  const dspc = rows.find(r => r.name.trim().toLowerCase() === 'dspc');
  if (dspc && dspc.unit === 'mM' && Math.abs(number(dspc.stock) - 5.45) < 0.00001)
    warnings.push(
      'Worksheet DSPC stock retained at 5.45 mM. If your stock is 4 mg/mL DSPC (790.145 g/mol), use 5.062 mM instead. Confirm your product and stock label.',
    );
  /* LOCAL_STOCK_NOTE_END */
  return {
    errors: [...new Set(errors)],
    warnings,
    rows,
    sum,
    scale,
    totalVolume,
    totalNmol,
    stockVolume,
    ethanol: Math.max(0, ethanol),
    totalMassUg: missingMass.length ? null : rows.reduce((s, r) => s + r.massUg, 0),
  };
}
export function validateRecipeShape(r) {
  const numeric = v =>
    typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' && v.length <= 40;
  return Boolean(
    r &&
    typeof r === 'object' &&
    typeof r.name === 'string' &&
    r.name.length <= 200 &&
    (r.notes === undefined || (typeof r.notes === 'string' && r.notes.length <= 5000)) &&
    Array.isArray(r.lipids) &&
    r.lipids.length > 0 &&
    r.lipids.length <= 50 &&
    ['volume', 'concentration', 'batches', 'excess', 'minimum'].every(k => numeric(r[k])) &&
    r.lipids.every(
      l =>
        l &&
        typeof l.name === 'string' &&
        l.name.length <= 200 &&
        ['ratio', 'stock', 'mw'].every(k => numeric(l[k])) &&
        ['mM', 'mg/mL'].includes(l.unit) &&
        validStockMetadata(l),
    ),
  );
}
export function toCSV(recipe, result) {
  if (result.errors.length) throw new Error('Correct the inputs before exporting.');
  const safe = v => {
    let s = String(v ?? '');
    if (/^[\s]*[=+@-]/.test(s) && typeof v !== 'number') s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = [
    ['LNP calculator', recipe.name],
    ['Lipid phase volume per batch (uL)', Number(recipe.volume)],
    ['Total lipid concentration (mM)', Number(recipe.concentration)],
    ['Batches', Number(recipe.batches)],
    ['Overage (%)', Number(recipe.excess)],
    ['Prepared volume (uL)', result.totalVolume],
    ['Total lipid (nmol)', result.totalNmol],
    [],
    [
      'Lipid',
      'Molar parts',
      'Molar percent',
      'Stock input',
      'Stock unit',
      'MW (g/mol)',
      'Stock (mM)',
      'Lipid (nmol)',
      'Mass (ug)',
      'Stock volume (uL)',
      'Stock preparation mass (mg)',
      'Final stock volume (mL)',
      'MW reference',
      'MW reference URL',
      'Average MW',
    ],
    ...result.rows.map(r => [
      r.name,
      Number(r.ratio),
      r.fraction * 100,
      Number(r.stock),
      r.unit,
      r.mw,
      r.stockMM,
      r.nmol,
      r.massUg,
      r.volume,
      r.stockPrep?.massMg ?? '',
      r.stockPrep?.volumeMl ?? '',
      r.reference ? `${r.reference.supplier} ${r.reference.product}` : '',
      r.reference?.source || '',
      r.reference?.average ? 'Yes' : '',
    ]),
    ['Ethanol top-up (uL)', result.ethanol],
    ['Total volume (uL)', result.totalVolume],
    ['Notes', recipe.notes || ''],
    [],
    [
      'Assumption',
      'All stock volumes contribute to the lipid phase volume; top-up solvent is ethanol.',
    ],
    ...result.warnings.map(w => ['Review note', w]),
  ];
  return '\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\r\n');
}
