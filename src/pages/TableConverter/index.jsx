import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseTableFile } from '../../utils/parseTableFile.js';
import {
  addHeaderRange,
  clearHeaderRanges,
  mergeCells,
  splitCell,
  toCsv,
  toHtml,
  toJson,
  updateCell,
} from '../../utils/tableModel.js';
import {
  applyHistory,
  createHistory,
  redoHistory,
  resetHistory,
  undoHistory,
} from '../../utils/tableHistory.js';
import FileUploader from './components/FileUploader.jsx';
import TableReview from './TableReview.jsx';
import { buildEditableHtml, buildOdooCompatibleHtml } from './utils/buildEditableHtml.js';
import { copyHtmlToClipboard } from './utils/copyHtmlToClipboard.js';

const TableConverter = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [stripColor, setStripColor] = useState(false);
  const [stripBold, setStripBold] = useState(false);
  const [stripAlign, setStripAlign] = useState(false);
  const [tableClassName, setTableClassName] = useState('');
  const [showBorder, setShowBorder] = useState(true);


  const activeTable = useMemo(() => {
    if (!result || !result.tables.length) {
      return null;
    }

    return result.tables[activeIndex] || result.tables[0];
  }, [result, activeIndex]);

  const previewHtml = useMemo(() => {
    if (!activeTable) {
      return '';
    }

    return toHtml(activeTable, { 
      stripColor, 
      stripBold, 
      stripAlign,
      showBorder,
      className: tableClassName || undefined 
    });
  }, [activeTable, stripColor, stripBold, stripAlign, showBorder, tableClassName]);


  const handleFileSelect = async (file) => {
    setStatus('parsing');
    setError('');
    setResult(null);
    setHistory(null);
    setActiveIndex(0);
    setFileName(file.name);
    setStripColor(false);
    setStripBold(false);
    setStripAlign(false);
    setTableClassName('');
    setShowBorder(true);


    try {
      const parsed = await parseTableFile(file);
      setResult(parsed);
      setHistory(createHistory(parsed.tables[parsed.activeIndex || 0]));
      setStatus('ready');
    } catch (parseError) {
      setStatus('idle');
      setError(parseError?.message || '解析失敗，請確認檔案格式');
    }
  };

  const handleDownload = (type) => {
    if (!activeTable) {
      return;
    }

    let content = '';
    let extension = '';
    let mime = '';

    if (type === 'html') {
      content = toHtml(activeTable, { 
        stripColor, 
        stripBold, 
        stripAlign,
        showBorder,
        className: tableClassName || undefined 
      });

      extension = 'html';
      mime = 'text/html';
    }

    if (type === 'csv') {
      content = toCsv(activeTable);
      extension = 'csv';
      mime = 'text/csv';
    }

    if (type === 'json') {
      content = JSON.stringify(toJson(activeTable), null, 2);
      extension = 'json';
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName || 'table'}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleMerge = (range) => {
    if (!activeTable || !history) {
      return;
    }

    const updated = mergeCells(activeTable, range);
    const nextTables = result.tables.map((table, index) =>
      index === activeIndex ? updated : table,
    );
    setResult({ ...result, tables: nextTables });
    setHistory(applyHistory(history, updated));
  };

  const handleSplit = (cell) => {
    if (!activeTable || !history) {
      return;
    }

    const updated = splitCell(activeTable, cell);
    const nextTables = result.tables.map((table, index) =>
      index === activeIndex ? updated : table,
    );
    setResult({ ...result, tables: nextTables });
    setHistory(applyHistory(history, updated));
  };

  const handleEdit = (cell) => {
    if (!activeTable || !history) {
      return;
    }

    const updated = updateCell(activeTable, cell);
    const nextTables = result.tables.map((table, index) =>
      index === activeIndex ? updated : table,
    );
    setResult({ ...result, tables: nextTables });
    setHistory(applyHistory(history, updated));
  };

  const handleSetHeader = (selection) => {
    if (!activeTable || !history) {
      return;
    }

    const updated = addHeaderRange(activeTable, selection);
    const nextTables = result.tables.map((table, index) =>
      index === activeIndex ? updated : table,
    );
    setResult({ ...result, tables: nextTables });
    setHistory(applyHistory(history, updated));
  };

  const handleClearHeader = () => {
    if (!activeTable || !history) {
      return;
    }

    const updated = clearHeaderRanges(activeTable);
    const nextTables = result.tables.map((table, index) =>
      index === activeIndex ? updated : table,
    );
    setResult({ ...result, tables: nextTables });
    setHistory(applyHistory(history, updated));
  };

  const handleUndo = () => {
    if (!history) {
      return;
    }

    const nextHistory = undoHistory(history);
    setHistory(nextHistory);

    if (result) {
      const nextTables = result.tables.map((table, index) =>
        index === activeIndex ? nextHistory.present : table,
      );
      setResult({ ...result, tables: nextTables });
    }
  };

  const handleRedo = () => {
    if (!history) {
      return;
    }

    const nextHistory = redoHistory(history);
    setHistory(nextHistory);

    if (result) {
      const nextTables = result.tables.map((table, index) =>
        index === activeIndex ? nextHistory.present : table,
      );
      setResult({ ...result, tables: nextTables });
    }
  };

  const handleReset = () => {
    if (!history) {
      return;
    }

    const nextHistory = resetHistory(history);
    setHistory(nextHistory);

    if (result) {
      const nextTables = result.tables.map((table, index) =>
        index === activeIndex ? nextHistory.present : table,
      );
      setResult({ ...result, tables: nextTables });
    }
  };

  return (
    <div className="min-h-screen theme-dark text-slate-100">
      <div className="mx-auto flex max-w-[1500px] flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-600/20 text-sm font-black text-emerald-200">
              TC
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white">Table Converter</div>
              <div className="text-sm font-semibold text-slate-300">Excel / Word 表格快速轉換</div>
            </div>
          </div>
          <Link
            to="/"
            className="text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            返回首頁
          </Link>
        </header>

        <main className="mt-12 space-y-8">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
            <div className="flex flex-col gap-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Upload
              </div>
              <h1 className="text-3xl font-black text-white md:text-4xl">上傳你的表格</h1>
              <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                支援 .xlsx 與 .docx，解析後可直接預覽並下載 HTML、CSV、JSON。
              </p>
              <FileUploader
                status={status}
                error={error}
                onFileSelect={handleFileSelect}
                hint="單檔上限 25MB，支援 .xlsx / .docx"
              />
            </div>
          </section>
          {activeTable && (
            <TableReview
              result={result}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              previewHtml={previewHtml}
              onExport={handleDownload}
              onCopyHtml={() => {
                copyHtmlToClipboard(previewHtml);
              }}
              onCopyEditableHtml={() => {
                copyHtmlToClipboard(buildEditableHtml(previewHtml));
              }}
              onCopyOdooHtml={() => {
                copyHtmlToClipboard(buildOdooCompatibleHtml(previewHtml));
              }}
              table={activeTable}
              onMerge={handleMerge}
              onSplit={handleSplit}
              onEdit={handleEdit}
              onSetHeader={handleSetHeader}
              onClearHeader={handleClearHeader}
              stripColor={stripColor}
              onStripColorChange={setStripColor}
              stripBold={stripBold}
              onStripBoldChange={setStripBold}
              stripAlign={stripAlign}
              onStripAlignChange={setStripAlign}
              tableClassName={tableClassName}
              onClassNameChange={setTableClassName}
              showBorder={showBorder}
              onShowBorderChange={setShowBorder}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onReset={handleReset}
              canUndo={Boolean(history?.past.length)}
              canRedo={Boolean(history?.future.length)}
            />

          )}
        </main>
      </div>
    </div>
  );
};

export default TableConverter;
