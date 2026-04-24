const JSZip = require('jszip');
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

const filePath = '/Users/apple/Documents/litelab/docs/2026-3-27產品表格 (Socket-Plastic Pin Design) OK (1).xlsx';

async function test() {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const stylesXml = await zip.file('xl/styles.xml').async('string');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(stylesXml, 'application/xml');
  
  console.log('--- Cell XFs ---');
  const xfs = doc.getElementsByTagName('cellXfs')[0].getElementsByTagName('xf');
  for (let i = 0; i < Math.min(xfs.length, 20); i++) {
    const xf = xfs[i];
    const align = xf.getElementsByTagName('alignment')[0];
    console.log(`Index ${i}:`, {
      applyAlignment: xf.getAttribute('applyAlignment'),
      horizontal: align ? align.getAttribute('horizontal') : 'none'
    });
  }
}

test();
