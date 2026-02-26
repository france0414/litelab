const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const getBounds = (table) => {
  let maxRow = 0;
  let maxCol = 0;

  for (const cell of table.cells || []) {
    maxRow = Math.max(maxRow, cell.r);
    maxCol = Math.max(maxCol, cell.c);
  }

  for (const merge of table.merges || []) {
    maxRow = Math.max(maxRow, merge.r + merge.rowspan - 1);
    maxCol = Math.max(maxCol, merge.c + merge.colspan - 1);
  }

  return { rows: maxRow + 1, cols: maxCol + 1 };
};

const getRenderGrid = (table) => {
  const { rows, cols } = getBounds(table);
  const mergeMap = new Map();
  const covered = new Set();

  (table.merges || []).forEach((merge) => {
    mergeMap.set(`${merge.r}:${merge.c}`, merge);

    for (let r = merge.r; r < merge.r + merge.rowspan; r += 1) {
      for (let c = merge.c; c < merge.c + merge.colspan; c += 1) {
        if (r === merge.r && c === merge.c) {
          continue;
        }

        covered.add(`${r}:${c}`);
      }
    }
  });

  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (covered.has(`${r}:${c}`)) {
        continue;
      }

      const merge = mergeMap.get(`${r}:${c}`);
      grid[r][c] = {
        r,
        c,
        rowspan: merge?.rowspan || 1,
        colspan: merge?.colspan || 1,
      };
    }
  }

  return { grid, rows, cols };
};

export const toMatrix = (table) => {
  const { rows, cols } = getBounds(table);
  const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

  for (const cell of table.cells || []) {
    if (cell.r < rows && cell.c < cols) {
      matrix[cell.r][cell.c] = normalizeValue(cell.value);
    }
  }

  for (const merge of table.merges || []) {
    const rowEnd = merge.r + merge.rowspan;
    const colEnd = merge.c + merge.colspan;

    for (let r = merge.r; r < rowEnd; r += 1) {
      for (let c = merge.c; c < colEnd; c += 1) {
        if (r === merge.r && c === merge.c) {
          continue;
        }

        if (r < rows && c < cols) {
          matrix[r][c] = '';
        }
      }
    }
  }

  return matrix;
};

