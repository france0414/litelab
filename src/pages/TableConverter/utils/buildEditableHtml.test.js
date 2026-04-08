import { describe, expect, it } from 'vitest';
import { buildEditableHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('wraps preview html with required container attributes', () => {
    const previewHtml = '<table><tr><td>A</td></tr></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('class="s_table_of_feature table-responsive"');
    expect(result).toContain('data-vcss="001"');
    expect(result).toContain('data-snippet="s_table_of_feature"');
    expect(result).toContain('data-name="Table of Feature"');
    expect(result).toContain('<table class="table table-rwd-content mb-3 o_colored_level" name="Table">');
    expect(result).toContain('<tr><td>A</td></tr>');
  });

  it('keeps only the table when preview html already has wrapper', () => {
    const previewHtml = '<div class="s_table_of_feature table-responsive" data-vcss="001"><table><tbody><tr><td>A</td></tr></tbody></table></div>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toBe('<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature"><table class="table table-rwd-content mb-3 o_colored_level" name="Table"><tbody><tr><td>A</td></tr></tbody></table></div>');
  });

  it('replaces existing table attributes with snippet table attributes', () => {
    const previewHtml = '<table class="table my-table" data-test="x"><tbody><tr><td>A</td></tr></tbody></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toContain('<table class="table table-rwd-content mb-3 o_colored_level" name="Table">');
    expect(result).not.toContain('data-test="x"');
    expect(result).not.toContain('my-table');
  });
});
