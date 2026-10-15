import {build} from 'esbuild';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
await mkdir(new URL('./dist/vendor/',import.meta.url),{recursive:true});
await build({entryPoints:['vendor-entry.js'],bundle:true,minify:true,format:'iife',globalName:'LNPVendor',platform:'browser',outfile:'dist/vendor/lnp-vendor.js',legalComments:'eof'});
await copyFile('node_modules/qrcode/license','dist/vendor/QRCODE-LICENSE.txt');
await copyFile('node_modules/exceljs/LICENSE','dist/vendor/EXCELJS-LICENSE.txt');
await writeFile('dist/vendor/README.txt','Bundled locally: node-qrcode 1.5.4 and ExcelJS 4.4.0. No CDN or recipe upload is used. See bundled license notices.\n');
console.log('Built offline QR and Excel libraries.');
