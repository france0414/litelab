const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/apple/Documents/litelab/docs/2026-3-27產品表格 (Socket-Plastic Pin Design) OK (1).xlsx';

try {
  const workbook = XLSX.readFile(filePath, { cellStyles: true });
  const secondSheetName = workbook.SheetNames[1];
  const sheet = workbook.Sheets[secondSheetName];
  
  console.log('\n--- Deep Inspection: ' + secondSheetName + ' ---');
  
  const addr = 'B3'; // Let's check a specific cell that you know is centered
  const cell = sheet[addr];
  if (cell) {
    console.log(`Cell ${addr} Full Style Object:`, JSON.stringify(cell.s, null, 2));
  } else {
    console.log(`Cell ${addr} not found.`);
  }

} catch (err) {
  console.error('Error reading file:', err.message);
}
