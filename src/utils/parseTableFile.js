import { parseDocxArrayBuffer, parseXlsxArrayBuffer } from './tableParser.js';

const getExtension = (name) => {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const hasContent = (table) => (table.cells?.length || 0) > 0 || (table.merges?.length || 0) > 0;

export const parseTableFile = async (file) => {
  const extension = getExtension(file.name);

  if (file.size && file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
  const arrayBuffer = file.arrayBuffer
    ? await file.arrayBuffer()
    : await new Response(file).arrayBuffer();

  if (extension === 'xlsx') {
    const parsed = await parseXlsxArrayBuffer(arrayBuffer);
    const tables = parsed.tables.filter(hasContent);

    if (!tables.length) {
      throw new Error('No tables found');
    }

    return { ...parsed, tables, activeIndex: 0 };
  }

  if (extension === 'docx') {
    const parsed = await parseDocxArrayBuffer(arrayBuffer);
    const tables = parsed.tables.filter(hasContent);

    if (!tables.length) {
      throw new Error('No tables found');
    }

    return { ...parsed, tables, activeIndex: 0 };
  }

  throw new Error('Unsupported file type');
};
