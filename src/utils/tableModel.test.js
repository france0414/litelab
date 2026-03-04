import { describe, expect, it } from 'vitest';
import { mergeCells, splitCell, toCsv, toHtml, toJson, toMatrix, updateCell } from './tableModel.js';

describe('tableModel', () => {
  it('expands merged cells into a rectangular matrix', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }],
      meta: { sourceType: 'xlsx', sheetName: 'Sheet1', tableIndex: 0 },
    };

    const matrix = toMatrix(table);

    expect(matrix).toEqual([
      ['A', ''],
      ['', ''],
    ]);
  });

  it('outputs CSV with merged cells blanked except top-left', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }],
      meta: { sourceType: 'xlsx', sheetName: 'Sheet1', tableIndex: 0 },
    };

    expect(toCsv(table)).toBe('A,\n,');
  });

  it('exports JSON with matrix, merges, and meta', () => {
    const table = {
      cells: [{ r: 0, c: 0, value: 'A' }],
      merges: [{ r: 0, c: 0, rowspan: 1, colspan: 1 }],
      meta: { sourceType: 'xlsx', sheetName: 'Sheet1', tableIndex: 0 },
    };

    expect(toJson(table)).toEqual({
      matrix: [['A']],
      merges: [{ r: 0, c: 0, rowspan: 1, colspan: 1 }],
      meta: { sourceType: 'xlsx', sheetName: 'Sheet1', tableIndex: 0 },
    });
  });

  it('exports HTML with rowspan and colspan', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }],
      meta: { sourceType: 'xlsx', sheetName: 'Sheet1', tableIndex: 0 },
    };

    expect(toHtml(table)).toBe(
      '<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature" data-tablefeature-template="flexible_content"><table class="table"><tbody><tr><td rowspan="2" colspan="2">A</td></tr><tr></tr></tbody></table></div>',
    );
  });

  it('merges a selected range into a single merge entry', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [],
      meta: {},
    };

    const result = mergeCells(table, { r1: 0, c1: 0, r2: 1, c2: 1 });

    expect(result.merges).toEqual([{ r: 0, c: 0, rowspan: 2, colspan: 2 }]);
  });

  it('splits a merged cell back into separate cells', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }],
      meta: {},
    };

    const result = splitCell(table, { r: 0, c: 0 });

    expect(result.merges).toEqual([]);
  });

  it('updates a cell value by coordinates', () => {
    const table = {
      cells: [{ r: 0, c: 0, value: 'A' }],
      merges: [],
      meta: {},
    };

    const result = updateCell(table, { r: 0, c: 0, value: 'Z' });

    expect(result.cells).toContainEqual({ r: 0, c: 0, value: 'Z' });
  });
});
