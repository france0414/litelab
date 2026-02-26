import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SheetSelector from './SheetSelector.jsx';

afterEach(() => {
  cleanup();
});

describe('SheetSelector', () => {
  it('renders options for each table', () => {
    render(
      <SheetSelector
        tables={[{ meta: { sheetName: 'Sheet1' } }, { meta: { sheetName: 'Sheet2' } }]}
        activeIndex={0}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('option', { name: 'Sheet1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sheet2' })).toBeInTheDocument();
  });

  it('calls onChange with selected index', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <SheetSelector
        tables={[{ meta: { sheetName: 'Sheet1' } }, { meta: { sheetName: 'Sheet2' } }]}
        activeIndex={0}
        onChange={onChange}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    const select = selects[selects.length - 1];
    await user.selectOptions(select, '1');

    expect(onChange).toHaveBeenCalledWith(1);
  });
});
