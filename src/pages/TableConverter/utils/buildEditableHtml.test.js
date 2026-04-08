import { describe, expect, it } from 'vitest';
import { buildEditableHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('wraps preview html with required container class', () => {
    const previewHtml = '<table><tr><td>A</td></tr></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('class="s_table_of_feature table-responsive"');
    expect(result).toContain(previewHtml);
  });

  it('keeps only the table when preview html already has wrapper', () => {
    const previewHtml = '<div class="s_table_of_feature table-responsive" data-vcss="001"><table><tbody><tr><td>A</td></tr></tbody></table></div>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toBe('<div class="s_table_of_feature table-responsive"><table><tbody><tr><td>A</td></tr></tbody></table></div>');
  });
});
