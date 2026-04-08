const extractTableHtml = (previewHtml) => {
  const tableMatch = previewHtml.match(/<table[\s\S]*?<\/table>/i);
  return tableMatch ? tableMatch[0] : previewHtml;
};

export const buildEditableHtml = (previewHtml) => {
  if (previewHtml.includes('s_table_of_feature table-responsive')) {
    return previewHtml;
  }

  const tableOnlyHtml = extractTableHtml(previewHtml);
  return `<div class="s_table_of_feature table-responsive" data-vcss="001" data-snippet="s_table_of_feature" data-name="Table of Feature">${tableOnlyHtml}</div>`;
};

export const buildOdooCompatibleHtml = (previewHtml) => {
  return extractTableHtml(previewHtml).replace(
    /<table[^>]*>/i,
    '<table class="table table-bordered">',
  );
};
