import { validateRecipeShape, calculate } from './calculator.js';
import { createSession, validateSession } from './session.js';
import { lipidLibrary, libraryReference, builtInReference } from './lipid-library.js';

const MAX_TEXT = 32000,
  MAX_TOKEN = 44000;
// Errors whose message is meant for the person opening the link.
class TransferError extends Error {}
const libraryMismatch = () =>
  new TransferError(
    'This link was made with a different version of the lipid library. Reload the calculator on both devices so they match, then send it again.',
  );
const canonical = r =>
  JSON.stringify(
    Object.keys(r)
      .sort()
      .map(k => [k, r[k]]),
  );
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
const has = (o, k) => Object.hasOwn(o, k);

// Token formats: "<format>.<data>". Lower case is base64url for links, upper case is base43 for
// the QR alphanumeric mode. z = compressed, j = plain JSON; 1 = legacy v1/v2 payload, 3 = v3.
const FORMATS = {
  z1: ['deflate', 'url'],
  j1: [null, 'url'],
  z3: ['deflate-raw', 'url'],
  j3: [null, 'url'],
  Z3: ['deflate-raw', 'qr'],
  J3: [null, 'qr'],
};

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
// QR alphanumeric characters that are safe in a URL fragment (no space or %): 2 bytes -> 3 chars.
const A43 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
function base43(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const v = bytes[i] * 256 + bytes[i + 1];
      s += A43[v % 43] + A43[Math.floor(v / 43) % 43] + A43[Math.floor(v / 1849)];
    } else s += A43[bytes[i] % 43] + A43[Math.floor(bytes[i] / 43)];
  }
  return s;
}
function unbase43(text) {
  if (!/^[0-9A-Z$*+\-./:]+$/.test(text) || text.length % 3 === 1)
    throw new Error('Invalid transfer encoding.');
  const out = [];
  for (let i = 0; i < text.length; i += 3) {
    const d = [...text.slice(i, i + 3)].map(c => A43.indexOf(c)),
      v = d[0] + d[1] * 43 + (d.length === 3 ? d[2] * 1849 : 0);
    if (v > (d.length === 3 ? 0xffff : 0xff)) throw new Error('Invalid transfer encoding.');
    if (d.length === 3) out.push(v >> 8, v & 0xff);
    else out.push(v);
  }
  return Uint8Array.from(out);
}
function supports(format) {
  try {
    new CompressionStream(format);
    new DecompressionStream(format);
    return true;
  } catch {
    return false;
  }
}
async function transform(bytes, format, decompress = false) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(decompress ? new DecompressionStream(format) : new CompressionStream(format));
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

