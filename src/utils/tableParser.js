import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

/* ── helpers for Word XML color parsing ── */

const HIGHLIGHT_COLORS = {
  yellow: '#FFFF00',
  green: '#00FF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  blue: '#0000FF',
  red: '#FF0000',
  darkBlue: '#00008B',
  darkCyan: '#008B8B',
  darkGreen: '#006400',
  darkMagenta: '#8B008B',
  darkRed: '#8B0000',
  darkYellow: '#808000',
  darkGray: '#A9A9A9',
  lightGray: '#D3D3D3',
  black: '#000000',
  white: '#FFFFFF',
};

const getAttr = (el, ns, attr) => {
  if (!el) return null;
  return el.getAttribute(`${ns}:${attr}`) || el.getAttribute(attr) || null;
};

const findChild = (parent, ns, localName) => {
  if (!parent) return null;
  for (const child of parent.children || []) {
    const tag = child.localName || child.nodeName.split(':').pop();
    if (tag === localName) return child;
  }
  return null;
};

const findChildren = (parent, ns, localName) => {
  if (!parent) return [];
  const result = [];
  for (const child of parent.children || []) {
    const tag = child.localName || child.nodeName.split(':').pop();
    if (tag === localName) result.push(child);
  }
  return result;
};

const parseNumberingXml = (xmlString) => {
  if (!xmlString) {
    return { getListType: () => null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const abstractNums = new Map();

  Array.from(doc.getElementsByTagName('w:abstractNum')).forEach((abstractNum) => {
    const abstractNumId = getAttr(abstractNum, 'w', 'abstractNumId');
    if (!abstractNumId) {
      return;
    }

    const levels = new Map();
    Array.from(abstractNum.getElementsByTagName('w:lvl')).forEach((lvl) => {
      const ilvl = getAttr(lvl, 'w', 'ilvl');
      const numFmtEl = findChild(lvl, 'w', 'numFmt');
      const numFmt = numFmtEl ? getAttr(numFmtEl, 'w', 'val') : null;
      if (ilvl !== null) {
        levels.set(ilvl, numFmt);
      }
    });

    abstractNums.set(abstractNumId, levels);
  });

  const numMap = new Map();
  Array.from(doc.getElementsByTagName('w:num')).forEach((num) => {
    const numId = getAttr(num, 'w', 'numId');
    const abstractNumIdEl = findChild(num, 'w', 'abstractNumId');
    const abstractNumId = getAttr(abstractNumIdEl, 'w', 'val');
    if (numId && abstractNumId) {
      numMap.set(numId, abstractNumId);
    }
  });

  const getListType = (numId, ilvl) => {
    if (!numId) {
      return null;
    }
    const abstractNumId = numMap.get(numId);
    const levels = abstractNums.get(abstractNumId);
    const levelKey = ilvl ?? '0';
    const numFmt = levels?.get(levelKey);
    if (numFmt === 'bullet') {
      return 'ul';
    }
    return numFmt ? 'ol' : 'ol';
  };

  return { getListType };
};

/* ── extract run-level style from <w:rPr> ── */

const extractRunStyle = (rPr) => {
  if (!rPr) return {};
  const style = {};

  const colorEl = findChild(rPr, 'w', 'color');
  if (colorEl) {
    const val = getAttr(colorEl, 'w', 'val');
    if (val && val !== 'auto' && val !== '000000') {
      style.color = `#${val}`;
    }
  }

  const highlightEl = findChild(rPr, 'w', 'highlight');
  if (highlightEl) {
    const val = getAttr(highlightEl, 'w', 'val');
    if (val && HIGHLIGHT_COLORS[val]) {
      style.bg = HIGHLIGHT_COLORS[val];
    }
  }

  const boldEl = findChild(rPr, 'w', 'b');
  if (boldEl) {
    const val = getAttr(boldEl, 'w', 'val');
    if (val !== '0' && val !== 'false') {
      style.bold = true;
    }
  }

  const vertAlignEl = findChild(rPr, 'w', 'vertAlign');
  if (vertAlignEl) {
    const val = getAttr(vertAlignEl, 'w', 'val');
    if (val === 'superscript') style.vertAlign = 'sup';
    if (val === 'subscript') style.vertAlign = 'sub';
  }

  return style;
};



/* ── escape HTML entities ── */

const escapeHtmlText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ── build inline HTML for a single run ── */

const buildRunHtml = (text, runStyle) => {
  if (!text) return '';
  const escaped = escapeHtmlText(text);

  const hasStyle = runStyle.color || runStyle.bg;
  const isBold = runStyle.bold;
  const vertAlign = runStyle.vertAlign; // 'sup' or 'sub'

  if (!hasStyle && !isBold && !vertAlign) return escaped;

  // Build inline style parts
  const styleParts = [];
  if (runStyle.color) styleParts.push(`color:${runStyle.color}`);
  if (runStyle.bg) styleParts.push(`background-color:${runStyle.bg}`);

  let html = escaped;

  // Wrap in <strong> for bold
  if (isBold) {
    html = `<strong>${html}</strong>`;
  }

  // Wrap in <sup> or <sub>
  if (vertAlign === 'sup') {
    html = `<sup>${html}</sup>`;
  } else if (vertAlign === 'sub') {
    html = `<sub>${html}</sub>`;
  }

  // Wrap in <span> for color/highlight
  if (styleParts.length > 0) {
    html = `<span style="${styleParts.join(';')}">${html}</span>`;
  }

  return html;
};

/* ── parse a single <w:tc> (table cell) ── */

const parseTc = (tc, listInfo) => {
  const tcPr = findChild(tc, 'w', 'tcPr');

  // gridSpan (colspan)
  const gridSpanEl = findChild(tcPr, 'w', 'gridSpan');
  const colspan = gridSpanEl ? Number(getAttr(gridSpanEl, 'w', 'val') || 1) : 1;

  // vMerge (rowspan) – restart = start of merge, continue/empty = covered
  const vMergeEl = findChild(tcPr, 'w', 'vMerge');
  let vMerge = null;
  if (vMergeEl) {
    const val = getAttr(vMergeEl, 'w', 'val');
    vMerge = val === 'restart' ? 'restart' : 'continue';
  }

  // collect text and build rich HTML from all <w:p> > <w:r>
  const paragraphs = findChildren(tc, 'w', 'p');
  const plainParts = [];
  const paragraphData = [];
  let hasRichFormatting = false;
  let hasListStructure = false;

  paragraphs.forEach((p, pIdx) => {
    if (pIdx > 0) {
      plainParts.push('\n');
    }

    const pPr = findChild(p, 'w', 'pPr');
    const jcEl = findChild(pPr, 'w', 'jc');
    const pAlign = jcEl ? getAttr(jcEl, 'w', 'val') : null;

    const numPr = findChild(pPr, 'w', 'numPr');
    const numIdEl = findChild(numPr, 'w', 'numId');
    const ilvlEl = findChild(numPr, 'w', 'ilvl');
    const numId = numIdEl ? getAttr(numIdEl, 'w', 'val') : null;
    const ilvl = ilvlEl ? getAttr(ilvlEl, 'w', 'val') : null;
    const listType = numPr ? listInfo?.getListType?.(numId, ilvl) : null;

    if (listType) {
      hasListStructure = true;
    }

    const runs = findChildren(p, 'w', 'r');
    const runHtmlParts = [];
    const runPlainParts = [];

    runs.forEach((run) => {
      const rPr = findChild(run, 'w', 'rPr');
      const runStyle = extractRunStyle(rPr);

      const texts = findChildren(run, 'w', 't');
      const runText = texts.map((t) => t.textContent || '').join('');

      if (runText) {
        runPlainParts.push(runText);
        const runHtml = buildRunHtml(runText, runStyle);
        runHtmlParts.push(runHtml);

        if (runStyle.bold || runStyle.color || runStyle.bg || runStyle.vertAlign) {
          hasRichFormatting = true;
        }
      }
    });

    const paragraphPlain = runPlainParts.join('');
    const paragraphHtml = runHtmlParts.join('');
    plainParts.push(paragraphPlain);

    paragraphData.push({
      plain: paragraphPlain,
      html: paragraphHtml,
      listType,
      numId,
      ilvl,
      align: pAlign,
    });
  });

  const htmlParts = [];
  let openList = null;
  let lastWasPlain = false;

  const closeList = () => {
    if (openList) {
      htmlParts.push(`</${openList.type}>`);
      openList = null;
    }
  };

  paragraphData.forEach((paragraph) => {
    if (paragraph.listType) {
      const key = `${paragraph.listType}:${paragraph.numId || ''}:${paragraph.ilvl || '0'}`;
      if (!openList || openList.key !== key) {
        closeList();
        openList = { type: paragraph.listType, key };
        htmlParts.push(`<${paragraph.listType}>`);
      }

      const content = paragraph.html || escapeHtmlText(paragraph.plain);
      htmlParts.push(`<li>${content}</li>`);
      lastWasPlain = false;
      return;
    }

    closeList();
    if (lastWasPlain) {
      htmlParts.push('<br>');
    }
    const content = paragraph.html || escapeHtmlText(paragraph.plain);
    htmlParts.push(content);
    lastWasPlain = true;
  });

  closeList();

  const value = plainParts.join('').trim();
  const html = hasRichFormatting || hasListStructure ? htmlParts.join('') : undefined;
  
  // Use the alignment of the first paragraph as the cell's alignment
  const cellAlign = paragraphData.find(p => p.align)?.align;
  const style = cellAlign ? { align: cellAlign } : undefined;

  return { value, html, colspan, vMerge, style };
};

/* ── parse all tables from docx XML ── */

const parseDocxXml = (xmlString, numberingXmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) return [];

  const listInfo = parseNumberingXml(numberingXmlString);

  const tables = findChildren(body, 'w', 'tbl');
  return tables.map((tbl, tableIndex) => {
    const cells = [];
    const merges = [];
    const headerRows = new Set();
    const rowColCounts = [];
    const rows = findChildren(tbl, 'w', 'tr');

    // Track vMerge state: key = colIndex, value = { startRow, endRow, colIndex, colspan }
    const vMergeTracker = new Map();

    const finalizeVMerge = (colIdx) => {
      const tracker = vMergeTracker.get(colIdx);
      if (!tracker) return;
      const rowspan = tracker.endRow - tracker.startRow + 1;
      if (rowspan > 1) {
        // Check if there's already a merge entry for horizontal span at this position
        const existing = merges.find(
          (m) => m.r === tracker.startRow && m.c === tracker.colIndex,
        );
        if (existing) {
          existing.rowspan = rowspan;
        } else {
          merges.push({
            r: tracker.startRow,
            c: tracker.colIndex,
            rowspan,
            colspan: tracker.colspan,
          });
        }
      }
      vMergeTracker.delete(colIdx);
    };

    rows.forEach((tr, r) => {
      const trPr = findChild(tr, 'w', 'trPr');
      const headerFlag = findChild(trPr, 'w', 'tblHeader');
      if (headerFlag) {
        headerRows.add(r);
      }
      const tcs = findChildren(tr, 'w', 'tc');
      let colIndex = 0;

      tcs.forEach((tc) => {
        const parsed = parseTc(tc, listInfo);

        if (parsed.vMerge === 'continue') {
          // This cell is part of a vertical merge – update the tracker
          const tracker = vMergeTracker.get(colIndex);
          if (tracker) {
            tracker.endRow = r;
          }
          colIndex += parsed.colspan;
          return;
        }

        if (parsed.vMerge === 'restart') {
          // Finalize any previous vMerge at this column before starting new one
          finalizeVMerge(colIndex);
          // Start of a vertical merge
          vMergeTracker.set(colIndex, {
            startRow: r,
            endRow: r,
            colIndex,
            colspan: parsed.colspan,
          });
        } else {
          // No vMerge — finalize any active tracker at this column
          finalizeVMerge(colIndex);
        }

        cells.push({
          r,
          c: colIndex,
          value: parsed.value,
          ...(parsed.html ? { html: parsed.html } : {}),
          ...(parsed.style ? { style: parsed.style } : {}),
        });

        if (parsed.colspan > 1) {
          merges.push({
            r,
            c: colIndex,
            rowspan: 1,
            colspan: parsed.colspan,
          });
        }

        colIndex += parsed.colspan;
      });

      rowColCounts[r] = colIndex;
    });

    // Resolve any remaining active vertical merges
    for (const [colIdx] of vMergeTracker) {
      finalizeVMerge(colIdx);
    }

    const maxCols = rowColCounts.reduce((max, count) => Math.max(max, count || 0), 0);
    const headers = maxCols
      ? Array.from(headerRows)
        .sort((a, b) => a - b)
        .map((r) => ({ r, c: 0, rowspan: 1, colspan: maxCols }))
      : [];

    return {
      cells,
      merges,
      ...(headers.length ? { headers } : {}),
      meta: {
        sourceType: 'docx',
        tableIndex,
      },
    };
  });
};

/* ── XLSX parsing (enhanced with manual style extraction) ── */
const sheetToTable = (sheet, sheetName, tableIndex, stylesMap = []) => {
  const cells = [];
  const merges = (sheet['!merges'] || []).map((merge) => ({
    r: merge.s.r,
    c: merge.s.c,
    rowspan: merge.e.r - merge.s.r + 1,
    colspan: merge.e.c - merge.s.c + 1,
  }));

  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;

  if (range) {
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const address = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[address];

        if (cell && cell.v !== undefined) {
          const cellData = { r, c, value: cell.v };

          // Extract style from xlsx cell if available
          let style = {};
          if (cell.s !== undefined) {
            // If cell.s is a number (index into stylesMap)
            if (typeof cell.s === 'number' && stylesMap[cell.s]) {
              style = { ...stylesMap[cell.s] };
              // Clean up null/undefined properties
              Object.keys(style).forEach(key => {
                if (style[key] === null || style[key] === undefined) delete style[key];
              });
            }
          }
          
          if (Object.keys(style).length > 0) cellData.style = style;
          cells.push(cellData);
        }
      }
    }
  }

  return {
    cells,
    merges,
    meta: {
      sourceType: 'xlsx',
      sheetName,
      tableIndex,
    },
  };
};

