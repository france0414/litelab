const SheetSelector = ({ tables, activeIndex, onChange }) => {
  if (!tables || tables.length <= 1) {
    return null;
  }

  return (
    <select
      className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200"
      value={activeIndex}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {tables.map((table, index) => (
        <option key={`${table.meta?.sheetName || 'table'}-${index}`} value={index}>
          {table.meta?.sheetName || `Table ${index + 1}`}
        </option>
      ))}
    </select>
  );
};

export default SheetSelector;
