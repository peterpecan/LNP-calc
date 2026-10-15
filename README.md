# LNP calculator

A browser-based calculator for lipid nanoparticle formulations, with a supplier-referenced lipid library, mass-based stock inputs, an adjustable lab session, QR handoff, Excel/CSV export, and offline use.

Download the standalone **LNP-calculator.html** from the latest Pages workflow run (artifact `LNP-calculator-standalone`), build it locally with `npm run build`, or run the local preview:

```powershell
cd lnp-studio
npm ci
npm start
```

Open http://127.0.0.1:4173/ in your browser. The preview also serves the generic deployment build at `/pages/`.

## Development

App source is in `lnp-studio/src/`; build scripts and tests are in `lnp-studio/`. `npm start` serves `src/` live. Run `npm run build` to generate `lnp-studio/dist/`, the standalone `LNP-calculator.html` and the `github-pages/` deployment output, then `npm test` to check calculations, transfer, exports, and palette contrast. All three outputs are build artifacts and are not committed.

The local source and standalone file include the original worksheet starter formulation. The generated `github-pages/` app contains generic example inputs. Browser drafts, saved recipes, and sessions are stored on the device and are not part of this repository. Dependencies, build output, test output, and local hosting configuration are excluded from Git.

See [app documentation](lnp-studio/README.md) and [hosting instructions](lnp-studio/HOSTING.md). The root Pages workflow builds and tests the app, then publishes only the generic `github-pages/` output. Pushes to `main` redeploy the site once GitHub Pages is enabled for this repository.
