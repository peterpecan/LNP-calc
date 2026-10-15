# LNP calculator

A browser-based lipid formulation calculator based on `240925 LNP.xlsx`. Runtime assets are bundled locally; no backend or account is required. Recipe data stays in browser storage, and JSON backups move saved recipes between devices.

Open `../LNP-calculator.html` directly in a browser for the self-contained app. All code and styles are embedded, and no internet connection or server is required. Keep a JSON backup of saved recipes, especially when moving or renaming this file, because browser storage behavior for local files varies.

For development, run `npm start` from this directory and open `http://127.0.0.1:4173`. Run calculation checks with `npm test` (Node.js 18+). Rebuild the single-file app after edits with `npm run portable`.

The default recipe preserves the worksheet's five stock concentrations in mM and reproduces all aliquots. DSPC's molecular weight is corrected to 790.145 g/mol for mass calculations, with a visible stock discrepancy note. DSPE-PEG-MAL molecular weight is deliberately blank pending the exact product specification. See Worksheet review in the app for the source audit.

All volume inputs refer to the lipid phase before aqueous mixing. Ratios are normalized, stock volumes calculated without intermediate rounding, and ethanol fills the remaining phase volume. A negative solvent balance blocks export. Mass concentration inputs require a positive molecular weight. Every output scales with batch count and preparation overage.

Features: editable lipid rows, mixed stock concentration units, optional molecular weights, batch scaling, configurable small-volume warnings, full-precision CSV, print layout, browser-local saved recipes, JSON import and backup, and automatic draft recovery.

## Lipid library and mass-based stocks

**Browse lipid library** adds a material; **Choose from library** replaces a row while retaining its molar parts. The library includes 16 supplier-referenced ionizable, helper, PEG, sterol, and cationic lipids, including MC-3, SM-102, ALC-0315, DSPC, DOPC, DOPE, cholesterol, and several PEG lipids. Selecting a material fills its molecular weight and clears the previous material's stock concentration. Enter the stock for the material actually on your bench.

Use **From mass & volume** to enter lipid mass in mg and final stock solution volume in mL. For example, 100 mg in a final volume of 4 mL gives 25 mg/mL. The app calculates the equivalent mM using the selected molecular weight and uses the mass concentration to determine aliquots. You can also enter mg/mL or mM directly; switching units preserves the physical concentration when a molecular weight is available. Direct concentration edits clear the previous preparation details.

Molecular weights remain editable for the exact product or lot. Each built-in entry links to its supplier reference and identifies the chemical form or salt. PEG molecular weights are averages. A different counterion, PEG distribution, or product specification may require an override; overrides are labeled. Library values are copied into each recipe, so later library changes cannot silently alter saved recipes.

**Add a lipid to your library** saves custom entries in this browser. Recipe JSON, QR transfers, Excel, and CSV retain the selected reference and any recorded mass/volume inputs. Unused custom library entries are browser-local. Excel exports include editable preparation inputs linked by formulas to the calculated stock concentration. In lab mode, mass/volume changes preserve the original plan and clear pipetting checks.

## Office to lab workflow

1. Plan a recipe in Calculator. **Start lab session** freezes the original plan and opens the bench view.
2. **Share to phone** generates a QR and recipe link entirely in the browser. Scanning opens a preview; accept it to replace the receiving device's working draft/session. Saved library entries remain.
3. Lab mode exposes large stock concentration controls, units, optional MW fields, live aliquots, ethanol top-up, and pipetting checkboxes. Targets and original stock values remain available for comparison. Any stock change clears pipetting checks and marks a previously prepared session as edited.
4. **Save prepared record** adds a new independent record containing both the original plan and actual values. Later edits do not modify saved records. A prepared record records your inputs; checkmarks are optional and do not prove laboratory actions occurred.
5. Export Excel, CSV, or JSON. Excel includes numeric inputs, cached full-precision results, formulas for recalculation in Excel, an original-plan tab, and a QR transfer sheet when a website address is set and the recipe fits a QR. Long recipes still export/print with an explanation if the QR is omitted. CSV also includes the original plan for active sessions. JSON exports preserve prepared sessions and can be imported on another device.

Transfers are snapshots and do not synchronize devices. A browser-local working session resumes after reload. Existing v1 recipe backups remain supported. Importing a prepared record retains both versions.

## Offline and hosting

The single-file HTML works offline without installation. The hosted multi-file app caches its assets after its first successful online visit and displays **Available offline**. A phone can use Add to Home Screen / Install where supported. Browser storage and offline caches can be cleared by the browser; keep backups. HTTPS is needed for caching on phones, except for desktop localhost development.

`npm run build` bundles vendor dependencies and creates local/portable/public outputs. `npm start` serves the local app at `/` and the generic GitHub Pages build at `/pages/`. See [HOSTING.md](HOSTING.md) for deployment instructions, phone testing, QR privacy, and transfer limits. Only upload the generated `github-pages` folder or its extracted ZIP; local source contains the original worksheet default.

Source workbook is unchanged. No workbook, credentials, or personal filesystem paths are shipped with the app.

## Visual design

The shared Field notebook theme in `dist/workspace.css` follows the supplied OligoTools principles: warm neutral surfaces, token-based colours, neutral selection, a 53px horizontal header, a centred 1440px working frame, system serif page titles, and 36px desktop controls. Reading views have a 240px contents column and a 760px text column. Scientific composition swatches always appear with lipid labels. Status colours support written labels. No external fonts, decorative shadows, gradients, or glows are used.

`npm test` checks palette token completeness and AA text contrast alongside the calculation/export checks. Rebuild with `npm run build` after changing assets, then check desktop, wide-screen, and phone layouts.
