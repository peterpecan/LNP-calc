# GitHub Pages deployment

The root workflow `.github/workflows/pages.yml` installs locked dependencies, rebuilds the app, runs the checks, and deploys only the generated `github-pages/` folder. That folder contains generic illustrative inputs, static assets, a service worker and installable-app metadata. The worksheet review, local default formulation, browser storage, and development source files are excluded. Each run also uploads the standalone `LNP-calculator.html` as the `LNP-calculator-standalone` artifact.

1. In repository Settings → Pages, select **GitHub Actions** as the source. Pushes to `main` then build, test and redeploy automatically.
2. Once the deployment succeeds, open the generated HTTPS site URL on the office computer. In **Share / export → Send to phone (QR)**, verify that the calculator website address is that hosted URL, including the repository path. Generate the QR again if you previously generated one on localhost.
3. Open the site once on the phone and wait for **Available offline**. Use the browser's Add to Home Screen / Install option if desired. Keep a JSON backup of saved recipes and records; browser storage and caches can be cleared.