// ---- v3 payload ----
// [3, id, plannedAt, name, volume, concentration, batches, excess, minimum, notes,
//  lipids, changes, workingNotes (0 = same as plan), preparedAt (0 = null), librarySum (0 = none)]
// Library lipid:  [libraryId, ratio, unit, amount, extra?]
// Other lipid:    [name, ratio, unit, amount, mw, role, extra?]
// amount is [massMg, volumeMl] when a stock preparation exists (stock is then recalculated),
// otherwise the stock. extra holds what cannot be derived: n name, o role, m mw, s stock,
// f full reference. A change is [lipidIndex, workingLipid].
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function packId(id) {
  if (!UUID.test(id)) return id;
  return '!' + base64(Uint8Array.from(id.replaceAll('-', '').match(/../g), h => parseInt(h, 16)));
}
function unpackId(v) {
  if (typeof v !== 'string' || !v.startsWith('!')) return v;
  const hex = [...unbase64(v.slice(1))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== 32) throw new Error();
  return [8, 12, 16, 20].reduceRight((s, i) => s.slice(0, i) + '-' + s.slice(i), hex);
}
function packTime(t) {
  if (t === null) return 0;
  const ms = Date.parse(t);
  return Number.isFinite(ms) && new Date(ms).toISOString() === t ? ms : t;
}
function unpackTime(v) {
  if (typeof v !== 'number') return v;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) throw new Error();
  return d.toISOString();
}
// Same arithmetic as stocks.js, so a recorded preparation reproduces the stock exactly.
function derivedStock(l) {
  const mgMl = l.stockPrep.massMg / l.stockPrep.volumeMl;
  return l.unit === 'mg/mL' ? mgMl : (mgMl * 1000) / Number(l.mw);
}
function packLipid(l) {
  const unit = l.unit === 'mg/mL' ? 1 : 0,
    amount = l.stockPrep ? [l.stockPrep.massMg, l.stockPrep.volumeMl] : l.stock,
    extra = {};
  if (l.stockPrep && derivedStock(l) !== l.stock) extra.s = l.stock;
  const known = l.reference && builtInReference(l.reference.id);
  if (known && canonical(known) === canonical(l.reference)) {
    const entry = lipidLibrary.find(e => e.id === l.reference.id);
    if (l.name !== entry.name) extra.n = l.name;
    if ((l.role || '') !== entry.category) extra.o = l.role || '';
    if (l.mw !== entry.mw) extra.m = l.mw;
    const row = [l.reference.id, l.ratio, unit, amount];
    return Object.keys(extra).length ? [...row, extra] : row;
  }
  if (l.reference) extra.f = l.reference;
  const row = [l.name, l.ratio, unit, amount, l.mw, l.role || ''];
  return Object.keys(extra).length ? [...row, extra] : row;
}
function unpackLipid(a, libraryIds) {
  if (!Array.isArray(a) || ![4, 5, 6, 7].includes(a.length) || ![0, 1].includes(a[2]))
    throw new Error();
  const libraryForm = a.length <= 5,
    extra = a[libraryForm ? 4 : 6] ?? {};
  if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) throw new Error();
  const row = { ratio: a[1], unit: a[2] === 1 ? 'mg/mL' : 'mM' };
  let role;
  if (libraryForm) {
    const entry = typeof a[0] === 'string' && lipidLibrary.find(e => e.id === a[0]);
    if (!entry) throw libraryMismatch();
    libraryIds.add(entry.id);
    row.name = has(extra, 'n') ? extra.n : entry.name;
    row.mw = has(extra, 'm') ? extra.m : entry.mw;
    row.reference = libraryReference(entry);
    role = has(extra, 'o') ? extra.o : entry.category;
  } else {
    Object.assign(row, { name: a[0], mw: a[4] });
    if (has(extra, 'f')) row.reference = extra.f;
    role = a[5];
  }
  if (role) row.role = role;
  if (Array.isArray(a[3])) {
    if (a[3].length !== 2) throw new Error();
    row.stockPrep = { massMg: a[3][0], volumeMl: a[3][1] };
    row.stock = has(extra, 's') ? extra.s : derivedStock(row);
  } else row.stock = a[3];
  return row;
}
const librarySum = ids =>
  ids.size
    ? checksum(
        [...ids]
          .sort()
          .map(id => canonical(builtInReference(id)))
          .join(),
      )
    : 0;
function packSession(s) {
  const p = s.plan,
    w = s.working,
    lipids = p.lipids.map(packLipid),
    changes = [],
    ids = new Set();
  w.lipids.forEach((l, i) => {
    const row = packLipid(l);
    if (JSON.stringify(row) !== JSON.stringify(lipids[i])) changes.push([i, row]);
  });
  for (const row of [...lipids, ...changes.map(c => c[1])]) if (row.length <= 5) ids.add(row[0]);
  const notes = p.notes || '',
    workingNotes = w.notes || '';
  return [
    3,
    packId(s.id),
    packTime(s.plannedAt),
    p.name,
    p.volume,
    p.concentration,
    p.batches,
    p.excess,
    p.minimum,
    notes,
    lipids,
    changes,
    workingNotes === notes ? 0 : workingNotes,
    packTime(s.preparedAt),
    librarySum(ids),
  ];
}
function unpackSession(p) {
  if (!Array.isArray(p) || p.length !== 15 || !Array.isArray(p[10]) || !Array.isArray(p[11]))
    throw new Error();
  const ids = new Set(),
    recipe = {
      name: p[3],
      volume: p[4],
      concentration: p[5],
      batches: p[6],
      excess: p[7],
      minimum: p[8],
      notes: p[9],
      lipids: p[10].map(a => unpackLipid(a, ids)),
    };
  if (!validateRecipeShape(recipe) || calculate(recipe).errors.length) throw new Error();
  const s = createSession(recipe, unpackTime(p[2]));
  s.id = unpackId(p[1]);
  s.preparedAt = p[13] === 0 ? null : unpackTime(p[13]);
  const indices = new Set();
  for (const change of p[11]) {
    if (
      !Array.isArray(change) ||
      change.length !== 2 ||
      !Number.isInteger(change[0]) ||
      !s.working.lipids[change[0]] ||
      indices.has(change[0])
    )
      throw new Error();
    indices.add(change[0]);
    s.working.lipids[change[0]] = unpackLipid(change[1], ids);
  }
  s.working.notes = p[12] === 0 ? recipe.notes : p[12];
  if (librarySum(ids) !== p[14]) throw libraryMismatch();
  return s;
}

