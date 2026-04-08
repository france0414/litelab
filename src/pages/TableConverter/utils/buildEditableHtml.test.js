import { describe, expect, it } from 'vitest';
import { buildEditableHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('wraps preview html with required container class', () => {
    const previewHtml = '<table><tr><td>A</td></tr></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('class="s_table_of_feature table-responsive"');
    expect(result).toContain(previewHtml);
  });
});
