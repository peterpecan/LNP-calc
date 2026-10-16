// Supplier formula weights, checked 2026-10-15; entries carrying their own `checked` date
// were added later. PEG values are averages.
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
    id: '5a2-sc8',
    name: '5A2-SC8',
    aliases: '5A2SC8 dendrimer lipidoid SORT',
    category: 'Ionizable',
    mw: 1841.715,
    form: 'Free base; CAS 1857341-90-2',
    supplier: 'TargetMol',
    product: 'T74450',
    checked: '2026-10-16',
    source: 'https://www.targetmol.com/compound/5a2-sc8',
  },
  {
    id: 'c12-200',
    name: 'C12-200',
    aliases: 'C12200 lipidoid SORT',
    category: 'Ionizable',
    mw: 1136.9,
    form: 'Free base; weight from the listed formula C70H145N5O5',
    supplier: 'Cayman Chemical',
    product: '36699',
    checked: '2026-10-16',
    source: 'https://www.caymanchem.com/product/36699/c12-200',
  },
  {
    id: 'dodap',
    name: 'DODAP',
    aliases: '18:1 DAP SORT',
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
    aliases: '18:0 PC distearoyl phosphatidylcholine SORT',
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
    aliases: '18:1 PE dioleoyl phosphatidylethanolamine SORT',
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
    id: 'docpe',
    name: 'DOCPe',
    aliases: 'inverted headgroup zwitterionic SORT',
    category: 'Helper',
    mw: 800.14,
    form: 'Zwitterionic; inverted headgroup',
    supplier: 'Avanti Research',
    product: '850312',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/850312-docpe',
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
    aliases: 'DOTAP 18:1 TAP SORT',
    category: 'Cationic',
    mw: 698.542,
    form: 'Chloride salt; includes counterion',
    supplier: 'Avanti Research',
    product: '890890',
    source: 'https://www.avantiresearch.com/en-gb/products/product/890890-181-tap-dotap',
  },
  {
    id: 'ddab-br',
    name: 'DDAB (bromide)',
    aliases: '18:0 DDAB dimethyldioctadecylammonium SORT',
    category: 'Cationic',
    mw: 630.952,
    form: 'Bromide salt; includes counterion',
    supplier: 'Avanti Research',
    product: '890810',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/890810-180-ddab',
  },
  {
    id: 'epc14-cl',
    name: '14:0 EPC (chloride)',
    aliases: 'EPC ethylphosphocholine dimyristoyl SORT',
    category: 'Cationic',
    mw: 742.447,
    form: 'Chloride salt; includes counterion',
    supplier: 'Avanti Research',
    product: '890701',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/890701-140-epc-cl-salt',
  },
  {
    id: '18pa-na',
    name: '18:1 PA / DOPA (sodium)',
    aliases: '18PA DOPA dioleoyl phosphatidic acid phosphate SORT',
    category: 'Anionic',
    mw: 722.948,
    form: 'Sodium salt; includes counterion',
    supplier: 'Avanti Research',
    product: '840875',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/840875-181-pa',
  },
  {
    id: '14pa-na',
    name: '14:0 PA / DMPA (sodium)',
    aliases: '14PA DMPA dimyristoyl phosphatidic acid phosphate SORT',
    category: 'Anionic',
    mw: 614.767,
    form: 'Sodium salt; includes counterion',
    supplier: 'Avanti Research',
    product: '830845',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/830845-140-pa',
  },
  {
    id: '18bmp-sr-nh4',
    name: '18:1 Hemi BMP (S,R) (ammonium)',
    aliases: '18BMP bis monooleoylglycero phosphate hemi BMP SORT',
    category: 'Anionic',
    mw: 1056.52,
    form: 'Ammonium salt; (S,R) isomer',
    supplier: 'Avanti Research',
    product: '857134',
    checked: '2026-10-16',
    source: 'https://www.avantiresearch.com/en-gb/products/product/857134-181-hemi-bmp-sr',
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
// Starting compositions offered by "Start from". Ratios are molar parts.
export const recipeTemplates = [
  {
    id: 'mc3',
    label: 'MC3 standard',
    ratio: '50 : 10 : 38 : 2',
    lipids: [
      ['mc3', 50],
      ['dspc', 10],
      ['cholesterol', 38],
      ['dmg-peg2000', 2],
    ],
  },
  {
    id: 'mc3-mal',
    label: 'MC3 + maleimide',
    ratio: '50 : 10 : 38 : 1.95 : 0.05',
    lipids: [
      ['mc3', 50],
      ['dspc', 10],
      ['cholesterol', 38],
      ['dmg-peg2000', 1.95],
      ['dspe-peg2000-mal-nh4', 0.05],
    ],
  },
  {
    id: 'sm102',
    label: 'SM-102 standard',
    ratio: '50 : 10 : 38.5 : 1.5',
    lipids: [
      ['sm102', 50],
      ['dspc', 10],
      ['cholesterol', 38.5],
      ['dmg-peg2000', 1.5],
    ],
  },
  {
    id: 'alc0315',
    label: 'ALC-0315 standard',
    ratio: '46.3 : 9.4 : 42.7 : 1.6',
    lipids: [
      ['alc0315', 46.3],
      ['dspc', 9.4],
      ['cholesterol', 42.7],
      ['alc0159-cayman', 1.6],
    ],
  },
  // Selective ORgan Targeting, Cheng et al., Nat. Nanotechnol. 15:313-320 (2020).
  // A fifth "SORT lipid" is added at Y mol% of total lipids on top of the base
  // 5A2-SC8/DOPE/cholesterol/DMG-PEG2000 = 15/15/30/3 (Methods, "Nanoparticle formation";
  // "Y means the molar percent of DOTAP in total lipids"). The base sums to 63 parts, so
  // each base part is scaled by (100 - Y)/63 and the SORT lipid enters as Y.
  // The paper prints the liver ratio in full as 19.05/19.05/38.1/3.81/20 (Methods),
  // which is this scaling at Y = 20 and fixes the convention for the other two.
  {
    // Y = 50: 15 x 50/63 = 11.90, 30 x 50/63 = 23.81, 3 x 50/63 = 2.38.
    // "50% was optimal for lung delivery" (Results, Fig. 1c).
    id: 'sort-lung',
    label: 'SORT lung (50% DOTAP)',
    ratio: '11.9 : 11.9 : 23.81 : 2.38 : 50',
    lipids: [
      ['5a2-sc8', 11.9],
      ['dope', 11.9],
      ['cholesterol', 23.81],
      ['dmg-peg2000', 2.38],
      ['dotap-cl', 50],
    ],
  },
  {
    // Y = 30: 15 x 70/63 = 16.67, 30 x 70/63 = 33.33, 3 x 70/63 = 3.33.
    // "Spleen SORT LNPs (30% 18-PA)" (Fig. 3c legend; Methods).
    id: 'sort-spleen',
    label: 'SORT spleen (30% 18PA)',
    ratio: '16.67 : 16.67 : 33.33 : 3.33 : 30',
    lipids: [
      ['5a2-sc8', 16.67],
      ['dope', 16.67],
      ['cholesterol', 33.33],
      ['dmg-peg2000', 3.33],
      ['18pa-na', 30],
    ],
  },
  {
    // Y = 20, printed in the Methods as 19.05/19.05/38.1/3.81/20.
    id: 'sort-liver',
    label: 'SORT liver (20% DODAP)',
    ratio: '19.05 : 19.05 : 38.1 : 3.81 : 20',
    lipids: [
      ['5a2-sc8', 19.05],
      ['dope', 19.05],
      ['cholesterol', 38.1],
      ['dmg-peg2000', 3.81],
      ['dodap', 20],
    ],
  },
];
// Which lipids at which molar parts, ignoring row order, stock concentrations and MW edits:
// filling in a stock does not change which formulation a composition is.
const compositionKey = lipids =>
  lipids
    .map(l => {
      const name = String(l.name || '').trim();
      return `${l.reference?.id || name.toLowerCase()}:${Number(l.ratio) || 0}`;
    })
    .sort()
    .join('|');
// The template a composition still matches exactly, for naming a recipe after its formulation.
// A changed lipid or molar part drops the match, since the label names those parts.
export function templateLabel(lipids) {
  if (!lipids.some(l => String(l.name || '').trim() && Number(l.ratio) > 0)) return '';
  const key = compositionKey(lipids);
  return recipeTemplates.find(t => compositionKey(templateLipids(t)) === key)?.label || '';
}
export const slotRoles = ['Ionizable', 'Helper', 'Sterol', 'PEG'];
// One empty row per lipid type; the role picks which library entries the name field suggests.
export function blankSlots() {
  return slotRoles.map(role => ({ name: '', role, ratio: '', stock: '', unit: 'mg/mL', mw: '' }));
}
export function templateLipids(template) {
  return template.lipids.map(([id, ratio]) =>
    selectLibraryLipid(
      { ratio },
      lipidLibrary.find(l => l.id === id),
    ),
  );
}
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
  'ddab-br': 'DDAB',
  'epc14-cl': 'EPC',
  '18pa-na': '18PA',
  '14pa-na': '14PA',
  '18bmp-sr-nh4': '18BMP',
};
// Anionic SORT lipids sit at the default rank, so they trail the four base components.
const roleRank = {
  Ionizable: 0,
  Cationic: 0,
  Helper: 1,
  Phospholipid: 1,
  Sterol: 2,
  PEG: 3,
  Anionic: 4,
};
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
    checked: entry.checked || '2026-10-15',
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
