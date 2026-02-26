import { useMemo, useState } from 'react';
import { isHeaderPosition, toMatrix } from '../../../utils/tableModel.js';

const normalizeSelection = (first, second) => {
  const r1 = Math.min(first.r, second.r);
  const r2 = Math.max(first.r, second.r);
  const c1 = Math.min(first.c, second.c);
  const c2 = Math.max(first.c, second.c);
  return { r1, c1, r2, c2 };
};

const MergeEditor = ({
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
  const matrix = useMemo(() => toMatrix(table), [table]);
  const [anchor, setAnchor] = useState(null);
  const [selections, setSelections] = useState([]);
  const [activeSelection, setActiveSelection] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [draftValue, setDraftValue] = useState('');

  const pendingSelection = anchor ? normalizeSelection(anchor, anchor) : null;
  const highlightRanges = pendingSelection ? [...selections, pendingSelection] : selections;


  const { mergeMap, covered } = useMemo(() => {
    const map = new Map();
    const hidden = new Set();

    (table.merges || []).forEach((merge) => {
      map.set(`${merge.r}:${merge.c}`, merge);

      for (let r = merge.r; r < merge.r + merge.rowspan; r += 1) {
        for (let c = merge.c; c < merge.c + merge.colspan; c += 1) {
          if (r === merge.r && c === merge.c) {
            continue;
          }

          hidden.add(`${r}:${c}`);
        }
      }
    });

    return { mergeMap: map, covered: hidden };
  }, [table.merges]);

  const isSelected = (r, c) =>
    highlightRanges.some(
      (range) => r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2,
    );

  const handleCellClick = (r, c, event) => {
    if (editingCell) {
      return;
    }

    if (event.shiftKey) {
      if (!anchor) {
        setAnchor({ r, c });
        return;
      }

      const nextSelection = normalizeSelection(anchor, { r, c });
      setSelections((prev) => [...prev, nextSelection]);
      setActiveSelection(nextSelection);
      setAnchor(null);
      return;
    }

    if (!anchor) {
      setAnchor({ r, c });
      setSelections([]);
      setActiveSelection(null);
      return;
    }

    const nextSelection = normalizeSelection(anchor, { r, c });
    setSelections([nextSelection]);
    setActiveSelection(nextSelection);
    setAnchor(null);
  };

  const handleCellDoubleClick = (r, c, value) => {
    setEditingCell({ r, c });
    setDraftValue(value || '');
  };

  const commitEdit = () => {
    if (!editingCell) {
      return;
    }

    if (onEdit) {
      onEdit({ r: editingCell.r, c: editingCell.c, value: draftValue });
    }

    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const handleMerge = () => {
    if (!activeSelection) {
      return;
    }

    onMerge(activeSelection);
    setAnchor(null);
    setSelections([]);
    setActiveSelection(null);
  };

  const handleSetHeader = () => {
    if (!activeSelection || !onSetHeader) {
      return;
    }

    onSetHeader(activeSelection);
    setAnchor(null);
    setSelections([]);
    setActiveSelection(null);
  };

  const handleClearHeader = () => {
    if (!onClearHeader) {
      return;
    }

    onClearHeader();
  };

  const handleSplit = () => {
    if (!activeSelection) {
      return;
    }

    onSplit({ r: activeSelection.r1, c: activeSelection.c1 });
    setAnchor(null);
    setSelections([]);
    setActiveSelection(null);
  };

  const cellHtmlMap = useMemo(() => {
    const map = new Map();
    (table.cells || []).forEach((cell) => {
      if (cell.html) {
        map.set(`${cell.r}:${cell.c}`, cell.html);
      }
    });
    return map;
  }, [table.cells]);



  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Merge Editor</h2>
          <p className="mt-1 text-xs text-slate-300">點兩次建立範圍，Shift 可累加多區塊。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUndo}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canRedo}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleMerge}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
            disabled={
              !activeSelection ||
              (activeSelection.r1 === activeSelection.r2 &&
                activeSelection.c1 === activeSelection.c2)
            }
          >
            合併選取
          </button>
          <button
            type="button"
            onClick={handleSetHeader}
            className="rounded-xl border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!activeSelection || !onSetHeader}
          >
            設為表頭
          </button>
          <button
            type="button"
            onClick={handleClearHeader}
            className="rounded-xl border border-amber-400/40 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!onClearHeader}
          >
            清除表頭
          </button>
          <button
            type="button"
            onClick={handleSplit}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!activeSelection}
          >
            拆分
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <tbody>
            {matrix.map((row, r) => (
              <tr key={`row-${r}`}>
                {row.map((value, c) => {
                  const key = `${r}:${c}`;

                  if (covered.has(key)) {
                    return null;
                  }

                  const merge = mergeMap.get(key);
                  const rowSpan = merge?.rowspan && merge.rowspan > 1 ? merge.rowspan : undefined;
                  const colSpan = merge?.colspan && merge.colspan > 1 ? merge.colspan : undefined;
                  const isEditing = editingCell && editingCell.r === r && editingCell.c === c;
                  const isHeader = isHeaderPosition(table, r, c);

                  return (
                    <td
                      key={key}
                      rowSpan={rowSpan}
                      colSpan={colSpan}
                      className={`min-w-[64px] border border-slate-800 align-top ${isSelected(r, c) ? 'ring-2 ring-emerald-400/70' : ''
                        } ${isHeader ? 'bg-amber-500/10 ring-1 ring-amber-400/50' : ''}`}
                    >
                      {isEditing ? (
                        <input
                          aria-label="編輯儲存格"
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitEdit();
                            }

                            if (event.key === 'Escape') {
                              event.preventDefault();
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          className="block w-full rounded-none bg-emerald-500/10 px-2 py-3 text-xs font-semibold text-emerald-100 outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => handleCellClick(r, c, event)}
                          onDoubleClick={() => handleCellDoubleClick(r, c, value)}
                          className="block w-full px-2 py-3 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-900/40"
                          {...(() => {
                            const cellData = (table.cells || []).find((cell) => cell.r === r && cell.c === c);
                            return cellData?.html
                              ? { dangerouslySetInnerHTML: { __html: cellData.html } }
                              : { children: value || '' };
                          })()}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MergeEditor;

