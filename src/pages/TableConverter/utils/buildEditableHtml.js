export const buildEditableHtml = (previewHtml) => {
  const tableMatch = previewHtml.match(/<table[\s\S]*?<\/table>/i);
  const tableOnlyHtml = tableMatch ? tableMatch[0] : previewHtml;
  const normalizedTableHtml = tableOnlyHtml.replace(
    /<table[^>]*>/i,
    '<table class="table table-rwd-content mb-3 o_colored_level" name="Table">',
  );
  return `<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature">${normalizedTableHtml}</div>`;
};
