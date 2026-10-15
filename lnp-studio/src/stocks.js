export function stockFromMass(massMg, volumeMl, mw) {
  const n = v => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const mass = n(massMg),
    volume = n(volumeMl),
    weight = n(mw);
  if (!(mass > 0 && Number.isFinite(mass)))
    throw new Error('Enter a lipid mass greater than 0 mg.');
  if (!(volume > 0 && Number.isFinite(volume)))
    throw new Error('Enter a final stock volume greater than 0 mL.');
  const mgMl = mass / volume,
    stockMM = weight > 0 ? (mgMl * 1000) / weight : null;
  if (!Number.isFinite(mgMl) || (stockMM !== null && !Number.isFinite(stockMM)))
    throw new Error('These stock inputs exceed the supported numeric range.');
  return { mgMl, stockMM };
}
export function applyStockPreparation(row, massMg, volumeMl) {
  const { mgMl } = stockFromMass(massMg, volumeMl, row.mw);
  return {
    ...row,
    stock: mgMl,
    unit: 'mg/mL',
    stockPrep: { massMg: Number(massMg), volumeMl: Number(volumeMl) },
  };
}
export function updateStockInput(row, field, value) {
  const next = { ...row, [field]: value };
  if (field === 'stock') delete next.stockPrep;
  if (field === 'name') delete next.reference;
  if (field === 'mw' && next.stockPrep && next.unit === 'mM') {
    const weight = Number(value);
    next.stock =
      value !== '' && weight > 0 && Number.isFinite(weight)
        ? ((next.stockPrep.massMg / next.stockPrep.volumeMl) * 1000) / weight
        : '';
  }
  return next;
}
export function changeStockUnit(row, unit) {
  const next = { ...row, unit },
    weight = Number(row.mw);
  if (row.unit === unit) return next;
  if (row.stockPrep) {
    const mgMl = row.stockPrep.massMg / row.stockPrep.volumeMl;
    next.stock =
      unit === 'mg/mL' ? mgMl : weight > 0 && Number.isFinite(weight) ? (mgMl * 1000) / weight : '';
  } else
    next.stock =
      row.stock !== '' && weight > 0 && Number.isFinite(weight)
        ? unit === 'mg/mL'
          ? (Number(row.stock) * weight) / 1000
          : (Number(row.stock) * 1000) / weight
        : '';
  return next;
}
export function validStockMetadata(l) {
  const p = l.stockPrep,
    r = l.reference;
  return (
    (p === undefined ||
      p === null ||
      (typeof p === 'object' &&
        ['massMg', 'volumeMl'].every(
          k => typeof p[k] === 'number' && Number.isFinite(p[k]) && p[k] > 0,
        ))) &&
    (r === undefined ||
      r === null ||
      (typeof r === 'object' &&
        typeof r.id === 'string' &&
        r.id.length <= 100 &&
        typeof r.mw === 'number' &&
        r.mw > 0 &&
        Number.isFinite(r.mw) &&
        ['source', 'supplier', 'product', 'form', 'checked'].every(
          k => r[k] === undefined || (typeof r[k] === 'string' && r[k].length <= 1000),
        ) &&
        (r.average === undefined || typeof r.average === 'boolean')))
  );
}
export function stockProvenanceWarning(l) {
  if (!l.stockPrep) return null;
  try {
    const expected = stockFromMass(l.stockPrep.massMg, l.stockPrep.volumeMl, l.mw);
    const actual = l.unit === 'mg/mL' ? Number(l.stock) : (Number(l.stock) * Number(l.mw)) / 1000;
    return !Number.isFinite(actual) ||
      Math.abs(actual - expected.mgMl) > Math.max(1e-10, expected.mgMl * 1e-9)
      ? 'Stock concentration disagrees with its recorded mass and volume. Reapply the stock preparation or enter the stock concentration directly.'
      : null;
  } catch (e) {
    return e.message;
  }
}
