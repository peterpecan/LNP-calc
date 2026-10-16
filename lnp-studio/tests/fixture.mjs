// Made-up formulation with round numbers: 10 000 nmol total, one lipid below the 0.5 µL threshold.
export const fixtureRecipe = {
  name: 'Test formulation',
  volume: 1000,
  concentration: 10,
  batches: 1,
  excess: 0,
  minimum: 0.5,
  notes: '',
  lipids: [
    { name: 'Ionizable lipid', role: 'Ionizable', ratio: 50, stock: 50, unit: 'mM', mw: 650 },
    { name: 'DSPC', role: 'Helper', ratio: 10, stock: 10, unit: 'mM', mw: 790.145 },
    { name: 'Cholesterol', role: 'Sterol', ratio: 38, stock: 20, unit: 'mM', mw: 386.65 },
    { name: 'PEG lipid', role: 'PEG', ratio: 1.99, stock: 5, unit: 'mM', mw: 2500 },
    { name: 'Functional lipid', role: 'Custom', ratio: 0.01, stock: 4, unit: 'mM', mw: '' },
  ],
};
