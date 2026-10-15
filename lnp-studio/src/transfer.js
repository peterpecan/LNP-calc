import { validateRecipeShape, calculate } from './calculator.js';
import { createSession, validateSession } from './session.js';

const MAX_TEXT = 32000,
  MAX_TOKEN = 44000;
const metadata = l => ({
  ...(l.reference ? { reference: l.reference } : {}),
  ...(l.stockPrep ? { stockPrep: l.stockPrep } : {}),
});
const pack = r => [
  r.name,
  r.volume,
  r.concentration,
  r.batches,
  r.excess,
  r.minimum,
  r.notes || '',
  r.lipids.map(l => [
    l.name,
    l.ratio,
    l.stock,
    l.unit === 'mg/mL' ? 1 : 0,
    l.mw,
    l.role || '',
    metadata(l),
  ]),
];
function unpack(a) {
  if (!Array.isArray(a) || a.length !== 8 || !Array.isArray(a[7]))
    throw new Error('Invalid recipe in transfer link.');
  return {
    name: a[0],
    volume: a[1],
    concentration: a[2],
    batches: a[3],
    excess: a[4],
    minimum: a[5],
    notes: a[6],
    lipids: a[7].map(l => {
      if (!Array.isArray(l) || ![5, 6, 7].includes(l.length) || ![0, 1].includes(l[3]))
        throw new Error('Invalid lipid in transfer link.');
      const m = l[6] || {};
      return {
        name: l[0],
        ratio: l[1],
        stock: l[2],
        unit: l[3] === 1 ? 'mg/mL' : 'mM',
        mw: l[4],
        ...(l[5] ? { role: l[5] } : {}),
        ...(m.reference ? { reference: m.reference } : {}),
        ...(m.stockPrep ? { stockPrep: m.stockPrep } : {}),
      };
    }),
  };
}
function base64(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unbase64(text) {
  if (!/^[a-zA-Z0-9_-]+$/.test(text)) throw new Error('Invalid transfer encoding.');
  return Uint8Array.from(
    atob(text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (text.length % 4)) % 4)),
    c => c.charCodeAt(0),
  );
}
async function transform(bytes, decompress = false) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(
      decompress ? new DecompressionStream('deflate') : new CompressionStream('deflate'),
    );
  const reader = stream.getReader(),
    chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_TEXT) {
      await reader.cancel();
      throw new Error('Transfer exceeds the recipe size limit.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
export async function encodeSession(session) {
  if (!validateSession(session) || calculate(session.working).errors.length)
    throw new Error('Correct the inputs before transferring this session.');
  const changes = session.working.lipids
    .map((l, i) => {
      const p = session.plan.lipids[i];
      return String(l.stock) !== String(p.stock) ||
        l.unit !== p.unit ||
        String(l.mw) !== String(p.mw) ||
        JSON.stringify(metadata(l)) !== JSON.stringify(metadata(p))
        ? [i, l.stock, l.unit === 'mg/mL' ? 1 : 0, l.mw, metadata(l)]
        : null;
    })
    .filter(Boolean);
  const payload = {
    v: 1,
    i: session.id,
    t: session.plannedAt,
    p: pack(session.plan),
    w: changes,
    n: session.working.notes || '',
    d: session.preparedAt,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > MAX_TEXT)
    throw new Error('Recipe is too large to share. Export a JSON backup instead.');
  if (typeof CompressionStream !== 'undefined') return 'z1.' + base64(await transform(bytes));
  return 'j1.' + base64(bytes);
}
export async function decodeSession(token) {
  try {
    if (typeof token !== 'string' || token.length > MAX_TOKEN) throw new Error();
    const [format, encoded, ...extra] = token.split('.');
    if (extra.length || !['z1', 'j1'].includes(format)) throw new Error();
    let bytes = unbase64(encoded);
    if (format === 'z1') {
      if (typeof DecompressionStream === 'undefined')
        throw new Error(
          'This browser cannot open compressed recipe links. Use an up-to-date browser.',
        );
      bytes = await transform(bytes, true);
    }
    if (bytes.length > MAX_TEXT) throw new Error();
    const p = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (p.v !== 1 || !Array.isArray(p.w)) throw new Error();
    const recipe = unpack(p.p);
    if (!validateRecipeShape(recipe) || calculate(recipe).errors.length) throw new Error();
    const s = createSession(recipe, p.t);
    s.id = p.i;
    s.preparedAt = p.d;
    const indices = new Set();
    for (const change of p.w) {
      if (
        !Array.isArray(change) ||
        ![4, 5].includes(change.length) ||
        !Number.isInteger(change[0]) ||
        !s.working.lipids[change[0]] ||
        ![0, 1].includes(change[2]) ||
        indices.has(change[0])
      )
        throw new Error();
      indices.add(change[0]);
      const row = s.working.lipids[change[0]];
      Object.assign(row, {
        stock: change[1],
        unit: change[2] === 1 ? 'mg/mL' : 'mM',
        mw: change[3],
      });
      if (change.length === 5) {
        delete row.reference;
        delete row.stockPrep;
        const m = change[4] || {};
        if (m.reference) row.reference = m.reference;
        if (m.stockPrep) row.stockPrep = m.stockPrep;
      }
    }
    s.working.notes = p.n;
    if (!validateSession(s) || calculate(s.working).errors.length) throw new Error();
    return s;
  } catch (error) {
    if (error.message.includes('This browser')) throw error;
    throw new Error(
      'This recipe link is invalid, incomplete, or from an unsupported version. Your current work has been kept.',
    );
  }
}
export function transferURL(base, token) {
  const u = new URL(base);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
    throw new Error('Enter a full https:// website URL, or an http:// local network URL.');
  u.search = '';
  u.hash = 'transfer=' + token;
  return u.href;
}
export function isLoopback(base) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname);
  } catch {
    return false;
  }
}
