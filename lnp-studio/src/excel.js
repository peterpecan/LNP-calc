import { calculate } from './calculator.js';

export function buildWorkbook(ExcelJS, recipe, session = null, share = null) {
  const current = calculate(recipe);
  if (current.errors.length) throw new Error('Correct the inputs before exporting.');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LNP calculator';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  function sheet(name, inputs, caption) {
    const r = calculate(inputs),
      ws = workbook.addWorksheet(name, {
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        },
        views: [{ state: 'frozen', ySplit: 11 }],
      });
    ws.columns = [
      { width: 24 },
      { width: 15 },
      { width: 16 },
      { width: 14 },
      { width: 17 },
      { width: 13 },
      { width: 17 },
      { width: 19 },
      { width: 18 },
      { width: 20 },
    ];
    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = inputs.name;
    ws.getCell('A1').font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF194F42' } };
    ws.getRow(1).height = 32;
    ws.mergeCells('A2:J2');
    ws.getCell('A2').value = caption;
    ws.getCell('A2').font = { size: 11, color: { argb: 'FF647264' } };
    const cells = {
      A4: 'Volume / batch (µL)',
      B4: Number(inputs.volume),
      C4: 'Total lipid (mM)',
      D4: Number(inputs.concentration),
      A5: 'Batches',
      B5: Number(inputs.batches),
      C5: 'Overage (%)',
      D5: Number(inputs.excess),
      A6: 'Prepared volume (µL)',
      B6: { formula: 'B4*B5*(1+D5/100)', result: r.totalVolume },
      C6: 'Total lipid (nmol)',
      D6: { formula: 'B6*D4', result: r.totalNmol },
      A8: 'Session reference',
      B8: session ? session.id : 'Recipe export',
      A9: 'Total molar parts',
      B9: { formula: `SUM(B12:B${11 + r.rows.length})`, result: r.sum },
    };
    for (const [address, value] of Object.entries(cells)) ws.getCell(address).value = value;
    ws.getRow(11).values = [
      'Lipid',
      'Molar parts',
      'Stock input',
      'Stock unit',
      'MW (g/mol)',
      'Molar %',
      'Stock (mM)',
      'Lipid (nmol)',
      'Mass (µg)',
      'Stock volume (µL)',
    ];
    for (let i = 0; i < r.rows.length; i++) {
      const n = 12 + i,
        l = r.rows[i];
      ws.getRow(n).values = [
        l.name,
        Number(l.ratio),
        l.stock === '' ? null : Number(l.stock),
        l.unit,
        l.mw === '' ? null : Number(l.mw),
        { formula: `B${n}/$B$9*100`, result: l.fraction * 100 },
        {
          formula: `IF(D${n}="mM",C${n},IF(AND(ISNUMBER(E${n}),E${n}>0),C${n}*1000/E${n},"MW required"))`,
          result: Number.isFinite(l.stockMM) ? l.stockMM : '',
        },
        { formula: `$D$6*B${n}/$B$9`, result: l.nmol },
        {
          formula: `IF(B${n}=0,0,IF(AND(ISNUMBER(E${n}),E${n}>0),H${n}*E${n}/1000,""))`,
          result: l.massUg ?? '',
        },
        {
          formula: `IF(B${n}=0,0,IF(AND(ISNUMBER(G${n}),G${n}>0),H${n}/G${n},"Check stock"))`,
          result: l.volume,
        },
      ];
      for (const c of ['B', 'C', 'E']) {
        ws.getCell(c + n).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5E9' },
        };
        ws.getCell(c + n).font = { color: { argb: 'FF194F42' } };
      }
      ws.getCell('D' + n).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"mM,mg/mL"'],
        showErrorMessage: true,
        error: 'Choose mM or mg/mL.',
      };
      ws.getCell('B' + n).dataValidation = {
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        formulae: [0],
        showErrorMessage: true,
      };
      ws.getCell('C' + n).dataValidation = {
        type: 'decimal',
        operator: 'greaterThan',
        formulae: [0],
        allowBlank: true,
        showErrorMessage: true,
      };
      ws.getCell('E' + n).dataValidation = {
        type: 'decimal',
        operator: 'greaterThan',
        formulae: [0],
        allowBlank: true,
        showErrorMessage: true,
      };
    }
    const end = 11 + r.rows.length,
      stocks = end + 2,
      ethanol = end + 3,
      total = end + 4,
      status = end + 6;
    ws.getCell('A' + stocks).value = 'Lipid stocks';
    ws.getCell('J' + stocks).value = { formula: `SUM(J12:J${end})`, result: r.stockVolume };
    ws.getCell('A' + ethanol).value = 'Ethanol top-up';
    ws.getCell('J' + ethanol).value = { formula: `$B$6-J${stocks}`, result: r.ethanol };
    ws.getCell('A' + total).value = 'Total volume';
    ws.getCell('J' + total).value = { formula: `J${stocks}+J${ethanol}`, result: r.totalVolume };
    ws.mergeCells(`A${status}:J${status}`);
    ws.getCell('A' + status).value = {
      formula: `IF(COUNT(J12:J${end})<ROWS(J12:J${end}),"Check stock inputs",IF(J${ethanol}<0,"Stocks exceed phase volume","Calculated"))`,
      result: 'Calculated',
    };
    ws.addConditionalFormatting({
      ref: `J${ethanol}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'lessThan',
          formulae: ['0'],
          style: {
            font: { color: { argb: 'FFAD3E2C' } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE6DE' } },
          },
        },
      ],
    });
    let row = status + 2;
    const preparations = r.rows.map((l, i) => ({ l, i })).filter(({ l }) => l.stockPrep);
    if (preparations.length) {
      ws.mergeCells(`A${row}:J${row}`);
      ws.getCell('A' + row).value = 'Stock preparation inputs';
      ws.getCell('A' + row).font = { bold: true, color: { argb: 'FF194F42' } };
      row++;
      ws.getRow(row).values = ['Lipid', 'Mass (mg)', 'Final volume (mL)', 'Stock (mg/mL)'];
      ws.getRow(row).height = 30;
      ws.getRow(row).alignment = { wrapText: true };
      row++;
      for (const { l, i } of preparations) {
        const n = 12 + i,
          p = row;
        ws.getRow(p).values = [
          l.name,
          l.stockPrep.massMg,
          l.stockPrep.volumeMl,
          {
            formula: `IF(AND(ISNUMBER(B${p}),B${p}>0,ISNUMBER(C${p}),C${p}>0),B${p}/C${p},"Check stock preparation")`,
            result: l.stockPrep.massMg / l.stockPrep.volumeMl,
          },
        ];
        ws.getCell('C' + n).value = {
          formula: `IF(ISNUMBER(D${p}),IF(D${n}="mg/mL",D${p},IF(AND(ISNUMBER(E${n}),E${n}>0),D${p}*1000/E${n},"MW required")),"Check stock preparation")`,
          result: Number(l.stock),
        };
        ws.getCell('C' + n).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FBF6' },
        };
        for (const key of ['B', 'C']) {
          ws.getCell(key + p).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5E9' },
          };
          ws.getCell(key + p).dataValidation = {
            type: 'decimal',
            operator: 'greaterThan',
            formulae: [0],
            showErrorMessage: true,
          };
        }
        row++;
      }
      ws.mergeCells(`A${row}:J${row}`);
      ws.getCell('A' + row).value =
        'For prepared stocks, edit mass and final solution volume here; Stock input above is calculated from these cells. To use a direct concentration, replace its Stock input formula with a number.';
      ws.getCell('A' + row).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(row).height = 32;
      row += 2;
    }
    for (const l of r.rows.filter(l => l.reference)) {
      const ref = l.reference,
        text = `${l.name}: MW used ${l.mw} g/mol. ${ref.average ? 'Supplier average. ' : ''}Reference ${ref.mw} g/mol; ${ref.supplier} ${ref.product}. ${ref.form || ''} ${ref.source || ''}`;
      ws.mergeCells(`A${row}:J${row}`);
      ws.getCell('A' + row).value = text;
      ws.getCell('A' + row).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(row).height = Math.max(32, Math.ceil(text.length / 130) * 16);
      row++;
    }
    for (const note of [
      inputs.notes || '',
      ...r.warnings,
      'All volumes refer to the lipid phase before aqueous mixing. Stock volumes are additive; make up with ethanol.',
      'Green cells are editable inputs. Formula results retain full precision; displayed values are rounded.',
    ]) {
      if (!note) continue;
      ws.mergeCells(`A${row}:J${row}`);
      ws.getCell('A' + row).value = note;
      ws.getCell('A' + row).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(row).height = Math.max(30, Math.ceil(note.length / 140) * 16);
      row++;
    }
    ws.eachRow((row, n) => {
      row.eachCell(cell => {
        if (n !== 1) cell.font = { name: 'Calibri', size: 11, ...cell.font };
        if (typeof cell.value === 'number' || cell.value?.formula) {
          cell.numFmt = '0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
      if (n >= 11 && n <= end) {
        row.height = 25;
        row.eachCell(cell => {
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFE1E8DD' } } };
        });
      }
    });
    ws.getRow(11).height = 34;
    ws.getRow(11).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF194F42' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    for (const cell of ['B4', 'D4', 'B5', 'D5']) {
      ws.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5E9' } };
    }
    ws.pageSetup.printTitlesRow = '1:11';
    ws.pageSetup.printArea = `A1:J${row}`;
    ws.headerFooter.oddFooter = '&LLNP calculator&C' + name + '&R&P of &N';
    return ws;
  }
  sheet(
    session ? 'Lab preparation' : 'Recipe',
    recipe,
    session?.preparedAt
      ? `Prepared record · ${session.preparedAt}`
      : session
        ? 'Current lab values · stock inputs may differ from plan'
        : 'Formulation inputs and calculated amounts',
  );
  if (session) sheet('Original plan', session.plan, `Original plan · ${session.plannedAt}`);
  if (share?.url && share?.png) {
    const ws = workbook.addWorksheet('Phone transfer', {
      pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });
    ws.columns = [{ width: 42.14 }, { width: 65 }];
    ws.getCell('A1').value = 'Open this recipe on your phone';
    ws.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF194F42' } };
    ws.mergeCells('A1:B1');
    const id = workbook.addImage({ base64: share.png, extension: 'png' });
    ws.addImage(id, { tl: { col: 0, row: 2 }, br: { col: 1, row: 17 }, editAs: 'oneCell' });
    ws.getCell('A20').value = 'Session';
    ws.getCell('B20').value = session?.id || '';
    ws.getCell('A21').value = 'Recipe link';
    ws.getCell('B21').value = { text: share.url, hyperlink: share.url };
    ws.getCell('B21').alignment = { wrapText: true };
    ws.getRow(21).height = 65;
    ws.mergeCells('A23:B24');
    ws.getCell('A23').value =
      'Scanning opens a copy of these inputs. Phone edits stay on that device. Anyone with the QR or link can read the recipe. If the host is localhost, replace it with a reachable hosted or LAN address.';
    ws.getCell('A23').alignment = { wrapText: true, vertical: 'top' };
    ws.pageSetup.printArea = 'A1:B25';
  }
  return workbook;
}
