import { describe, expect, it } from 'vitest';
import { buildEditableHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('wraps preview html with required class and snippet attributes', () => {
    const previewHtml = '<table><tr><td>A</td></tr></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('class="s_table_of_feature table-responsive"');
    expect(result).toContain('data-vcss="001"');
    expect(result).toContain('data-snippet="s_table_of_feature"');
    expect(result).toContain('data-name="Table of Feature"');
    expect(result).toContain('data-tablefeature-template="flexible_content"');
    expect(result).toContain(previewHtml);
  });
});
