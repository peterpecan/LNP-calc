import { calculate, validateRecipeShape } from './calculator.js';
import { updateStockInput } from './stocks.js';

export const copy = value => structuredClone(value);
export function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export function createSession(recipe, now = new Date().toISOString()) {
  if (!validateRecipeShape(recipe) || calculate(recipe).errors.length) throw new Error('Correct the recipe inputs before starting a lab session.');
  return { version: 1, id: makeId(), plannedAt: now, plan: copy(recipe), working: copy(recipe), preparedAt: null, checked: [] };
}
export function validateSession(s) {
  if (!s || s.version !== 1 || typeof s.id !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(s.id) || typeof s.plannedAt !== 'string' || !Number.isFinite(Date.parse(s.plannedAt)) || !validateRecipeShape(s.plan) || !validateRecipeShape(s.working) || calculate(s.plan).errors.length) return false;
  if (s.preparedAt !== null && !Number.isFinite(Date.parse(s.preparedAt))) return false;
  if (!Array.isArray(s.checked) || s.checked.some(i => !Number.isInteger(i) || i < 0 || i > s.plan.lipids.length)) return false;
  return sameTargets(s.plan, s.working);
}
export function sameTargets(plan, working) {
  return ['name','volume','concentration','batches','excess','minimum'].every(k => String(plan[k]) === String(working[k])) && plan.lipids.length === working.lipids.length && plan.lipids.every((l, i) => l.name === working.lipids[i].name && Number(l.ratio) === Number(working.lipids[i].ratio));
}
export function isAdjusted(s) {
  return s.plan.lipids.some((l,i) => {
    const w = s.working.lipids[i];
    const asMM = row => row.unit === 'mM' ? Number(row.stock) : Number(row.stock) * 1000 / Number(row.mw);
    return Math.abs(asMM(l) - asMM(w)) > 1e-10 || String(l.mw) !== String(w.mw) || JSON.stringify(l.stockPrep||null)!==JSON.stringify(w.stockPrep||null);
  }) || (s.plan.notes || '') !== (s.working.notes || '');
}
export function updateStock(session, index, field, value) {
  if (!['stock','unit','mw'].includes(field) || !session.working.lipids[index]) throw new Error('Unknown stock input.');
  const s = copy(session);
  s.working.lipids[index] = updateStockInput(s.working.lipids[index],field,value);
  s.preparedAt = null;
  // Any aliquot can change, including ethanol; recheck the complete sheet.
  s.checked = [];
  return s;
}
export function preparedRecord(session, now = new Date().toISOString()) {
  if (!validateSession(session) || calculate(session.working).errors.length) throw new Error('Correct the lab stock inputs before saving a preparation.');
  const snapshot = copy(session);
  snapshot.preparedAt = now;
  return { id: makeId(), kind: 'prepared', recipe: copy(snapshot.working), session: snapshot, updated: now };
}
