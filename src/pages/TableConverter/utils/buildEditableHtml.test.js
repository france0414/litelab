import { describe, expect, it } from 'vitest';
import { buildEditableHtml, buildOdooCompatibleHtml } from './buildEditableHtml.js';

describe('buildEditableHtml', () => {
  it('returns original preview html when wrapper already exists', () => {
    const previewHtml = '<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature"><table class="table table-rwd-content mb-3 o_colored_level" name="Table"><thead><tr><th rowspan="1" colspan="2">H1</th><th>H2</th></tr></thead><tbody><tr><td>A</td><td>B</td><td>C</td></tr></tbody></table></div>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toBe(previewHtml);
  });

  it('wraps raw table html with snippet container attributes', () => {
    const previewHtml = '<table><tbody><tr><td>A</td></tr></tbody></table>';

    const result = buildEditableHtml(previewHtml);

    expect(result).toBe('<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature"><table><tbody><tr><td>A</td></tr></tbody></table></div>');
  });
});

describe('buildOdooCompatibleHtml', () => {
  it('returns table-only output with odoo compatible class', () => {
    const previewHtml = '<div class="s_table_of_feature table-responsive"><table class="table x" name="Table"><tbody><tr><td>A</td></tr></tbody></table></div>';

    const result = buildOdooCompatibleHtml(previewHtml);

    expect(result).toBe('<table class="table table-bordered"><tbody><tr><td>A</td></tr></tbody></table>');
    expect(result).not.toContain('s_table_of_feature');
  });

  it('keeps merged cell attributes like rowspan and colspan', () => {
    const previewHtml = '<table><tbody><tr><td>A</td><td rowspan="2" colspan="1">M</td></tr><tr><td>B</td></tr></tbody></table>';

    const result = buildOdooCompatibleHtml(previewHtml);

    expect(result).toContain('rowspan="2"');
    expect(result).toContain('colspan="1"');
  });
});
