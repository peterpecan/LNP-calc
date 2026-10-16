// Supplier formula weights, checked 2026-10-15. PEG values are averages.
// Values are copied into recipes so catalogue updates cannot alter saved work.
export const lipidLibrary = [
  {
    id: 'mc3',
    name: 'DLin-MC3-DMA',
    aliases: 'MC3 MC-3 DLin MC3 DMA',
    category: 'Ionizable',
    mw: 642.1,
    form: 'Free base',
    supplier: 'Cayman Chemical',
    product: '34364',
    source: 'https://www.caymanchem.com/product/34364/dlin-mc3-dma',
  },
  {
    id: 'sm102',
    name: 'SM-102',
    aliases: 'SM102 Lipid H LNP-102',
    category: 'Ionizable',
    mw: 710.2,
    form: 'Free base',
    supplier: 'Cayman Chemical',
    product: '33474',
    source: 'https://cdn.caymanchem.com/cdn/insert/33474.pdf',
  },
  {
    id: 'alc0315',
    name: 'ALC-0315',
    aliases: 'ALC0315',
    category: 'Ionizable',
    mw: 766.3,
    form: 'Free base',
    supplier: 'Cayman Chemical',
    product: '34337',
    source: 'https://www.caymanchem.com/product/34337/alc-0315',
  },
  {
    id: 'dodap',
    name: 'DODAP',
    aliases: '18:1 DAP',
    category: 'Ionizable',
    mw: 648.054,
    form: 'No counterion in listed formula',
    supplier: 'Avanti Research',
    product: '890850',
    source: 'https://www.avantiresearch.com/en-gb/products/product/890850-181-dap',
  },
  {
    id: 'dspc',
    name: 'DSPC',
    aliases: '18:0 PC distearoyl phosphatidylcholine',
    category: 'Helper',
    mw: 790.145,
    form: '18:0/18:0 PC',
    supplier: 'Avanti Research',
    product: '850365',
    source: 'https://www.avantiresearch.com/en-gb/products/product/850365-180-pc-dspc',
  },
  {
    id: 'dopc',
    name: 'DOPC',
    aliases: '18:1 PC dioleoyl phosphatidylcholine',
    category: 'Helper',
    mw: 786.11,
    form: '18:1/18:1 PC',
    supplier: 'Echelon Biosciences',
    product: 'DOPC (18:1/18:1)',
    source: 'https://www.echelon-inc.com/product/dopc-181-181/',
  },
  {
    id: 'dope',
    name: 'DOPE',
    aliases: '18:1 PE dioleoyl phosphatidylethanolamine',
    category: 'Helper',
    mw: 744.034,
    form: '18:1/18:1 PE',
    supplier: 'Avanti Research',
    product: '850725',
    source: 'https://www.avantiresearch.com/en-gb/products/product/850725-dope-181-pe',
  },
  {
    id: 'dppc',
    name: 'DPPC',
    aliases: '16:0 PC dipalmitoyl phosphatidylcholine',
    category: 'Helper',
    mw: 734.039,
    form: '16:0/16:0 PC',
    supplier: 'Avanti Research',
    product: '850355',
    source: 'https://www.avantiresearch.com/en-gb/products/product/850355-160-pc-dppc',
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol',
    aliases: 'Chol',
    category: 'Sterol',
    mw: 386.65,
    form: 'Cholesterol',
    supplier: 'Sigma-Aldrich',
    product: 'C8667',
    source: 'https://www.sigmaaldrich.com/US/en/product/sigma/c8667',
  },
  {
    id: 'dotap-cl',
    name: 'DOTAP (chloride)',
    aliases: 'DOTAP 18:1 TAP',
    category: 'Cationic',
    mw: 698.542,
    form: 'Chloride salt; includes counterion',
    supplier: 'Avanti Research',
    product: '890890',
    source: 'https://www.avantiresearch.com/en-gb/products/product/890890-181-tap-dotap',
  },
  {
    id: 'dmg-peg2000',
    name: 'DMG-PEG 2000',
    aliases: 'DMG PEG2K PEGylated',
    category: 'PEG',
    mw: 2509.2,
    average: true,
    form: 'Methoxy PEG 2000 glyceride',
    supplier: 'Avanti Research',
    product: '880151',
    source: 'https://www.avantiresearch.com/en-gb/products/product/880151-dmg-peg-2000',
  },
  {
    id: 'dsg-peg2000',
    name: 'DSG-PEG 2000',
    aliases: 'DSG PEG2K PEGylated',
    category: 'PEG',
    mw: 2621.41,
    average: true,
    form: 'Methoxy PEG 2000 glyceride',
    supplier: 'Avanti Research',
    product: '880152',
    source: 'https://www.avantiresearch.com/en-gb/products/product/880152-dsg-peg-2000',
  },
  {
    id: 'dspe-mpeg2000-nh4',
    name: 'DSPE-mPEG 2000 (ammonium)',
    aliases: 'DSPE PEG2000 PEG2K methoxy PEGylated',
    category: 'PEG',
    mw: 2805.497,
    average: true,
    form: 'Ammonium salt; methoxy terminus',
    supplier: 'Avanti Research',
    product: '880120',
    source: 'https://avantiresearch.com/assets/cert-analysis/880120P-1G-A-135_6283PQA135.pdf',
  },
  {
    id: 'dspe-peg2000-mal-nh4',
    name: 'DSPE-PEG 2000 maleimide (ammonium)',
    aliases: 'DSPE PEG MAL functional PEGylated',
    category: 'PEG',
    mw: 2941.6,
    average: true,
    form: 'Ammonium salt; maleimide terminus',
    supplier: 'Avanti Research',
    product: '880126',
    source: 'https://www.avantiresearch.com/en-gb/products/product/880126-dspe-peg2000-maleimide',
  },
  {
    id: 'dspe-peg2000-amine-nh4',
    name: 'DSPE-PEG 2000 amine (ammonium)',
    aliases: 'DSPE PEG NH2 functional PEGylated',
    category: 'PEG',
    mw: 2790.52,
    average: true,
    form: 'Ammonium salt; amine terminus',
    supplier: 'Avanti Research',
    product: '880128',
    source: 'https://www.avantiresearch.com/en-gb/products/product/880128-dspe-peg2000-amine',
  },
  {
    id: 'alc0159-cayman',
    name: 'ALC-0159',
    aliases: 'ALC0159 PEG2000 PEGylated',
    category: 'PEG',
    mw: 2400,
    average: true,
    form: 'Supplier nominal average: 2400 Da',
    supplier: 'Cayman Chemical',
    product: '34336',
    source: 'https://www.caymanchem.com/product/34336/alc-0159',
  },
];
// Short names for recipe titles; entries not listed use their name as is.
const shortNames = {
  mc3: 'MC3',
  cholesterol: 'Chol',
  'dotap-cl': 'DOTAP',
  'dmg-peg2000': 'DMG-PEG',
  'dsg-peg2000': 'DSG-PEG',
  'dspe-mpeg2000-nh4': 'DSPE-PEG',
  'dspe-peg2000-mal-nh4': 'DSPE-PEG-MAL',
  'dspe-peg2000-amine-nh4': 'DSPE-PEG-NH2',
};
const roleRank = { Ionizable: 0, Cationic: 0, Helper: 1, Phospholipid: 1, Sterol: 2, PEG: 3 };
// "MC3/DSPC/Chol/DMG-PEG": lipids in conventional role order, recipe order within a role.
export function recipeShorthand(lipids) {
  const rank = l => roleRank[String(l.role).replace(/ lipid$/, '')] ?? 4;
  const short = l => {
    const name = String(l.name || '').trim(),
      entry =
        lipidLibrary.find(e => e.id === l.reference?.id) ||
        lipidLibrary.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (entry) return shortNames[entry.id] || entry.name;
    return name
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/(PEG)\s*\d+/i, '$1')
      .trim()
      .replace(/\s+/g, '-');
  };
  return lipids
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => String(l.name || '').trim() && Number(l.ratio) > 0)
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map(({ l }) => short(l))
    .join('/');
}
export function searchLipids(query = '', category = 'All', custom = []) {
  const normalize = value =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const key = normalize(query);
  return [...lipidLibrary, ...custom].filter(
    l =>
      (category === 'All' || l.category === category) &&
      normalize([l.name, l.aliases, l.category, l.form, l.supplier, l.product].join(' ')).includes(
        key,
      ),
  );
}
export function libraryReference(entry) {
  return {
    id: entry.id,
    mw: entry.mw,
    source: entry.source || '',
    supplier: entry.supplier || 'Custom',
    product: entry.product || '',
    form: entry.form || '',
    average: Boolean(entry.average),
    checked: '2026-10-15',
  };
}
// The reference a built-in library entry produces in this app version, or null for unknown ids.
export function builtInReference(id) {
  const entry = lipidLibrary.find(l => l.id === id);
  return entry ? libraryReference(entry) : null;
}
export function selectLibraryLipid(row, entry) {
  const reference = libraryReference(entry);
  const { stockPrep, ...rest } = row;
  return {
    ...rest,
    name: entry.name,
    role: entry.category,
    ratio: row.ratio ?? 0,
    mw: entry.mw,
    stock: '',
    unit: 'mg/mL',
    reference,
  };
}
