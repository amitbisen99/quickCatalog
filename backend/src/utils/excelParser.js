const XLSX = require('xlsx');

/**
 * Reads the first sheet of an Excel buffer into headers + row objects.
 * Row 1 is always treated as the header row (matches the templates we
 * point vendors to) — no attempt to guess a different header position.
 */
function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  const headers = (rows[0] || []).map((h) => String(h).trim()).filter(Boolean);
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== ''));

  const records = dataRows.map((row) => {
    const record = {};
    headers.forEach((header, i) => {
      record[header] = row[i] !== undefined ? row[i] : '';
    });
    return record;
  });

  return { headers, records, sheetNames };
}

module.exports = { parseWorkbook };