const escapeCsvValue = (value) => {
  const normalized = normalizeValue(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

export const toCsv = (table) => {
  const matrix = toMatrix(table);

  return matrix
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
};

const escapeHtml = (value) => {
  return normalizeValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const toJson = (table) => ({
  matrix: toMatrix(table),
  merges: table.merges || [],
  ...(table.headers && table.headers.length ? { headers: table.headers } : {}),
  meta: table.meta || {},
});

export const addHeaderRange = (table, selection) => {
  if (!selection) {
    return table;
  }

  const next = { ...table };
  const headers = [...(table.headers || [])];
  const r1 = Math.min(selection.r1, selection.r2);
  const r2 = Math.max(selection.r1, selection.r2);
  const c1 = Math.min(selection.c1, selection.c2);
  const c2 = Math.max(selection.c1, selection.c2);

  headers.push({
    r: r1,
    c: c1,
    rowspan: r2 - r1 + 1,
    colspan: c2 - c1 + 1,
  });

  next.headers = headers;
  return next;
};

export const clearHeaderRanges = (table) => ({
  ...table,
  headers: [],
});

export const isHeaderPosition = (table, r, c) => {
  const ranges = table.headers || [];
  return ranges.some(
    (range) =>
      r >= range.r &&
      r < range.r + range.rowspan &&
      c >= range.c &&
      c < range.c + range.colspan,
  );
};

const getHeaderRows = (table) => {
  const { grid, rows, cols } = getRenderGrid(table);
  let headerRows = 0;

  for (let r = 0; r < rows; r += 1) {
    let allHeader = true;

    for (let c = 0; c < cols; c += 1) {
      const cell = grid[r][c];
      if (!cell) {
        continue;
      }

      if (!isHeaderPosition(table, cell.r, cell.c)) {
        allHeader = false;
        break;
      }
    }

    if (!allHeader) {
      break;
    }

    headerRows += 1;
  }

  return headerRows;
};

export const toHtml = (table, options = {}) => {
  const matrix = toMatrix(table);
  const cellMap = new Map();
  (table.cells || []).forEach((cell) => {
    cellMap.set(`${cell.r}:${cell.c}`, cell);
  });
  const merges = table.merges || [];
  const mergeMap = new Map();
  const covered = new Set();

  merges.forEach((merge) => {
    mergeMap.set(`${merge.r}:${merge.c}`, merge);

    for (let r = merge.r; r < merge.r + merge.rowspan; r += 1) {
      for (let c = merge.c; c < merge.c + merge.colspan; c += 1) {
        if (r === merge.r && c === merge.c) {
          continue;
        }

        covered.add(`${r}:${c}`);
      }
    }
  });

  const headerRows = getHeaderRows(table);

  const sanitizeHtml = (html) => {
    let result = html;
    if (options.stripColor) {
      // Remove <span style="color:..."> and <span style="background-color:..."> wrappers
      result = result.replace(/<span style="[^"]*">(.*?)<\/span>/g, '$1');
    }
    if (options.stripBold) {
      // Remove <strong> wrappers
      result = result.replace(/<strong>(.*?)<\/strong>/g, '$1');
    }
    return result;
  };

  const renderRows = (start, end, useThead) =>
    matrix
      .slice(start, end)
      .map((row, offset) => {
        const r = start + offset;
        const cells = row
          .map((value, c) => {
            if (covered.has(`${r}:${c}`)) {
              return '';
            }

            const key = `${r}:${c}`;
            const merge = mergeMap.get(key);
            const rowspan = merge ? ` rowspan="${merge.rowspan}"` : '';
            const colspan = merge ? ` colspan="${merge.colspan}"` : '';
            const isHeader = useThead || isHeaderPosition(table, r, c);
            const tag = isHeader ? 'th' : 'td';
            const cell = cellMap.get(key);
            let content = cell?.html ? sanitizeHtml(cell.html) : escapeHtml(value);

            return `<${tag}${rowspan}${colspan}>${content}</${tag}>`;
          })
          .filter(Boolean)
          .join('');

        return `<tr>${cells}</tr>`;
      })
      .join('');

  const classAttr = options.className ? ` class="${options.className}"` : '';
  let html = `<table${classAttr}>`;
  if (headerRows > 0) {
    html += `<thead>${renderRows(0, headerRows, true)}</thead>`;
  }
  html += `<tbody>${renderRows(headerRows, matrix.length, false)}</tbody></table>`;
  return html;
};

export const mergeCells = (table, { r1, c1, r2, c2 }) => {
  const startRow = Math.min(r1, r2);
  const endRow = Math.max(r1, r2);
  const startCol = Math.min(c1, c2);
  const endCol = Math.max(c1, c2);

  if (startRow === endRow && startCol === endCol) {
    return table;
  }

  const merges = [...(table.merges || [])];
  merges.push({
    r: startRow,
    c: startCol,
    rowspan: endRow - startRow + 1,
    colspan: endCol - startCol + 1,
  });

  return {
    ...table,
    merges,
  };
};

export const splitCell = (table, { r, c }) => {
  const merges = (table.merges || []).filter(
    (merge) => !(merge.r === r && merge.c === c),
  );

  return {
    ...table,
    merges,
  };
};

export const updateCell = (table, { r, c, value }) => {
  const cells = [...(table.cells || [])];
  const existingIndex = cells.findIndex((cell) => cell.r === r && cell.c === c);

  if (existingIndex >= 0) {
    const nextCell = { ...cells[existingIndex], value };
    if ('html' in nextCell) {
      delete nextCell.html;
    }
    cells[existingIndex] = nextCell;
  } else {
    cells.push({ r, c, value });
  }

  return {
    ...table,
    cells,
  };
};
