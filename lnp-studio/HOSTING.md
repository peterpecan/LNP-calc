# GitHub Pages deployment

The root workflow `.github/workflows/pages.yml` installs locked dependencies, rebuilds the app, runs the checks, and deploys only the generated `github-pages/` folder. That folder contains the app, static assets, a service worker and installable-app metadata. Browser storage and development source files are excluded. Each run also uploads the standalone `LNP-calculator.html` as the `LNP-calculator-standalone` artifact.

1. In repository Settings → Pages, select **GitHub Actions** as the source. Pushes to `main` then build, test and redeploy automatically.
2. Once the deployment succeeds, open the generated HTTPS site URL on the office computer. In **Settings** (gear icon), set the calculator website address to the hosted URL, including the repository path. Generate the QR again if you previously generated one on localhost.
3. Open the site once on the phone and wait for **Available offline**. Use the browser's Add to Home Screen / Install option if desired. Keep a JSON backup of saved recipes and records; browser storage and caches can be cleared.


## QR and privacy

QR generation and recipe compression run in the browser. The recipe is encoded in the URL fragment, after `#t=` (older links use `#transfer=` and still open). The QR stores the recipe in upper-case QR alphanumeric characters, which need fewer modules than the link text; both forms decode to the same session. It is not sent in the HTTP request for the calculator. The QR/link is readable by anyone holding it; it is not encrypted. Avoid analytics or third-party scripts that could read fragments. The supplied app has none.

The initial transfer preserves the original plan and current stock inputs. Built-in library lipids travel as a short ID with a checksum and are rebuilt from the receiving app's library, so both devices need the same app version; a mismatch is refused with an explanation. Importing a QR transfer asks before replacing the current draft/session. Existing saved recipes and prepared records remain. Checkmarks stay on the current device. Phone edits do not synchronize back to the office computer. To bring changes back, use **Send…** to pass the link through the phone's share menu, generate a new QR/link, export the prepared record as JSON, or export Excel/CSV.

## Phone tests before hosting

`127.0.0.1` and `localhost` always refer to the device opening the link. A QR pointing there cannot reach the office computer from a phone.

For a same-network test, stop the default server and run `node preview-server.mjs --lan`, then use the computer's LAN IPv4 address with port 4173 as the website address in Settings. The computer and phone must share a network that permits device-to-device communication, and the local firewall must allow that server. LAN HTTP does not provide installable offline caching; use the HTTPS Pages site for that workflow. The normal preview stays bound to loopback and does not enable LAN access automatically.

## Development

Run `npm ci` (Node.js 18+), `npm run build`, and `npm test` from `lnp-studio`. `npm start` serves the calculator from `src/` at `/`, the standalone file at `/portable`, and the generic deployment build at `/pages/` to exercise a repository subpath.

The project locks its browser dependencies and bundles them locally. The uuid override fixes a transitive advisory while retaining the Excel library's required API. Re-run build and tests after dependency changes.
