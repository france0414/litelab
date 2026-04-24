const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/apple/Documents/litelab/docs/2026-3-27產品表格 (Socket-Plastic Pin Design) OK (1).xlsx';

try {
  const workbook = XLSX.readFile(filePath, { cellStyles: true });
  const sheetNames = workbook.SheetNames;
  
  console.log('Sheet Names:', sheetNames);
  
  if (sheetNames.length < 2) {
    console.log('Error: Only found ' + sheetNames.length + ' sheets.');
    process.exit(1);
  }

  const secondSheetName = sheetNames[1];
  const sheet = workbook.Sheets[secondSheetName];
  
  console.log('\n--- Inspecting Second Sheet: ' + secondSheetName + ' ---');
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // Check the first few rows/cols for styles
  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 10); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (cell) {
        console.log(`Cell ${addr}:`, {
          v: cell.v,
          t: cell.t,
          s: cell.s ? 'Has Style' : 'No Style',
          alignment: cell.s?.alignment || 'No Alignment'
        });
      }
    }
  }
} catch (err) {
  console.error('Error reading file:', err.message);
}