export const parseXlsxArrayBuffer = async (arrayBuffer) => {
  // Read workbook WITHOUT cellStyles to preserve the original style index in .s
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Manually extract styles from xl/styles.xml using JSZip
  const stylesMap = [];
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const stylesXml = await zip.file('xl/styles.xml')?.async('string');
    if (stylesXml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(stylesXml, 'application/xml');
      
      // Parse Fonts
      const fonts = [];
      const fontEls = doc.getElementsByTagName('font');
      for (let i = 0; i < fontEls.length; i++) {
        const font = fontEls[i];
        fonts[i] = {
          bold: font.getElementsByTagName('b').length > 0,
          color: font.getElementsByTagName('color')[0]?.getAttribute('rgb')?.slice(-6)
        };
      }
      
      // Parse Fills
      const fills = [];
      const fillEls = doc.getElementsByTagName('fill');
      for (let i = 0; i < fillEls.length; i++) {
        const fill = fillEls[i];
        const fgColor = fill.getElementsByTagName('fgColor')[0];
        if (fgColor) {
          fills[i] = fgColor.getAttribute('rgb')?.slice(-6);
        }
      }

      // Parse Cell XFs (mapping to cells)
      const xfs = doc.getElementsByTagName('cellXfs')[0]?.getElementsByTagName('xf');
      if (xfs) {
        for (let i = 0; i < xfs.length; i++) {
          const xf = xfs[i];
          const alignment = xf.getElementsByTagName('alignment')[0];
          const fontId = xf.getAttribute('fontId');
          const fillId = xf.getAttribute('fillId');
          
          stylesMap[i] = {
            align: alignment ? alignment.getAttribute('horizontal') : null,
            bold: fonts[fontId]?.bold,
            color: fonts[fontId]?.color && fonts[fontId].color !== '000000' ? `#${fonts[fontId].color}` : null,
            bg: fills[fillId] && fills[fillId] !== 'FFFFFF' ? `#${fills[fillId]}` : null
          };
        }
      }
    }
  } catch (err) {
    console.warn('Manual XLSX style parsing failed:', err);
  }

  const tables = workbook.SheetNames.map((sheetName, index) =>
    sheetToTable(workbook.Sheets[sheetName], sheetName, index, stylesMap),
  );

  return { tables, activeIndex: 0 };
};

