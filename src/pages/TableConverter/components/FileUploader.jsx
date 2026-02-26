const FileUploader = ({ status, error, onFileSelect, hint }) => {
  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="text-sm font-semibold text-slate-200" htmlFor="table-file">
        上傳檔案
      </label>
      <input
        id="table-file"
        type="file"
        accept=".xlsx,.docx"
        onChange={handleChange}
        className="block w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-emerald-200"
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {status === 'parsing' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-200">解析中...</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-emerald-500/70" />
          </div>
        </div>
      )}
      {error && <p className="text-sm font-semibold text-rose-300">{error}</p>}
    </div>
  );
};

export default FileUploader;
