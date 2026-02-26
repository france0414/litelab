import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MergeEditor from './MergeEditor.jsx';

afterEach(() => {
  cleanup();
});

describe('MergeEditor', () => {
  it('calls onMerge with selected range', async () => {
    const onMerge = vi.fn();
    const user = userEvent.setup();
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
      ],
      merges: [],
      meta: {},
    };

    render(
      <MergeEditor
        table={table}
        onMerge={onMerge}
        onSplit={() => {}}
        onEdit={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'A' }));
    await user.click(screen.getByRole('button', { name: 'B' }));
    await user.click(screen.getByRole('button', { name: '合併選取' }));

    expect(onMerge).toHaveBeenCalledWith({ r1: 0, c1: 0, r2: 0, c2: 1 });
  });

  it('calls onEdit when a cell is edited', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const table = {
      cells: [{ r: 0, c: 0, value: 'A' }],
      merges: [],
      meta: {},
    };

    render(
      <MergeEditor
        table={table}
        onMerge={() => {}}
        onSplit={() => {}}
        onEdit={onEdit}
      />,
    );

    const buttons = screen.getAllByRole('button', { name: 'A' });
    await user.dblClick(buttons[buttons.length - 1]);
    const input = screen.getByLabelText('編輯儲存格');
    await user.clear(input);
    await user.type(input, 'Z{Enter}');

    expect(onEdit).toHaveBeenCalledWith({ r: 0, c: 0, value: 'Z' });
  });

  it('renders merged cells with rowspan and colspan', () => {
    const table = {
      cells: [
        { r: 0, c: 0, value: 'A' },
        { r: 0, c: 1, value: 'B' },
        { r: 1, c: 0, value: 'C' },
        { r: 1, c: 1, value: 'D' },
      ],
      merges: [{ r: 0, c: 0, rowspan: 2, colspan: 2 }],
      meta: {},
    };

    render(
      <MergeEditor
        table={table}
        onMerge={() => {}}
        onSplit={() => {}}
        onEdit={() => {}}
      />,
    );

    const cell = screen.getByRole('button', { name: 'A' }).closest('td');
    expect(cell).toHaveAttribute('rowspan', '2');
    expect(cell).toHaveAttribute('colspan', '2');
  });
});
