import { describe, expect, it } from 'vitest';
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import * as XLSX from 'xlsx';
import { parseDocxArrayBuffer, parseHtmlTable, parseXlsxArrayBuffer } from './tableParser.js';

describe('tableParser', () => {
  it('parses xlsx array buffer into table model', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['A', 'B'],
      ['C', 'D'],
    ]);

    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const result = parseXlsxArrayBuffer(arrayBuffer);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].merges).toEqual([{ r: 0, c: 0, rowspan: 2, colspan: 2 }]);
    expect(result.tables[0].cells).toContainEqual({ r: 0, c: 0, value: 'A' });
  });

  it('parses HTML table into merge-aware model', () => {
    const html = `
      <table>
        <tr><td>A</td><td>B</td></tr>
        <tr><td colspan="2">C</td></tr>
      </table>
    `;

    const table = parseHtmlTable(html);

    expect(table.merges).toEqual([{ r: 1, c: 0, rowspan: 1, colspan: 2 }]);
    expect(table.cells).toContainEqual(expect.objectContaining({ r: 0, c: 0, value: 'A' }));
    expect(table.cells).toContainEqual(expect.objectContaining({ r: 1, c: 0, value: 'C' }));
  });

  it('parses docx array buffer into table model', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('A')] }),
                    new TableCell({ children: [new Paragraph('B')] }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const result = await parseDocxArrayBuffer(buffer);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].cells).toContainEqual(expect.objectContaining({ r: 0, c: 0, value: 'A' }));
    expect(result.tables[0].cells).toContainEqual(expect.objectContaining({ r: 0, c: 1, value: 'B' }));
  });
});
