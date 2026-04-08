export const copyHtmlToClipboard = async (html) => {
  if (navigator?.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(html);
    return;
  }

  throw new Error('Clipboard API is not available in this browser.');
};
