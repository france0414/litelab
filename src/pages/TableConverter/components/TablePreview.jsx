const TablePreview = ({ html }) => {
  return (
    <div
      className="mt-4 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default TablePreview;
