# GitHub Pages deployment

The folder `../github-pages/` is the deployment output. Its contents are also packaged in `../LNP-calculator-GitHub-Pages.zip`. It includes generic illustrative inputs, static assets, a service worker, installable-app metadata, and a GitHub Actions workflow. The user's Excel file, worksheet review, local default formulation, browser storage, and development source files are excluded.

1. Create or select a GitHub repository.
2. Upload the **contents** of the `github-pages` folder to the repository root. Include `.nojekyll` and `.github/workflows/pages.yml` when using Actions. Extract the ZIP first; uploading the ZIP alone does not deploy the app.
3. In repository Settings → Pages, select **GitHub Actions** as the source. The included workflow deploys pushes to `main`. If your default branch has another name, update `branches: [main]` in the workflow. Alternatively publish directly from the root of your default branch.
4. Once the deployment succeeds, open the generated HTTPS site URL on the office computer. In **Share to phone**, verify that the calculator website address is that hosted URL, including the repository path. Generate the QR again if you previously generated one on localhost.
5. Open the site once on the phone and wait for **Available offline**. Use the browser's Add to Home Screen / Install option if desired. Keep a JSON backup of saved recipes and records; browser storage and caches can be cleared.

The source repository has a root-level `.github/workflows/pages.yml` workflow. It installs locked dependencies, rebuilds the app, runs the checks, and uploads only `github-pages/`. Select **GitHub Actions** as the repository's Pages publishing source. Pushes to `main` then redeploy automatically. The workflow inside the generated folder is a standalone alternative for a separate deployment repository. Do not deploy the source repository root: the local source and standalone file include the worksheet starter formulation.

## QR and privacy

QR generation and recipe compression run in the browser. The recipe is encoded in the URL fragment, after `#transfer=`. It is not sent in the HTTP request for the calculator. The QR/link is readable by anyone holding it; it is not encrypted. Avoid analytics or third-party scripts that could read fragments. The supplied app has none.

The initial transfer preserves the original plan and current stock inputs. Importing a QR transfer asks before replacing the current draft/session. Existing saved recipes and prepared records remain. Checkmarks stay on the current device. Phone edits do not synchronize back to the office computer. To bring changes back, generate a new QR/link, export the prepared record as JSON, or export Excel/CSV.

## Phone tests before hosting

`127.0.0.1` and `localhost` always refer to the device opening the link. A QR pointing there cannot reach the office computer from a phone.

For a same-network test, stop the default server and run `node preview-server.mjs --lan`, then use the computer's LAN IPv4 address with port 4173 in the QR address field. The computer and phone must share a network that permits device-to-device communication, and the local firewall must allow that server. LAN HTTP does not provide installable offline caching; use the HTTPS Pages site for that workflow. The normal preview stays bound to loopback and does not enable LAN access automatically.

## Development

Run `npm ci` (Node.js 18+), `npm run build`, and `npm test` from `lnp-studio`. Run `python package-pages.py` to refresh the deployment ZIP. `npm start` serves the local worksheet-based calculator at `/`, the standalone file at `/portable`, and the generic deployment build at `/pages/` to exercise a repository subpath.

The project locks its browser dependencies and bundles them locally. The uuid override fixes a transitive advisory while retaining the Excel library's required API. Re-run build and tests after dependency changes.
