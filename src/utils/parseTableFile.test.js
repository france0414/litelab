import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTableFile } from './parseTableFile.js';

describe('parseTableFile', () => {
  it('parses xlsx files into tables', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const file = new File([arrayBuffer], 'sample.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    file.arrayBuffer = async () => arrayBuffer;

    const result = await parseTableFile(file);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].cells).toContainEqual({ r: 0, c: 0, value: 'A' });
  });

  it('parses docx files into tables', async () => {
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
    const file = new File([buffer], 'sample.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    file.arrayBuffer = async () => buffer;

    const result = await parseTableFile(file);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].cells).toContainEqual({ r: 0, c: 0, value: 'A' });
  });

  it('rejects unsupported file types', async () => {
    const file = new File(['data'], 'sample.txt', { type: 'text/plain' });
    file.arrayBuffer = async () => new ArrayBuffer(0);

    await expect(parseTableFile(file)).rejects.toThrow('Unsupported file type');
  });

  it('rejects oversized files', async () => {
    const file = new File(['data'], 'sample.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });
    file.arrayBuffer = async () => new ArrayBuffer(0);

    await expect(parseTableFile(file)).rejects.toThrow('File too large');
  });

  it('rejects files without tables', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, {}, 'Sheet1');
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const file = new File([arrayBuffer], 'sample.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    file.arrayBuffer = async () => arrayBuffer;

    await expect(parseTableFile(file)).rejects.toThrow('No tables found');
  });
});
