import { useState } from 'react';

const ExportPanel = ({ onExport, onCopyHtml, stripColor, onStripColorChange, stripBold, onStripBoldChange, className, onClassNameChange }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopyHtml) {
      onCopyHtml();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-black text-white">匯出</h2>
      <p className="mt-2 text-sm text-slate-300">
        下載 HTML、CSV 或 JSON。HTML 可直接貼到網頁中使用。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={stripColor}
            onChange={() => onStripColorChange(!stripColor)}
            className="h-4 w-4 rounded border border-slate-600 bg-slate-950/60"
          />
          清除色彩
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={stripBold}
            onChange={() => onStripBoldChange(!stripBold)}
            className="h-4 w-4 rounded border border-slate-600 bg-slate-950/60"
          />
          清除粗體
        </label>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300">Class Name</label>
          <input
            type="text"
            value={className}
            onChange={(e) => onClassNameChange(e.target.value)}
            placeholder="e.g. my-table"
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onExport('html')}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500"
          >
            下載 HTML
          </button>
          <button
            type="button"
            onClick={() => onExport('csv')}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-200 transition hover:border-slate-500"
          >
            下載 CSV
          </button>
          <button
            type="button"
            onClick={() => onExport('json')}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-200 transition hover:border-slate-500"
          >
            下載 JSON
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-2xl border border-blue-500/40 bg-blue-600/20 px-4 py-3 text-sm font-black text-blue-200 transition hover:bg-blue-600/30"
        >
          {copied ? '✓ 已複製' : '複製 HTML'}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
