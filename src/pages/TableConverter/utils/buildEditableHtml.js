export const buildEditableHtml = (previewHtml) => {
  const tableMatch = previewHtml.match(/<table[\s\S]*?<\/table>/i);
  const tableOnlyHtml = tableMatch ? tableMatch[0] : previewHtml;
  return `<div class="s_table_of_feature table-responsive">${tableOnlyHtml}</div>`;
};
