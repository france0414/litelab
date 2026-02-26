import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExportPanel from './ExportPanel.jsx';

afterEach(() => {
  cleanup();
});

describe('ExportPanel', () => {
  it('fires onExport when a button is clicked', async () => {
    const onExport = vi.fn();

    render(<ExportPanel onExport={onExport} />);

    await userEvent.click(screen.getByRole('button', { name: '下載 HTML' }));

    expect(onExport).toHaveBeenCalledWith('html');
  });

  it('toggles strip color', async () => {
    const onStripColorChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ExportPanel
        onExport={() => { }}
        stripColor={false}
        onStripColorChange={onStripColorChange}
        stripBold={false}
        onStripBoldChange={() => { }}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: '清除色彩' }));

    expect(onStripColorChange).toHaveBeenCalledWith(true);
  });
});
