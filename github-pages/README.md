# LNP calculator

Static formulation calculator with a supplier-referenced lipid library, mass/volume stock preparation, QR handoff, lab stock adjustment, Excel/CSV export, and offline caching.

Choose a lipid to fill its molecular weight, then enter a stock in mg/mL or mM, or use From mass & volume. Use final solution volume: 100 mg / 4 mL = 25 mg/mL. Check the listed chemical form and supplier; PEG weights are averages and molecular weights remain editable for your product or lot. Custom library entries stay in this browser; selected references and preparation inputs travel with recipes and exports.

Upload the contents of this directory to a GitHub repository. In Settings → Pages, choose GitHub Actions. The included workflow deploys pushes to main. You can also publish directly from the main branch root. All asset paths are relative, so repository project sites work.

Only generic example inputs are bundled. Recipe inputs stay in browser storage or QR links. Anyone holding a recipe QR/link can read it. No account, backend, analytics, or external QR service is used. Browser storage is device-specific; export JSON backups. Offline mode needs an initial successful online visit and cached assets. Storage may be cleared by the browser.