// ---- legacy v1/v2 payloads (decode only) ----
// v2 carries built-in references as "id~checksum"; v1 always carries full references.
function expandReference(r) {
  if (typeof r !== 'string') return r;
  const [id, sum] = r.split('~'),
    known = builtInReference(id);
  if (!known || checksum(canonical(known)) !== sum) throw libraryMismatch();
  return known;
}
const unpackMetadata = m => ({
  ...(m.reference ? { reference: expandReference(m.reference) } : {}),
  ...(m.stockPrep ? { stockPrep: m.stockPrep } : {}),
});
function unpackLegacyRecipe(a) {
  if (!Array.isArray(a) || a.length !== 8 || !Array.isArray(a[7])) throw new Error();
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
        throw new Error();
      const m = unpackMetadata(l[6] || {});
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
function unpackLegacySession(p) {
  if (![1, 2].includes(p?.v) || !Array.isArray(p.w)) throw new Error();
  const recipe = unpackLegacyRecipe(p.p);
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
      const m = unpackMetadata(change[4] || {});
      if (m.reference) row.reference = m.reference;
      if (m.stockPrep) row.stockPrep = m.stockPrep;
    }
  }
  s.working.notes = p.n;
  return s;
}

// ---- public API ----
export async function encodeSession(session) {
  if (!validateSession(session) || calculate(session.working).errors.length)
    throw new Error('Correct the inputs before transferring this session.');
  const bytes = new TextEncoder().encode(JSON.stringify(packSession(session)));
  if (bytes.length > MAX_TEXT)
    throw new Error('Recipe is too large to share. Export a JSON backup instead.');
  if (typeof CompressionStream !== 'undefined' && supports('deflate-raw'))
    return 'z3.' + base64(await transform(bytes, 'deflate-raw'));
  return 'j3.' + base64(bytes);
}
export async function decodeSession(token) {
  try {
    if (typeof token !== 'string' || token.length > MAX_TOKEN || token[2] !== '.')
      throw new Error();
    const format = token.slice(0, 2),
      data = token.slice(3);
    if (!has(FORMATS, format)) throw new Error();
    const [compression, alphabet] = FORMATS[format];
    let bytes = alphabet === 'qr' ? unbase43(data) : unbase64(data);
    if (compression) {
      if (typeof DecompressionStream === 'undefined' || !supports(compression))
        throw new TransferError(
          'This browser cannot open compressed recipe links. Use an up-to-date browser.',
        );
      bytes = await transform(bytes, compression, true);
    }
    if (bytes.length > MAX_TEXT) throw new Error();
    const p = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const s = format[1] === '3' ? unpackSession(p) : unpackLegacySession(p);
    if (!validateSession(s) || calculate(s.working).errors.length) throw new Error();
    return s;
  } catch (error) {
    if (error instanceof TransferError) throw error;
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
  u.hash = 't=' + token;
  return u.href;
}
// QR segments: the address in byte mode, the recipe in the denser alphanumeric mode.
export function transferQRSegments(base, token) {
  const format = token.slice(0, 2);
  if (!['z3', 'j3'].includes(format)) throw new Error('Unsupported transfer token.');
  return [
    { data: transferURL(base, ''), mode: 'byte' },
    { data: format.toUpperCase() + '.' + base43(unbase64(token.slice(3))), mode: 'alphanumeric' },
  ];
}
// The transfer token in a location hash (without "#"), or null. Accepts the older "transfer=".
export function transferToken(hash) {
  const match = /^(?:t|transfer)=(.+)$/.exec(hash);
  return match ? match[1] : null;
}
export function isLoopback(base) {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname);
  } catch {
    return false;
  }
}
