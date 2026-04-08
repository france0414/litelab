import ExportPanel from './components/ExportPanel.jsx';
import MergeEditor from './components/MergeEditor.jsx';
import SheetSelector from './components/SheetSelector.jsx';
import TablePreview from './components/TablePreview.jsx';

const TableReview = ({
  result,
  activeIndex,
  onSelect,
  previewHtml,
  onExport,
  onCopyHtml,
  onCopyEditableHtml,
  stripColor,
  onStripColorChange,
  stripBold,
  onStripBoldChange,
  tableClassName,
  onClassNameChange,
  table,
  onMerge,
  onSplit,
  onUndo,
  onRedo,
  onReset,
  onEdit,
  onSetHeader,
  onClearHeader,
  canUndo,
  canRedo,
}) => {
  if (!result || !result.tables?.length || !table) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_10px_30px_rgba(2,6,23,0.35)]">
          <span className="uppercase tracking-[0.2em] text-slate-400">表格切換</span>
          <SheetSelector tables={result.tables} activeIndex={activeIndex} onChange={onSelect} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <MergeEditor
            table={table}
            onMerge={onMerge}
            onSplit={onSplit}
            onUndo={onUndo}
            onRedo={onRedo}
            onReset={onReset}
            onEdit={onEdit}
            onSetHeader={onSetHeader}
            onClearHeader={onClearHeader}
            canUndo={canUndo}
            canRedo={canRedo}
            activeIndex={activeIndex}
            totalTables={result.tables.length}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">即時預覽</h2>
            </div>
            <TablePreview html={previewHtml} />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
            <ExportPanel
              onExport={onExport}
              onCopyHtml={onCopyHtml}
              onCopyEditableHtml={onCopyEditableHtml}
              stripColor={stripColor}
              onStripColorChange={onStripColorChange}
              stripBold={stripBold}
              onStripBoldChange={onStripBoldChange}
              className={tableClassName}
              onClassNameChange={onClassNameChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TableReview;
