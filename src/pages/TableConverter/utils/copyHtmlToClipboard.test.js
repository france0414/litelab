import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyHtmlToClipboard } from './copyHtmlToClipboard.js';

describe('copyHtmlToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes html mime content when ClipboardItem is available', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    const ClipboardItemMock = class {
      constructor(items) {
        this.items = items;
      }
    };

    vi.stubGlobal('ClipboardItem', ClipboardItemMock);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { write, writeText },
      configurable: true,
    });

    await copyHtmlToClipboard('<table><tr><td>A</td></tr></table>');

    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();

    const [[items]] = write.mock.calls;
    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(ClipboardItemMock);
    expect(Object.keys(items[0].items)).toEqual(['text/html', 'text/plain']);
  });

  it('falls back to writeText when ClipboardItem is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('ClipboardItem', undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const html = '<table><tr><td>B</td></tr></table>';
    await copyHtmlToClipboard(html);

    expect(writeText).toHaveBeenCalledWith(html);
  });
});
