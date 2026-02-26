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
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
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
        />
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">即時預覽</h2>
            <SheetSelector tables={result.tables} activeIndex={activeIndex} onChange={onSelect} />
          </div>
          <TablePreview html={previewHtml} />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <ExportPanel
            onExport={onExport}
            onCopyHtml={onCopyHtml}
            stripColor={stripColor}
            onStripColorChange={onStripColorChange}
            stripBold={stripBold}
            onStripBoldChange={onStripBoldChange}
            className={tableClassName}
            onClassNameChange={onClassNameChange}
          />
        </div>
      </div>
    </section>
  );
};

export default TableReview;