/* ── HTML table parsing (kept for compatibility) ── */

const parseHtmlTableElement = (table, tableIndex = 0) => {
  if (!table) {
    return { cells: [], merges: [], meta: { sourceType: 'docx', tableIndex } };
  }

  const cells = [];
  const merges = [];
  const occupied = [];

  const rows = Array.from(table.querySelectorAll('tr'));

  rows.forEach((row, r) => {
    if (!occupied[r]) {
      occupied[r] = [];
    }

    let colIndex = 0;
    const rowCells = Array.from(row.querySelectorAll('td, th'));

    rowCells.forEach((cell) => {
      while (occupied[r][colIndex]) {
        colIndex += 1;
      }

      const colspan = Number(cell.getAttribute('colspan') || 1);
      const rowspan = Number(cell.getAttribute('rowspan') || 1);
      const value = normalizeText(cell.textContent);
      const html = cell.innerHTML ? cell.innerHTML.trim() : '';

      cells.push({ r, c: colIndex, value, ...(html ? { html } : {}) });

      if (colspan > 1 || rowspan > 1) {
        merges.push({ r, c: colIndex, rowspan, colspan });
      }

      for (let rr = r; rr < r + rowspan; rr += 1) {
        if (!occupied[rr]) {
          occupied[rr] = [];
        }

        for (let cc = colIndex; cc < colIndex + colspan; cc += 1) {
          occupied[rr][cc] = true;
        }
      }

      colIndex += colspan;
    });
  });

  return {
    cells,
    merges,
    meta: {
      sourceType: 'docx',
      tableIndex,
    },
  };
};

export const parseHtmlTable = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');

  return parseHtmlTableElement(table, 0);
};

/* ── DOCX parsing via JSZip + direct XML ── */

export const parseDocxArrayBuffer = async (arrayBuffer) => {
  // Detect old .doc (OLE2 compound document) format — magic bytes: D0 CF 11 E0
  const header = new Uint8Array(arrayBuffer, 0, 4);
  if (header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0) {
    throw new Error(
      '此檔案為舊版 Word 格式（.doc），請在 Word 中另存為 .docx 格式後再上傳。',
    );
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const numberingXml = await zip.file('word/numbering.xml')?.async('string');

  if (!documentXml) {
    throw new Error('無法讀取 .docx 內容，檔案可能已損壞或格式不正確。');
  }

  const tables = parseDocxXml(documentXml, numberingXml);

  if (!tables.length) {
    return { tables: [{ cells: [], merges: [], meta: { sourceType: 'docx', tableIndex: 0 } }], activeIndex: 0 };
  }

  return { tables, activeIndex: 0 };
};
