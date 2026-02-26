import { describe, expect, it } from 'vitest';
import { applyHistory, createHistory, redoHistory, resetHistory, undoHistory } from './tableHistory.js';

describe('tableHistory', () => {
  it('records new states and allows undo/redo', () => {
    const initial = { id: 'a', merges: [] };
    const history = createHistory(initial);
    const next = applyHistory(history, { id: 'b', merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }] });

    expect(next.present.id).toBe('b');

    const undo = undoHistory(next);
    expect(undo.present.id).toBe('a');

    const redo = redoHistory(undo);
    expect(redo.present.id).toBe('b');
  });

  it('resets to initial state', () => {
    const initial = { id: 'a', merges: [] };
    const history = createHistory(initial);
    const next = applyHistory(history, { id: 'b', merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }] });

    const reset = resetHistory(next);
    expect(reset.present.id).toBe('a');
    expect(reset.future).toEqual([]);
  });
});
